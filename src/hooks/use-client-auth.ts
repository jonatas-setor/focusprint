"use client";

import { useState, useEffect } from "react";
import { ClientAuthService } from "@/lib/auth/client";
import { createClient } from "@/lib/supabase/client";
import { ClientProfile } from "@/lib/auth/types";

interface UseClientAuthReturn {
  profile: ClientProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useClientAuth(): UseClientAuthReturn {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 useClientAuth: Fetching real user profile...");

      // Create fresh Supabase client instance
      const supabase = createClient();
      console.log("🔧 useClientAuth: Created fresh Supabase client");

      // Debug: Check if client has proper configuration
      console.log("🔍 useClientAuth: Supabase client config:", {
        url: supabase.supabaseUrl,
        hasKey: !!supabase.supabaseKey,
        keyPrefix: supabase.supabaseKey?.substring(0, 20) + "...",
      });

      // Get current authenticated user
      const currentUser = await ClientAuthService.getCurrentUser();

      if (!currentUser) {
        console.log("❌ useClientAuth: No authenticated user found");
        setProfile(null);
        return;
      }

      console.log("✅ useClientAuth: User found:", {
        email: currentUser.email,
        user_type: currentUser.user_type,
        client_id: currentUser.client_id,
      });

      // Get detailed client profile
      const { data: clientProfile, error: profileError } = await supabase
        .from("client_profiles")
        .select(
          `
          *,
          client:client_id (
            id,
            name,
            plan_type,
            status,
            max_users,
            max_projects
          )
        `
        )
        .eq("user_id", currentUser.id)
        .eq("is_active", true)
        .single();

      if (profileError) {
        console.error(
          "❌ useClientAuth: Error fetching profile:",
          profileError
        );
        setError("Erro ao carregar perfil do usuário");
        return;
      }

      if (!clientProfile) {
        console.log("❌ useClientAuth: No client profile found");
        setError("Perfil de cliente não encontrado");
        return;
      }

      console.log("✅ useClientAuth: Profile loaded successfully:", {
        name: `${clientProfile.first_name} ${clientProfile.last_name}`,
        client: clientProfile.client?.name,
        role: clientProfile.role,
      });

      setProfile(clientProfile as ClientProfile);
    } catch (err) {
      console.error("❌ useClientAuth: Unexpected error:", err);
      setError("Erro inesperado ao carregar dados do usuário");
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchProfile();
  };

  useEffect(() => {
    fetchProfile();

    // Listen for auth state changes with fresh client
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 useClientAuth: Auth state changed:", event);

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setLoading(false);
      } else if (event === "SIGNED_IN" && session) {
        await fetchProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    profile,
    loading,
    error,
    refetch,
  };
}
