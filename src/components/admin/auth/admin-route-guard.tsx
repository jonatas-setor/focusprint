'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAuthService } from '@/lib/auth/admin';
import { supabase } from '@/lib/supabase/client';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export default function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      console.log('🔐 AdminRouteGuard: Checking authentication...');

      // First check if we have a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 Session check:', { hasSession: !!session, error: sessionError });

      if (!session) {
        console.log('❌ No session found, redirecting to login');
        setIsAuthenticated(false);
        router.push('/admin-login');
        return;
      }

      // Check if user is admin
      const currentUser = await AdminAuthService.getCurrentUser();
      console.log('🔐 Admin user check:', { hasUser: !!currentUser, email: currentUser?.email });

      if (currentUser) {
        console.log('✅ Admin authentication successful');
        setIsAuthenticated(true);
      } else {
        console.log('❌ User is not admin, redirecting to login');
        setIsAuthenticated(false);
        router.push('/admin-login');
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
      setIsAuthenticated(false);
      router.push('/admin-login');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" suppressHydrationWarning>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Não mostrar nada se não estiver autenticado (redirecionamento em andamento)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" suppressHydrationWarning>
        <div className="text-center">
          <p className="text-sm text-gray-600">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  // Mostrar conteúdo se estiver autenticado
  return <>{children}</>;
}
