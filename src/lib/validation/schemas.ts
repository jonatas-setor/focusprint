import { z } from 'zod';
import { validateCNPJ, validatePhone } from '@/lib/utils';

// Base validation schemas
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email must be less than 255 characters');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z0-9\s\-_.&]+$/, 'Name contains invalid characters');

export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

export const planTypeSchema = z
  .enum(['free', 'pro', 'business'], {
    errorMap: () => ({ message: 'Plan type must be free, pro, or business' })
  });

export const statusSchema = z
  .enum(['active', 'inactive', 'suspended'], {
    errorMap: () => ({ message: 'Status must be active, inactive, or suspended' })
  });

// Client validation schemas
export const createClientSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  plan_type: planTypeSchema.optional().default('free'),
  status: statusSchema.optional().default('active'),
  cnpj: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true; // Optional field
      return validateCNPJ(val);
    }, { message: 'CNPJ inválido. Use o formato: XX.XXX.XXX/XXXX-XX' }),
  phone: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true; // Optional field
      return validatePhone(val);
    }, { message: 'Telefone inválido. Use o formato: +55 (XX) XXXXX-XXXX' }),
  address: z
    .string()
    .max(500, 'Address must be less than 500 characters')
    .optional(),
});

export const updateClientSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  plan_type: planTypeSchema.optional(),
  status: statusSchema.optional(),
  cnpj: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true; // Optional field
      return validateCNPJ(val);
    }, { message: 'CNPJ inválido. Use o formato: XX.XXX.XXX/XXXX-XX' }),
  phone: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true; // Optional field
      return validatePhone(val);
    }, { message: 'Telefone inválido. Use o formato: +55 (XX) XXXXX-XXXX' }),
  address: z
    .string()
    .max(500, 'Address must be less than 500 characters')
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const clientIdSchema = z.object({
  id: uuidSchema,
});

// User validation schemas
export const createUserSchema = z.object({
  email: emailSchema,
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s\-']+$/, 'First name contains invalid characters'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s\-']+$/, 'Last name contains invalid characters'),
  role: z
    .enum(['owner', 'admin', 'member'], {
      errorMap: () => ({ message: 'Role must be owner, admin, or member' })
    })
    .optional()
    .default('member'),
});

// License validation schemas
export const createLicenseSchema = z.object({
  client_id: uuidSchema,
  plan_id: uuidSchema,
  status: z
    .enum(['active', 'inactive', 'suspended', 'expired'], {
      errorMap: () => ({ message: 'Status must be active, inactive, suspended, or expired' })
    })
    .optional()
    .default('active'),
  expires_at: z
    .string()
    .datetime('Invalid datetime format')
    .optional(),
});

