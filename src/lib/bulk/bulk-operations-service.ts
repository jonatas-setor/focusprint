import {
  BulkOperation,
  BulkOperationInsert,
  BulkOperationType,
  BulkTargetType,
  BulkOperationStatus,
  BulkOperationStage,
  BulkOperationProgress,
  BulkOperationResult,
  BulkOperationRequest,
  BulkOperationResponse,
  BulkValidationResult,
  BulkOperationHistory,
  BulkOperationFilters,
  BulkOperationSummary,
  UserBulkParameters,
  LicenseBulkParameters,
  ClientBulkParameters,
  CrossSystemBulkParameters
} from '@/types/bulk-operations';

// In-memory storage for bulk operations (in production, this would be a database)
class BulkOperationStorage {
  private static operations: BulkOperation[] = [];
  private static maxOperations = 1000; // Keep last 1000 operations

  static add(operation: BulkOperation): void {
    this.operations.unshift(operation); // Add to beginning for chronological order
    
    // Keep only the most recent operations
    if (this.operations.length > this.maxOperations) {
      this.operations = this.operations.slice(0, this.maxOperations);
    }
  }

  static getAll(): BulkOperation[] {
    return [...this.operations];
  }

  static getById(operationId: string): BulkOperation | null {
    return this.operations.find(op => op.id === operationId) || null;
  }

  static update(operationId: string, updates: Partial<BulkOperation>): boolean {
    const index = this.operations.findIndex(op => op.id === operationId);
    if (index === -1) return false;

    this.operations[index] = {
      ...this.operations[index],
      ...updates
    };
    return true;
  }

  static filter(filters: BulkOperationFilters): BulkOperation[] {
    let filteredOps = [...this.operations];

    if (filters.operation_type && filters.operation_type.length > 0) {
      filteredOps = filteredOps.filter(op => filters.operation_type!.includes(op.operation_type));
    }

    if (filters.target_type && filters.target_type.length > 0) {
      filteredOps = filteredOps.filter(op => filters.target_type!.includes(op.target_type));
    }

    if (filters.status && filters.status.length > 0) {
      filteredOps = filteredOps.filter(op => filters.status!.includes(op.status));
    }

    if (filters.created_by) {
      filteredOps = filteredOps.filter(op => op.created_by === filters.created_by);
    }

    if (filters.date_from) {
      filteredOps = filteredOps.filter(op => op.created_at >= filters.date_from!);
    }

    if (filters.date_to) {
      filteredOps = filteredOps.filter(op => op.created_at <= filters.date_to!);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredOps = filteredOps.filter(op => 
        op.operation_type.toLowerCase().includes(searchLower) ||
        op.target_type.toLowerCase().includes(searchLower) ||
        op.created_by_name.toLowerCase().includes(searchLower) ||
        (op.reason && op.reason.toLowerCase().includes(searchLower))
      );
    }

    return filteredOps;
  }

  static clear(): void {
    this.operations = [];
  }
}

// Main Bulk Operations Service
export class BulkOperationsService {
  private static readonly MAX_CONCURRENT_OPERATIONS = 3;
  private static readonly DEFAULT_BATCH_SIZE = 50;
  private static readonly MAX_TARGETS_PER_OPERATION = 1000;

  /**
   * Create and start a bulk operation
   */
  static async createBulkOperation(
    request: BulkOperationRequest,
    createdBy: string,
    createdByName: string,
    requestInfo?: { ip_address?: string; user_agent?: string }
  ): Promise<BulkOperationResponse> {
    try {
      // Validate the request
      const validation = await this.validateBulkOperation(request);
      if (validation.some(v => !v.can_proceed)) {
        throw new Error('Bulk operation validation failed');
      }

      // Check concurrent operation limits
      const runningOps = BulkOperationStorage.getAll().filter(op => 
        op.status === BulkOperationStatus.RUNNING
      );
      
      if (runningOps.length >= this.MAX_CONCURRENT_OPERATIONS) {
        throw new Error(`Maximum concurrent operations reached (${this.MAX_CONCURRENT_OPERATIONS})`);
      }

      // Generate operation ID
      const operationId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Create bulk operation
      const operation: BulkOperation = {
        id: operationId,
        operation_type: request.operation_type,
        target_type: request.target_type,
        target_ids: request.target_ids,
        parameters: request.parameters,
        reason: request.reason,
        status: BulkOperationStatus.PENDING,
        progress: {
          total_items: request.target_ids.length,
          processed_items: 0,
          successful_items: 0,
          failed_items: 0,
          percentage_complete: 0,
          stage: BulkOperationStage.INITIALIZING
        },
        results: [],
        created_by: createdBy,
        created_by_name: createdByName,
        created_at: now,
        metadata: request.metadata
      };

      // Store the operation
      BulkOperationStorage.add(operation);

      // Log the operation creation
      await this.logBulkOperationEvent(
        operation,
        'created',
        createdBy,
        createdByName,
        'Bulk operation created',
        requestInfo
      );

      // Start processing if not a dry run
      if (!request.dry_run) {
        // Start processing asynchronously
        this.processBulkOperation(operationId, request.batch_size || this.DEFAULT_BATCH_SIZE);
      }

      return {
        operation,
        validation_results: validation,
        estimated_duration_seconds: this.estimateOperationDuration(request),
        warnings: validation.filter(v => v.warnings.length > 0).flatMap(v => v.warnings)
      };

    } catch (error) {
      console.error('Error creating bulk operation:', error);
      throw new Error(`Failed to create bulk operation: ${error.message}`);
    }
  }

