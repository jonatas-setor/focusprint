'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { AdminAuthService } from '@/lib/auth/admin';

export default function DebugAuthPage() {
  const [authState, setAuthState] = useState<any>({
    loading: true,
    user: null,
    profile: null,
    error: null,
    steps: []
  });

  useEffect(() => {
    debugAuth();
  }, []);

  const debugAuth = async () => {
    const steps: string[] = [];
    
    try {
      steps.push('🔍 Iniciando debug de autenticação...');
      setAuthState(prev => ({ ...prev, steps: [...steps] }));

      // Step 1: Check Supabase user
      steps.push('📡 Verificando usuário no Supabase...');
      setAuthState(prev => ({ ...prev, steps: [...steps] }));
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        steps.push(`❌ Erro ao buscar usuário: ${userError.message}`);
        setAuthState(prev => ({ ...prev, steps: [...steps], error: userError.message }));
        return;
      }

      if (!user) {
        steps.push('❌ Nenhum usuário autenticado encontrado');
        setAuthState(prev => ({ ...prev, steps: [...steps], error: 'Usuário não autenticado' }));
        return;
      }

      steps.push(`✅ Usuário encontrado: ${user.email}`);
      setAuthState(prev => ({ ...prev, steps: [...steps], user }));

      // Step 2: Check email authorization
      const adminEmails = ['admin@focusprint.com', 'atendimento.setor@gmail.com'];
      if (!user.email || !adminEmails.includes(user.email)) {
        steps.push(`❌ Email não autorizado: ${user.email}`);
        setAuthState(prev => ({ ...prev, steps: [...steps], error: 'Email não autorizado' }));
        return;
      }

      steps.push(`✅ Email autorizado: ${user.email}`);
      setAuthState(prev => ({ ...prev, steps: [...steps] }));

      // Step 3: Check admin profile
      steps.push('👤 Buscando perfil admin...');
      setAuthState(prev => ({ ...prev, steps: [...steps] }));

      const { data: profile, error: profileError } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        steps.push(`❌ Erro ao buscar perfil: ${profileError.message}`);
        setAuthState(prev => ({ ...prev, steps: [...steps], error: profileError.message }));
        return;
      }

      if (!profile) {
        steps.push('❌ Perfil admin não encontrado');
        setAuthState(prev => ({ ...prev, steps: [...steps], error: 'Perfil não encontrado' }));
        return;
      }

      steps.push(`✅ Perfil admin encontrado: ${profile.first_name} ${profile.last_name}`);
      setAuthState(prev => ({ ...prev, steps: [...steps], profile }));

      // Step 4: Test AdminAuthService
      steps.push('🔧 Testando AdminAuthService...');
      setAuthState(prev => ({ ...prev, steps: [...steps] }));

      try {
        const currentUser = await AdminAuthService.getCurrentUser();
        if (currentUser) {
          steps.push(`✅ AdminAuthService funcionando: ${currentUser.email}`);
          setAuthState(prev => ({ ...prev, steps: [...steps], loading: false }));
        } else {
          steps.push('❌ AdminAuthService retornou null');
          setAuthState(prev => ({ ...prev, steps: [...steps], error: 'AdminAuthService falhou', loading: false }));
        }
      } catch (serviceError) {
        steps.push(`❌ Erro no AdminAuthService: ${serviceError}`);
        setAuthState(prev => ({ ...prev, steps: [...steps], error: `Service error: ${serviceError}`, loading: false }));
      }

    } catch (error) {
      steps.push(`❌ Erro geral: ${error}`);
      setAuthState(prev => ({ ...prev, steps: [...steps], error: `General error: ${error}`, loading: false }));
    }
  };

  return (
    <html lang="en">
      <head>
        <title>Debug Auth - FocuSprint</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', backgroundColor: '#f3f4f6' }}>
        <div style={{ 
          minHeight: '100vh', 
          padding: '40px',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <div style={{ 
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              marginBottom: '20px',
              color: '#1f2937'
            }}>
              🔍 Debug de Autenticação Admin
            </h1>

            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>
                📋 Status Atual:
              </h2>
              <div style={{ 
                padding: '15px', 
                backgroundColor: authState.loading ? '#fef3c7' : authState.error ? '#fee2e2' : '#dcfce7',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontWeight: '600',
                  color: authState.loading ? '#92400e' : authState.error ? '#dc2626' : '#166534'
                }}>
                  {authState.loading ? '⏳ Verificando...' : authState.error ? `❌ ${authState.error}` : '✅ Autenticação OK'}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>
                🔄 Passos de Debug:
              </h2>
              <div style={{ 
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '20px'
              }}>
                {authState.steps.map((step: string, index: number) => (
                  <div key={index} style={{ 
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}>
                    {step}
                  </div>
                ))}
              </div>
            </div>

            {authState.user && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                  👤 Dados do Usuário:
                </h3>
                <pre style={{ 
                  backgroundColor: '#f3f4f6',
                  padding: '15px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(authState.user, null, 2)}
                </pre>
              </div>
            )}

            {authState.profile && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                  🎭 Perfil Admin:
                </h3>
                <pre style={{ 
                  backgroundColor: '#f3f4f6',
                  padding: '15px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(authState.profile, null, 2)}
                </pre>
              </div>
            )}

            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <button
                onClick={debugAuth}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                🔄 Executar Debug Novamente
              </button>
              
              <a
                href="/admin"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                🚀 Ir para Admin Dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
