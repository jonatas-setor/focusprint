import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export interface OnboardingData {
  // Dados do cliente (flexível)
  clientName: string; // Nome da empresa, organização, ou nome pessoal
  clientType: "company" | "organization" | "personal" | "department";

  // Dados do usuário
  firstName: string;
  lastName: string;

  // Plano escolhido
  planType: "free" | "pro" | "business" | "enterprise";
}

export class OnboardingService {
  private supabase = createClient();

  /**
   * Completa o onboarding após registro bem-sucedido
   */
  async completeOnboarding(user: User, data: OnboardingData) {
    try {
      console.log("🚀 Iniciando onboarding completo...", {
        userId: user.id,
        email: user.email,
      });

      // 1. Criar perfil de usuário root
      await this.createUserProfile(user.id, "client_user");

      // 2. Criar cliente/empresa
      const clientId = await this.createClient(data);

      // 3. Criar perfil de cliente para o usuário
      await this.createClientProfile(user.id, clientId, data, "client_owner");

      // 4. Criar primeiro time padrão
      await this.createDefaultTeam(clientId, data.companyName);

      console.log("✅ Onboarding completo!", { userId: user.id, clientId });

      return {
        success: true,
        clientId,
        message: "Conta criada com sucesso!",
      };
    } catch (error) {
      console.error("❌ Erro no onboarding:", error);

      // Cleanup em caso de erro
      await this.cleanupFailedOnboarding(user.id);

      throw new Error("Erro ao configurar conta. Tente novamente.");
    }
  }

  /**
   * Cria perfil de usuário root
   */
  private async createUserProfile(
    userId: string,
    userType: "client_user" | "platform_admin"
  ) {
    const { error } = await this.supabase.from("user_profiles").insert({
      id: userId,
      user_type: userType,
      status: "active",
    });

    if (error) {
      throw new Error(`Erro ao criar perfil de usuário: ${error.message}`);
    }

    console.log("✅ Perfil de usuário criado");
  }

  /**
   * Cria cliente/empresa
   */
  private async createClient(data: OnboardingData) {
    const clientData = {
      name: data.clientName,
      client_type: data.clientType,
      plan_type: data.planType,
      status: "active",
      max_users: this.getMaxUsers(data.planType),
      max_projects: this.getMaxProjects(data.planType),
      max_storage_gb: this.getMaxStorage(data.planType),
      trial_ends_at: data.planType === "free" ? null : this.getTrialEndDate(),
    };

    const { data: client, error } = await this.supabase
      .from("clients")
      .insert(clientData)
      .select("id")
      .single();

    if (error) {
      throw new Error(`Erro ao criar cliente: ${error.message}`);
    }

    console.log("✅ Cliente criado:", client.id);
    return client.id;
  }

  /**
   * Cria perfil de cliente para o usuário
   */
  private async createClientProfile(
    userId: string,
    clientId: string,
    data: OnboardingData,
    role: "client_owner" | "client_admin" | "team_leader" | "team_member"
  ) {
    const { error } = await this.supabase.from("client_profiles").insert({
      user_id: userId,
      client_id: clientId,
      role: role,
      first_name: data.firstName,
      last_name: data.lastName,
      is_active: true,
      google_account_connected: false,
    });

    if (error) {
      throw new Error(`Erro ao criar perfil de cliente: ${error.message}`);
    }

    console.log("✅ Perfil de cliente criado");
  }

  /**
   * Cria time padrão
   */
  private async createDefaultTeam(clientId: string, companyName: string) {
    const { data: team, error } = await this.supabase
      .from("teams")
      .insert({
        client_id: clientId,
        name: `Time Principal - ${companyName}`,
        description: "Time principal da empresa",
        is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Erro ao criar time padrão: ${error.message}`);
    }

    console.log("✅ Time padrão criado:", team.id);
    return team.id;
  }

  /**
   * Cleanup em caso de erro
   */
  private async cleanupFailedOnboarding(userId: string) {
    try {
      // Remove perfil de cliente se existir
      await this.supabase
        .from("client_profiles")
        .delete()
        .eq("user_id", userId);

      // Remove perfil de usuário se existir
      await this.supabase.from("user_profiles").delete().eq("id", userId);

      console.log("🧹 Cleanup realizado");
    } catch (error) {
      console.error("❌ Erro no cleanup:", error);
    }
  }

  /**
   * Helpers para limites por plano
   */
  private getMaxUsers(planType: string): number {
    switch (planType) {
      case "free":
        return 5;
      case "pro":
        return 15;
      case "business":
        return 50;
      case "enterprise":
        return 999999;
      default:
        return 5;
    }
  }

  private getMaxProjects(planType: string): number {
    switch (planType) {
      case "free":
        return 3;
      case "pro":
        return 10;
      case "business":
        return 50;
      case "enterprise":
        return 999999;
      default:
        return 3;
    }
  }

  private getMaxStorage(planType: string): number {
    switch (planType) {
      case "free":
        return 0.1; // 100MB
      case "pro":
        return 5;
      case "business":
        return 20;
      case "enterprise":
        return 1000;
      default:
        return 0.1;
    }
  }

  private getTrialEndDate(): string {
    const trialDays = 14; // 14 dias de trial
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + trialDays);
    return endDate.toISOString();
  }
}

export const onboardingService = new OnboardingService();
