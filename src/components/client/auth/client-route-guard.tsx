"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClientAuthService } from "@/lib/auth/client";
import { supabase } from "@/lib/supabase/client";

interface ClientRouteGuardProps {
  children: React.ReactNode;
}

export default function ClientRouteGuard({ children }: ClientRouteGuardProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      console.log("🔐 ClientRouteGuard: Checking authentication...");

      // First check if we have a session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      console.log("🔐 Session check:", {
        hasSession: !!session,
        error: sessionError,
      });

      if (!session) {
        console.log("❌ No session found, redirecting to login");
        setIsAuthenticated(false);
        router.push("/login");
        return;
      }

      // Check if user has client access
      const currentUser = await ClientAuthService.getCurrentUser();
      console.log("🔐 Client user check:", {
        hasUser: !!currentUser,
        email: currentUser?.email,
      });

      if (currentUser) {
        console.log("✅ Client authentication successful");
        setIsAuthenticated(true);
      } else {
        console.log(
          "❌ User not authorized for client dashboard, redirecting to login"
        );
        setIsAuthenticated(false);
        router.push("/login");
      }
    } catch (error) {
      console.error("❌ Auth check error:", error);
      setIsAuthenticated(false);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center"
        suppressHydrationWarning
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">
            Verificando autenticação...
          </p>
        </div>
      </div>
    );
  }

  // Não mostrar nada se não estiver autenticado (redirecionamento em andamento)
  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center"
        suppressHydrationWarning
      >
        <div className="text-center">
          <p className="text-sm text-gray-600">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  // Mostrar conteúdo se estiver autenticado
  return <>{children}</>;
}
