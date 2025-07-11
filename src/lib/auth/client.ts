import { supabase } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export interface ClientAuthUser {
  id: string;
  email: string;
  user_type: "platform_admin" | "client_user";
  client_id?: string;
}

export class ClientAuthService {
  /**
   * Get current authenticated user for client dashboard
   * Supports both platform_admin and client_user types
   */
  static async getCurrentUser(): Promise<ClientAuthUser | null> {
    try {
      // Get authenticated user
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user || !user.email) {
        console.log("❌ No user found or error:", error);
        return null;
      }

      console.log("✅ User found, checking profiles...", { email: user.email });

      // Check if email is confirmed
      if (!user.email_confirmed_at) {
        console.log("❌ Email not confirmed");
        return null;
      }

      // Check if user has admin role in metadata (legacy support)
      const userMetadata = user.user_metadata || user.raw_user_meta_data || {};
      if (userMetadata.role === "admin") {
        console.log("✅ User has admin role in metadata, granting access");
        return {
          id: user.id,
          email: user.email,
          user_type: "platform_admin",
          client_id: undefined,
        };
      }

      // Get user profile to determine type
      console.log("🔍 Checking user_profiles for:", user.id);
      const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("user_type, status")
        .eq("id", user.id)
        .eq("status", "active")
        .single();

      console.log("🔍 user_profiles result:", {
        hasProfile: !!userProfile,
        profile: userProfile,
        error: profileError?.message,
        errorCode: profileError?.code,
      });

      if (profileError || !userProfile) {
        console.log("❌ No user profile found:", profileError);
        return null;
      }

      // Platform admins have access to client dashboard (multiple roles)
      if (userProfile.user_type === "platform_admin") {
        // Check if platform admin also has a client profile
        const { data: clientProfile } = await supabase
          .from("client_profiles")
          .select("client_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();

        return {
          id: user.id,
          email: user.email,
          user_type: "platform_admin",
          client_id: clientProfile?.client_id,
        };
      }

      // For client users, verify they have a valid client profile
      if (userProfile.user_type === "client_user") {
        console.log("🔍 Checking client_profiles for user_id:", user.id);
        const { data: clientProfile, error: clientProfileError } =
          await supabase
            .from("client_profiles")
            .select("id, is_active, client_id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();

        console.log("🔍 client_profiles result:", {
          hasClientProfile: !!clientProfile,
          clientProfile: clientProfile,
          error: clientProfileError?.message,
          errorCode: clientProfileError?.code,
        });

        if (clientProfileError || !clientProfile) {
          console.log("❌ No client profile found:", clientProfileError);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          user_type: "client_user",
          client_id: clientProfile.client_id,
        };
      }

      // Invalid user type
      return null;
    } catch (error) {
      console.error("❌ ClientAuthService.getCurrentUser error:", error);
      return null;
    }
  }

  /**
   * Check if user has access to client dashboard
   */
  static async hasClientAccess(userId: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user !== null && user.id === userId;
    } catch {
      return false;
    }
  }

  /**
   * Get client ID for current user (for client_user type)
   */
  static async getCurrentClientId(): Promise<string | null> {
    try {
      const user = await this.getCurrentUser();
      return user?.client_id || null;
    } catch {
      return null;
    }
  }
}