  /**
   * Get bulk operation by ID
   */
  static async getBulkOperation(operationId: string): Promise<BulkOperation | null> {
    return BulkOperationStorage.getById(operationId);
  }

  /**
   * Get bulk operations with filtering
   */
  static async getBulkOperations(
    filters: BulkOperationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<BulkOperationHistory> {
    const filteredOps = BulkOperationStorage.filter(filters);
    const total = filteredOps.length;
    const pages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const operations = filteredOps.slice(offset, offset + limit);

    // Calculate summary
    const allOps = BulkOperationStorage.getAll();
    const summary = this.calculateBulkOperationSummary(allOps);

    return {
      operations,
      pagination: { page, limit, total, pages },
      filters,
      summary
    };
  }

  /**
   * Cancel a bulk operation
   */
  static async cancelBulkOperation(
    operationId: string,
    cancelledBy: string,
    cancelledByName: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const operation = BulkOperationStorage.getById(operationId);
      if (!operation) {
        return { success: false, message: 'Bulk operation not found' };
      }

      if (![BulkOperationStatus.PENDING, BulkOperationStatus.RUNNING].includes(operation.status)) {
        return { success: false, message: 'Operation cannot be cancelled in current status' };
      }

      // Update operation status
      const updated = BulkOperationStorage.update(operationId, {
        status: BulkOperationStatus.CANCELLED,
        completed_at: new Date().toISOString(),
        error_message: reason || 'Operation cancelled by admin'
      });

      if (!updated) {
        return { success: false, message: 'Failed to cancel operation' };
      }

      // Log the cancellation
      const updatedOperation = BulkOperationStorage.getById(operationId)!;
      await this.logBulkOperationEvent(
        updatedOperation,
        'cancelled',
        cancelledBy,
        cancelledByName,
        reason || 'Bulk operation cancelled'
      );

      return { success: true, message: 'Bulk operation cancelled successfully' };

    } catch (error) {
      console.error('Error cancelling bulk operation:', error);
      return { success: false, message: `Failed to cancel operation: ${error.message}` };
    }
  }