export const updateLicenseSchema = z.object({
  status: z
    .enum(['active', 'inactive', 'suspended', 'expired'], {
      errorMap: () => ({ message: 'Status must be active, inactive, suspended, or expired' })
    })
    .optional(),
  expires_at: z
    .string()
    .datetime('Invalid datetime format')
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// Plan validation schemas
export const createPlanSchema = z.object({
  name: nameSchema,
  code: z
    .string()
    .min(1, 'Plan code is required')
    .max(20, 'Plan code must be less than 20 characters')
    .regex(/^[a-z_]+$/, 'Plan code must be lowercase letters and underscores only'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
  price: z
    .number()
    .min(0, 'Price must be non-negative')
    .max(999999.99, 'Price must be less than 1,000,000'),
  currency: z
    .string()
    .length(3, 'Currency must be 3 characters')
    .default('BRL'),
  interval: z
    .enum(['month', 'year'])
    .default('month'),
  annual_price_cents: z
    .number()
    .int('Annual price must be an integer')
    .min(0, 'Annual price must be non-negative')
    .optional(),
  annual_discount_percent: z
    .number()
    .min(0.01, 'Annual discount must be greater than 0%')
    .max(50, 'Annual discount cannot exceed 50%')
    .optional(),
  has_annual_discount: z
    .boolean()
    .default(false),
  setup_fee_cents: z
    .number()
    .int('Setup fee must be an integer')
    .min(0, 'Setup fee must be non-negative')
    .optional(),
  trial_days: z
    .number()
    .int('Trial days must be an integer')
    .min(0, 'Trial days must be non-negative')
    .max(365, 'Trial days cannot exceed 365')
    .default(0),
  features: z
    .record(z.boolean())
    .optional()
    .default({}),
  limits: z.object({
    max_users: z
      .number()
      .int('Max users must be an integer')
      .min(1, 'Max users must be at least 1')
      .max(1000, 'Max users must be less than 1000'),
    max_projects: z
      .number()
      .int('Max projects must be an integer')
      .min(-1, 'Max projects must be -1 (unlimited) or positive')
      .max(1000, 'Max projects must be less than 1000'),
    storage_gb: z
      .number()
      .min(0.1, 'Storage must be at least 0.1 GB')
      .max(1000, 'Storage must be less than 1000 GB')
  }).optional(),
  is_active: z
    .boolean()
    .default(true),
  version: z
    .number()
    .int()
    .min(1)
    .default(1),
  is_promotional: z
    .boolean()
    .default(false),
  promo_start_date: z
    .string()
    .datetime()
    .optional(),
  promo_end_date: z
    .string()
    .datetime()
    .optional(),
  promo_discount_percent: z
    .number()
    .min(0.01, 'Discount percent must be greater than 0')
    .max(100, 'Discount percent cannot exceed 100')
    .optional(),
  promo_discount_amount: z
    .number()
    .min(0.01, 'Discount amount must be greater than 0')
    .optional(),
  promo_code: z
    .string()
    .min(3, 'Promo code must be at least 3 characters')
    .max(50, 'Promo code must be less than 50 characters')
    .optional()
});

export const updatePlanSchema = z.object({
  name: nameSchema.optional(),
  description: z
    .string()
    .min(1, 'Description cannot be empty')
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  price: z
    .number()
    .min(0, 'Price must be non-negative')
    .max(999999.99, 'Price must be less than 1,000,000')
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency must be 3 characters')
    .optional(),
  interval: z
    .enum(['month', 'year'])
    .optional(),
  annual_price_cents: z
    .number()
    .int('Annual price must be an integer')
    .min(0, 'Annual price must be non-negative')
    .optional(),
  annual_discount_percent: z
    .number()
    .min(0.01, 'Annual discount must be greater than 0%')
    .max(50, 'Annual discount cannot exceed 50%')
    .optional(),
  has_annual_discount: z
    .boolean()
    .optional(),
  setup_fee_cents: z
    .number()
    .int('Setup fee must be an integer')
    .min(0, 'Setup fee must be non-negative')
    .optional(),
  trial_days: z
    .number()
    .int('Trial days must be an integer')
    .min(0, 'Trial days must be non-negative')
    .max(365, 'Trial days cannot exceed 365')
    .optional(),
  features: z
    .record(z.boolean())
    .optional(),
  limits: z.object({
    max_users: z
      .number()
      .int('Max users must be an integer')
      .min(1, 'Max users must be at least 1')
      .max(1000, 'Max users must be less than 1000')
      .optional(),
    max_projects: z
      .number()
      .int('Max projects must be an integer')
      .min(-1, 'Max projects must be -1 (unlimited) or positive')
      .max(1000, 'Max projects must be less than 1000')
      .optional(),
    storage_gb: z
      .number()
      .min(0.1, 'Storage must be at least 0.1 GB')
      .max(1000, 'Storage must be less than 1000 GB')
      .optional()
  }).optional(),
  is_active: z
    .boolean()
    .optional(),
  is_promotional: z
    .boolean()
    .optional(),
  promo_start_date: z
    .string()
    .datetime()
    .optional(),
  promo_end_date: z
    .string()
    .datetime()
    .optional(),
  promo_discount_percent: z
    .number()
    .min(0.01, 'Discount percent must be greater than 0')
    .max(100, 'Discount percent cannot exceed 100')
    .optional(),
  promo_discount_amount: z
    .number()
    .min(0.01, 'Discount amount must be greater than 0')
    .optional(),
  promo_code: z
    .string()
    .min(3, 'Promo code must be at least 3 characters')
    .max(50, 'Promo code must be less than 50 characters')
    .optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// Query parameter validation schemas
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1, { message: 'Page must be at least 1' }),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1 && val <= 100, { 
      message: 'Limit must be between 1 and 100' 
    }),
});

export const clientFiltersSchema = z.object({
  status: statusSchema.optional(),
  plan_type: planTypeSchema.optional(),
  search: z
    .string()
    .max(100, 'Search term must be less than 100 characters')
    .optional(),
});

export const licenseFiltersSchema = z.object({
  status: z
    .enum(['active', 'inactive', 'suspended', 'expired'])
    .optional(),
  client_id: uuidSchema.optional(),
  plan_id: uuidSchema.optional(),
});

// Admin validation schemas
export const adminEmailSchema = z
  .string()
  .email('Invalid email format')
  .refine(
    (email) => {
      return email.endsWith('@focusprint.com');
    },
    { message: 'Email must be from @focusprint.com domain' }
  );

// Metrics validation schemas
export const metricsDateRangeSchema = z.object({
  start_date: z
    .string()
    .datetime('Invalid start date format')
    .optional(),
  end_date: z
    .string()
    .datetime('Invalid end date format')
    .optional(),
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.start_date) <= new Date(data.end_date);
    }
    return true;
  },
  { message: 'Start date must be before or equal to end date' }
);

// Type exports for TypeScript
export type CreateClientData = z.infer<typeof createClientSchema>;
export type UpdateClientData = z.infer<typeof updateClientSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
export type CreateLicenseData = z.infer<typeof createLicenseSchema>;
export type UpdateLicenseData = z.infer<typeof updateLicenseSchema>;
export type CreatePlanData = z.infer<typeof createPlanSchema>;
export type UpdatePlanData = z.infer<typeof updatePlanSchema>;
export type PaginationData = z.infer<typeof paginationSchema>;
export type ClientFiltersData = z.infer<typeof clientFiltersSchema>;
export type LicenseFiltersData = z.infer<typeof licenseFiltersSchema>;
export type MetricsDateRangeData = z.infer<typeof metricsDateRangeSchema>;

// Validation helper functions
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(firstError.message);
    }
    throw error;
  }
}

export function validateDataSafe<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { success: false, error: firstError.message };
    }
    return { success: false, error: 'Validation failed' };
  }
}
