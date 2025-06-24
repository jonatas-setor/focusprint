'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAuthService, AdminAuthUser } from '@/lib/auth/admin';
import { supabase } from '@/lib/supabase/client';

export function useAdminAuth() {
  const [user, setUser] = useState<AdminAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Verificar usuário atual ao carregar
    checkUser();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user.id, session.user.email!);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      const currentUser = await AdminAuthService.getCurrentUser();
      setUser(currentUser);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de autenticação');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string, email: string) => {
    try {
      setLoading(true);
      
      // Verificar se é email de domínio autorizado para admin
      if (!email.endsWith('@focusprint.com')) {
        throw new Error('Acesso restrito a usuários do domínio @focusprint.com');
      }

      const profile = await AdminAuthService.getAdminProfile(userId);
      setUser({
        id: userId,
        email,
        profile,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar perfil');
      setUser(null);
      // Fazer logout se não é admin válido
      await AdminAuthService.signOut();
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const authUser = await AdminAuthService.signIn(email, password);
      setUser(authUser);
      
      // Redirecionar para dashboard
      router.push('/admin');
      
      return authUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no login';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await AdminAuthService.signOut();
      setUser(null);
      setError(null);
      
      // Redirecionar para login
      router.push('/admin-login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no logout');
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      const profile = await AdminAuthService.getAdminProfile(user.id);
      setUser({
        ...user,
        profile,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    refreshProfile,
    isAuthenticated: !!user,
    isAdmin: !!user,
  };
}