  /**
   * Process bulk operation (async)
   */
  private static async processBulkOperation(operationId: string, batchSize: number): Promise<void> {
    try {
      const operation = BulkOperationStorage.getById(operationId);
      if (!operation) return;

      // Update status to running
      BulkOperationStorage.update(operationId, {
        status: BulkOperationStatus.RUNNING,
        started_at: new Date().toISOString(),
        progress: {
          ...operation.progress,
          stage: BulkOperationStage.VALIDATING
        }
      });

      // Process in batches
      const targetIds = operation.target_ids;
      const results: BulkOperationResult[] = [];
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < targetIds.length; i += batchSize) {
        const batch = targetIds.slice(i, i + batchSize);
        
        // Update progress
        BulkOperationStorage.update(operationId, {
          progress: {
            ...operation.progress,
            processed_items: i,
            percentage_complete: Math.round((i / targetIds.length) * 100),
            stage: BulkOperationStage.PROCESSING,
            current_item: batch[0]
          }
        });

        // Process batch
        for (const targetId of batch) {
          try {
            const result = await this.processIndividualTarget(
              operation.operation_type,
              operation.target_type,
              targetId,
              operation.parameters
            );
            
            results.push(result);
            if (result.success) {
              successCount++;
            } else {
              failureCount++;
            }

          } catch (error) {
            const errorResult: BulkOperationResult = {
              target_id: targetId,
              success: false,
              error_message: error instanceof Error ? error.message : 'Unknown error',
              processed_at: new Date().toISOString()
            };
            results.push(errorResult);
            failureCount++;
          }
        }

        // Small delay between batches to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Determine final status
      let finalStatus: BulkOperationStatus;
      if (failureCount === 0) {
        finalStatus = BulkOperationStatus.COMPLETED;
      } else if (successCount === 0) {
        finalStatus = BulkOperationStatus.FAILED;
      } else {
        finalStatus = BulkOperationStatus.PARTIAL_SUCCESS;
      }

      // Update final operation status
      BulkOperationStorage.update(operationId, {
        status: finalStatus,
        completed_at: new Date().toISOString(),
        results,
        progress: {
          total_items: targetIds.length,
          processed_items: targetIds.length,
          successful_items: successCount,
          failed_items: failureCount,
          percentage_complete: 100,
          stage: BulkOperationStage.COMPLETED
        }
      });

      // Log completion
      const finalOperation = BulkOperationStorage.getById(operationId)!;
      await this.logBulkOperationEvent(
        finalOperation,
        'completed',
        'system',
        'System',
        `Bulk operation completed: ${successCount} successful, ${failureCount} failed`
      );

    } catch (error) {
      console.error('Error processing bulk operation:', error);

      // Update operation with error status
      BulkOperationStorage.update(operationId, {
        status: BulkOperationStatus.FAILED,
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process individual target based on operation type
   */
  private static async processIndividualTarget(
    operationType: BulkOperationType,
    targetType: BulkTargetType,
    targetId: string,
    parameters: Record<string, any>
  ): Promise<BulkOperationResult> {
    try {
      let result: any;
      let targetName = targetId;

      switch (operationType) {
        // User Operations
        case BulkOperationType.ENABLE_USERS:
        case BulkOperationType.DISABLE_USERS:
          result = await this.processUserEnableDisable(targetId, parameters as UserBulkParameters);
          targetName = `User ${targetId}`;
          break;

        case BulkOperationType.UPDATE_USER_ROLES:
          result = await this.processUserRoleUpdate(targetId, parameters as UserBulkParameters);
          targetName = `User ${targetId}`;
          break;

        case BulkOperationType.RESET_PASSWORDS:
          result = await this.processPasswordReset(targetId, parameters as UserBulkParameters);
          targetName = `User ${targetId}`;
          break;

        // License Operations
        case BulkOperationType.ACTIVATE_LICENSES:
        case BulkOperationType.DEACTIVATE_LICENSES:
          result = await this.processLicenseActivation(targetId, parameters as LicenseBulkParameters);
          targetName = `License ${targetId}`;
          break;

        case BulkOperationType.UPDATE_LICENSE_PLANS:
          result = await this.processLicensePlanUpdate(targetId, parameters as LicenseBulkParameters);
          targetName = `License ${targetId}`;
          break;

        case BulkOperationType.EXTEND_LICENSE_EXPIRATION:
          result = await this.processLicenseExtension(targetId, parameters as LicenseBulkParameters);
          targetName = `License ${targetId}`;
          break;

        // Client Operations
        case BulkOperationType.UPDATE_CLIENT_PLANS:
          result = await this.processClientPlanUpdate(targetId, parameters as ClientBulkParameters);
          targetName = `Client ${targetId}`;
          break;

        case BulkOperationType.SUSPEND_CLIENTS:
        case BulkOperationType.REACTIVATE_CLIENTS:
          result = await this.processClientSuspension(targetId, parameters as ClientBulkParameters);
          targetName = `Client ${targetId}`;
          break;

        case BulkOperationType.BILLING_ADJUSTMENTS:
          result = await this.processBillingAdjustment(targetId, parameters as ClientBulkParameters);
          targetName = `Client ${targetId}`;
          break;

        // Cross-System Operations
        case BulkOperationType.CLIENT_MIGRATION:
          result = await this.processClientMigration(targetId, parameters as CrossSystemBulkParameters);
          targetName = `Client ${targetId}`;
          break;

        case BulkOperationType.AUDIT_EXPORT:
          result = await this.processAuditExport(targetId, parameters as CrossSystemBulkParameters);
          targetName = `Audit Export ${targetId}`;
          break;

        case BulkOperationType.FEATURE_FLAG_SYNC:
          result = await this.processFeatureFlagSync(targetId, parameters as CrossSystemBulkParameters);
          targetName = `Feature Flag ${targetId}`;
          break;

        default:
          throw new Error(`Unsupported operation type: ${operationType}`);
      }

      return {
        target_id: targetId,
        target_name: targetName,
        success: true,
        processed_at: new Date().toISOString(),
        result_data: result
      };

    } catch (error) {
      return {
        target_id: targetId,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        processed_at: new Date().toISOString()
      };
    }
  }

  /**
   * Validate bulk operation request
   */
  private static async validateBulkOperation(request: BulkOperationRequest): Promise<BulkValidationResult[]> {
    const results: BulkValidationResult[] = [];

    // Validate operation limits
    if (request.target_ids.length > this.MAX_TARGETS_PER_OPERATION) {
      throw new Error(`Cannot process more than ${this.MAX_TARGETS_PER_OPERATION} targets in a single operation`);
    }

    if (request.target_ids.length === 0) {
      throw new Error('At least one target ID is required');
    }

    // Validate each target
    for (const targetId of request.target_ids) {
      const validation = await this.validateIndividualTarget(
        request.operation_type,
        request.target_type,
        targetId,
        request.parameters
      );
      results.push(validation);
    }

    return results;
  }

  /**
   * Validate individual target
   */
  private static async validateIndividualTarget(
    operationType: BulkOperationType,
    targetType: BulkTargetType,
    targetId: string,
    parameters: Record<string, any>
  ): Promise<BulkValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!targetId || targetId.trim() === '') {
      errors.push('Target ID cannot be empty');
    }

    // Operation-specific validation
    switch (operationType) {
      case BulkOperationType.UPDATE_USER_ROLES:
        if (!parameters.new_role) {
          errors.push('new_role parameter is required');
        }
        break;

      case BulkOperationType.UPDATE_LICENSE_PLANS:
        if (!parameters.new_plan) {
          errors.push('new_plan parameter is required');
        }
        break;

      case BulkOperationType.EXTEND_LICENSE_EXPIRATION:
        if (!parameters.extension_days && !parameters.new_expiration_date) {
          errors.push('Either extension_days or new_expiration_date is required');
        }
        break;

      case BulkOperationType.UPDATE_CLIENT_PLANS:
        if (!parameters.new_plan) {
          errors.push('new_plan parameter is required');
        }
        break;

      case BulkOperationType.BILLING_ADJUSTMENTS:
        if (!parameters.adjustment_type || !parameters.adjustment_amount) {
          errors.push('adjustment_type and adjustment_amount are required');
        }
        break;
    }

    // Mock existence check (in real implementation, would check actual data)
    const exists = true; // Would check if target exists
    if (!exists) {
      errors.push(`${targetType} with ID ${targetId} not found`);
    }

    return {
      target_id: targetId,
      target_name: `${targetType} ${targetId}`,
      is_valid: errors.length === 0,
      errors,
      warnings,
      can_proceed: errors.length === 0
    };
  }

  /**
   * Individual operation processors (mock implementations)
   */
  private static async processUserEnableDisable(userId: string, params: UserBulkParameters): Promise<any> {
    // Mock user enable/disable operation
    return {
      user_id: userId,
      enabled: params.enabled,
      updated_at: new Date().toISOString()
    };
  }

  private static async processUserRoleUpdate(userId: string, params: UserBulkParameters): Promise<any> {
    // Mock user role update operation
    return {
      user_id: userId,
      old_role: 'member',
      new_role: params.new_role,
      updated_at: new Date().toISOString()
    };
  }

  private static async processPasswordReset(userId: string, params: UserBulkParameters): Promise<any> {
    // Mock password reset operation
    return {
      user_id: userId,
      password_reset: true,
      email_sent: params.send_email || false,
      temporary_password: params.temporary_password || false,
      reset_at: new Date().toISOString()
    };
  }

  private static async processLicenseActivation(licenseId: string, params: LicenseBulkParameters): Promise<any> {
    // Mock license activation/deactivation operation
    return {
      license_id: licenseId,
      active: params.active,
      updated_at: new Date().toISOString()
    };
  }

  private static async processLicensePlanUpdate(licenseId: string, params: LicenseBulkParameters): Promise<any> {
    // Mock license plan update operation
    return {
      license_id: licenseId,
      old_plan: 'PRO',
      new_plan: params.new_plan,
      effective_date: params.effective_date || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private static async processLicenseExtension(licenseId: string, params: LicenseBulkParameters): Promise<any> {
    // Mock license extension operation
    const currentExpiration = new Date();
    const newExpiration = params.new_expiration_date ?
      new Date(params.new_expiration_date) :
      new Date(currentExpiration.getTime() + (params.extension_days || 30) * 24 * 60 * 60 * 1000);

    return {
      license_id: licenseId,
      old_expiration: currentExpiration.toISOString(),
      new_expiration: newExpiration.toISOString(),
      extension_days: params.extension_days,
      updated_at: new Date().toISOString()
    };
  }

  private static async processClientPlanUpdate(clientId: string, params: ClientBulkParameters): Promise<any> {
    // Mock client plan update operation
    return {
      client_id: clientId,
      old_plan: 'PRO',
      new_plan: params.new_plan,
      effective_date: params.effective_date || new Date().toISOString(),
      prorate_billing: params.prorate_billing || false,
      updated_at: new Date().toISOString()
    };
  }

  private static async processClientSuspension(clientId: string, params: ClientBulkParameters): Promise<any> {
    // Mock client suspension/reactivation operation
    return {
      client_id: clientId,
      suspended: params.suspended,
      suspension_reason: params.suspension_reason,
      updated_at: new Date().toISOString()
    };
  }

  private static async processBillingAdjustment(clientId: string, params: ClientBulkParameters): Promise<any> {
    // Mock billing adjustment operation
    return {
      client_id: clientId,
      adjustment_type: params.adjustment_type,
      adjustment_amount: params.adjustment_amount,
      adjustment_reason: params.adjustment_reason,
      processed_at: new Date().toISOString()
    };
  }

  private static async processClientMigration(clientId: string, params: CrossSystemBulkParameters): Promise<any> {
    // Mock client migration operation
    return {
      client_id: clientId,
      source_plan: params.source_plan,
      target_plan: params.target_plan,
      migration_date: params.migration_date || new Date().toISOString(),
      data_migrated: params.migrate_data || false,
      migration_id: `migration_${Date.now()}`,
      completed_at: new Date().toISOString()
    };
  }

  private static async processAuditExport(exportId: string, params: CrossSystemBulkParameters): Promise<any> {
    // Mock audit export operation
    return {
      export_id: exportId,
      date_from: params.date_from,
      date_to: params.date_to,
      format: params.export_format || 'csv',
      include_sensitive_data: params.include_sensitive_data || false,
      file_url: `/exports/audit_${exportId}.${params.export_format || 'csv'}`,
      exported_at: new Date().toISOString()
    };
  }

  private static async processFeatureFlagSync(flagId: string, params: CrossSystemBulkParameters): Promise<any> {
    // Mock feature flag sync operation
    return {
      flag_id: flagId,
      source_environment: params.source_environment,
      target_environment: params.target_environment,
      synced_at: new Date().toISOString()
    };
  }

  /**
   * Calculate bulk operation summary
   */
  private static calculateBulkOperationSummary(operations: BulkOperation[]): BulkOperationSummary {
    const summary: BulkOperationSummary = {
      total_operations: operations.length,
      pending_operations: operations.filter(op => op.status === BulkOperationStatus.PENDING).length,
      running_operations: operations.filter(op => op.status === BulkOperationStatus.RUNNING).length,
      completed_operations: operations.filter(op => op.status === BulkOperationStatus.COMPLETED).length,
      failed_operations: operations.filter(op => op.status === BulkOperationStatus.FAILED).length,
      operations_by_type: {} as Record<BulkOperationType, number>,
      operations_by_target: {} as Record<BulkTargetType, number>,
      avg_completion_time_minutes: 0,
      success_rate_percentage: 0
    };

    // Count by operation type
    Object.values(BulkOperationType).forEach(type => {
      summary.operations_by_type[type] = operations.filter(op => op.operation_type === type).length;
    });

    // Count by target type
    Object.values(BulkTargetType).forEach(type => {
      summary.operations_by_target[type] = operations.filter(op => op.target_type === type).length;
    });

    // Calculate averages
    const completedOps = operations.filter(op => op.completed_at && op.started_at);
    if (completedOps.length > 0) {
      const totalTime = completedOps.reduce((sum, op) => {
        const start = new Date(op.started_at!).getTime();
        const end = new Date(op.completed_at!).getTime();
        return sum + (end - start);
      }, 0);
      summary.avg_completion_time_minutes = Math.round(totalTime / completedOps.length / 1000 / 60 * 100) / 100;

      const successfulOps = completedOps.filter(op => op.status === BulkOperationStatus.COMPLETED);
      summary.success_rate_percentage = Math.round((successfulOps.length / completedOps.length) * 100);
    }

    return summary;
  }

  /**
   * Estimate operation duration
   */
  private static estimateOperationDuration(request: BulkOperationRequest): number {
    // Base time per item in seconds
    const baseTimePerItem = 0.5;

    // Operation complexity multipliers
    const complexityMultipliers = {
      [BulkOperationType.ENABLE_USERS]: 1,
      [BulkOperationType.DISABLE_USERS]: 1,
      [BulkOperationType.UPDATE_USER_ROLES]: 1.5,
      [BulkOperationType.RESET_PASSWORDS]: 2,
      [BulkOperationType.DELETE_USERS]: 3,
      [BulkOperationType.ACTIVATE_LICENSES]: 1,
      [BulkOperationType.DEACTIVATE_LICENSES]: 1,
      [BulkOperationType.UPDATE_LICENSE_PLANS]: 2,
      [BulkOperationType.EXTEND_LICENSE_EXPIRATION]: 1.5,
      [BulkOperationType.TRANSFER_LICENSES]: 3,
      [BulkOperationType.UPDATE_CLIENT_PLANS]: 2.5,
      [BulkOperationType.SUSPEND_CLIENTS]: 2,
      [BulkOperationType.REACTIVATE_CLIENTS]: 2,
      [BulkOperationType.BILLING_ADJUSTMENTS]: 3,
      [BulkOperationType.DELETE_CLIENTS]: 5,
      [BulkOperationType.CLIENT_MIGRATION]: 10,
      [BulkOperationType.AUDIT_EXPORT]: 5,
      [BulkOperationType.COMPLIANCE_REPORT]: 8,
      [BulkOperationType.FEATURE_FLAG_SYNC]: 2,
      [BulkOperationType.BULK_NOTIFICATIONS]: 1.5,
      [BulkOperationType.SYSTEM_MAINTENANCE]: 15
    };

    const multiplier = complexityMultipliers[request.operation_type] || 1;
    return Math.round(request.target_ids.length * baseTimePerItem * multiplier);
  }

  /**
   * Log bulk operation event for audit
   */
  private static async logBulkOperationEvent(
    operation: BulkOperation,
    action: string,
    performedBy: string,
    performedByName: string,
    description: string,
    requestInfo?: { ip_address?: string; user_agent?: string },
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { AuditService } = await import('../audit/audit-service');
      const { AuditAction, ResourceType, AuditSeverity } = await import('../../types/audit-log');

      const auditActionMap: Record<string, any> = {
        'created': AuditAction.BULK_OPERATION,
        'started': AuditAction.BULK_OPERATION,
        'completed': AuditAction.BULK_OPERATION,
        'cancelled': AuditAction.BULK_OPERATION,
        'failed': AuditAction.BULK_OPERATION
      };

      const auditAction = auditActionMap[action] || AuditAction.BULK_OPERATION;

      // Determine severity based on operation type and action
      let severity = AuditSeverity.MEDIUM;
      if (action === 'failed' || operation.operation_type.includes('DELETE')) {
        severity = AuditSeverity.HIGH;
      } else if (action === 'completed' && operation.progress.failed_items > 0) {
        severity = AuditSeverity.MEDIUM;
      }

      await AuditService.log({
        admin_id: performedBy,
        admin_email: performedBy, // Would get actual email in real implementation
        admin_name: performedByName,
        action: auditAction,
        resource_type: ResourceType.SYSTEM,
        resource_id: operation.id,
        resource_name: `Bulk ${operation.operation_type}`,
        details: {
          description,
          context: {
            operation_type: operation.operation_type,
            target_type: operation.target_type,
            target_count: operation.target_ids.length,
            status: operation.status,
            progress: operation.progress,
            reason: operation.reason,
            ...metadata
          }
        },
        severity,
        status: action === 'failed' ? 'error' : 'success',
        ip_address: requestInfo?.ip_address,
        user_agent: requestInfo?.user_agent
      });

    } catch (error) {
      console.error('Failed to log bulk operation event:', error);
    }
  }

  /**
   * Get operation statistics
   */
  static getStatistics(): {
    total_operations: number;
    running_operations: number;
    completed_operations: number;
    failed_operations: number;
    avg_completion_time_minutes: number;
    operations_by_type: Record<BulkOperationType, number>;
    operations_by_target: Record<BulkTargetType, number>;
  } {
    const operations = BulkOperationStorage.getAll();
    const summary = this.calculateBulkOperationSummary(operations);

    return {
      total_operations: summary.total_operations,
      running_operations: summary.running_operations,
      completed_operations: summary.completed_operations,
      failed_operations: summary.failed_operations,
      avg_completion_time_minutes: summary.avg_completion_time_minutes,
      operations_by_type: summary.operations_by_type,
      operations_by_target: summary.operations_by_target
    };
  }

  /**
   * Get supported operations
   */
  static getSupportedOperations(): Array<{
    operation_type: BulkOperationType;
    target_type: BulkTargetType;
    description: string;
    required_parameters: string[];
    max_targets: number;
    estimated_time_per_item_seconds: number;
  }> {
    return [
      // User Operations
      {
        operation_type: BulkOperationType.ENABLE_USERS,
        target_type: BulkTargetType.USERS,
        description: 'Enable multiple user accounts',
        required_parameters: ['enabled'],
        max_targets: 1000,
        estimated_time_per_item_seconds: 0.5
      },
      {
        operation_type: BulkOperationType.DISABLE_USERS,
        target_type: BulkTargetType.USERS,
        description: 'Disable multiple user accounts',
        required_parameters: ['enabled'],
        max_targets: 1000,
        estimated_time_per_item_seconds: 0.5
      },
      {
        operation_type: BulkOperationType.UPDATE_USER_ROLES,
        target_type: BulkTargetType.USERS,
        description: 'Update roles for multiple users',
        required_parameters: ['new_role'],
        max_targets: 500,
        estimated_time_per_item_seconds: 0.75
      },
      {
        operation_type: BulkOperationType.RESET_PASSWORDS,
        target_type: BulkTargetType.USERS,
        description: 'Reset passwords for multiple users',
        required_parameters: [],
        max_targets: 200,
        estimated_time_per_item_seconds: 1.0
      },
      // License Operations
      {
        operation_type: BulkOperationType.ACTIVATE_LICENSES,
        target_type: BulkTargetType.LICENSES,
        description: 'Activate multiple licenses',
        required_parameters: ['active'],
        max_targets: 1000,
        estimated_time_per_item_seconds: 0.5
      },
      {
        operation_type: BulkOperationType.UPDATE_LICENSE_PLANS,
        target_type: BulkTargetType.LICENSES,
        description: 'Update plans for multiple licenses',
        required_parameters: ['new_plan'],
        max_targets: 500,
        estimated_time_per_item_seconds: 1.0
      },
      // Client Operations
      {
        operation_type: BulkOperationType.UPDATE_CLIENT_PLANS,
        target_type: BulkTargetType.CLIENTS,
        description: 'Update plans for multiple clients',
        required_parameters: ['new_plan'],
        max_targets: 200,
        estimated_time_per_item_seconds: 1.25
      },
      {
        operation_type: BulkOperationType.BILLING_ADJUSTMENTS,
        target_type: BulkTargetType.CLIENTS,
        description: 'Apply billing adjustments to multiple clients',
        required_parameters: ['adjustment_type', 'adjustment_amount'],
        max_targets: 100,
        estimated_time_per_item_seconds: 1.5
      },
      // Cross-System Operations
      {
        operation_type: BulkOperationType.CLIENT_MIGRATION,
        target_type: BulkTargetType.CLIENTS,
        description: 'Migrate multiple clients between plans',
        required_parameters: ['target_plan'],
        max_targets: 50,
        estimated_time_per_item_seconds: 5.0
      },
      {
        operation_type: BulkOperationType.AUDIT_EXPORT,
        target_type: BulkTargetType.AUDIT_LOGS,
        description: 'Export audit logs for multiple entities',
        required_parameters: ['export_format'],
        max_targets: 100,
        estimated_time_per_item_seconds: 2.5
      }
    ];
  }

  /**
   * Initialize service
   */
  static initializeService(): void {
    // Initialize with empty storage
    BulkOperationStorage.clear();
  }
}
