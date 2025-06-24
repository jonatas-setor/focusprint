'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { isValidAdminDomain, logAdminAccessAttempt } from '@/lib/auth/domain-validation-frontend';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔐 Iniciando login...');

      // Validar domínio do email (não autorização - isso é feito pelo RBAC)
      if (!isValidAdminDomain(email)) {
        logAdminAccessAttempt(email, false, 'Invalid admin domain');
        throw new Error('Apenas usuários de domínios autorizados podem acessar a área administrativa');
      }

      // Fazer login
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!data.user) {
        throw new Error('Falha na autenticação');
      }

      console.log('✅ Login bem-sucedido!', data.user.email);
      logAdminAccessAttempt(email, true);

      // Verificar se usuário tem perfil admin válido (RBAC)
      const { data: profile, error: profileError } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Erro no perfil admin:', profileError);
        await supabase.auth.signOut();
        logAdminAccessAttempt(email, false, 'Admin profile not found');
        throw new Error('Usuário não possui perfil de administrador válido');
      }

      // Verificar se role é válida
      const validRoles = ['super_admin', 'operations_admin', 'financial_admin', 'technical_admin', 'support_admin'];
      if (!validRoles.includes(profile.role)) {
        console.error('❌ Role inválida:', profile.role);
        await supabase.auth.signOut();
        logAdminAccessAttempt(email, false, 'Invalid admin role');
        throw new Error('Role de administrador inválida');
      }

      console.log('✅ Perfil admin encontrado:', profile);
      setSuccess(`🎉 Login bem-sucedido! Bem-vindo, ${profile.first_name} ${profile.last_name}!`);

      // Redirecionar após 2 segundos
      setTimeout(() => {
        window.location.href = '/admin';
      }, 2000);

    } catch (err) {
      console.error('❌ Erro no login:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro interno do servidor';
      logAdminAccessAttempt(email, false, errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <html lang="en">
      <head>
        <title>Admin Login - FocuSprint</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .spinner {
            animation: spin 1s linear infinite;
          }
        `}</style>
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', backgroundColor: '#f3f4f6' }}>
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{ 
            maxWidth: '420px', 
            width: '100%', 
            backgroundColor: 'white',
            padding: '48px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: '#1f2937', 
                margin: '0 0 12px 0',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                FocuSprint
              </h1>
              <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
                🔐 Platform Administration
              </p>
            </div>

            {/* Login Form */}
            <div style={{ 
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '32px'
            }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                margin: '0 0 8px 0',
                color: '#1f2937'
              }}>
                Login Administrativo
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 32px 0' }}>
                Acesso restrito a administradores da plataforma
              </p>

              <form onSubmit={handleLogin}>
                {/* Error Message */}
                {error && (
                  <div style={{ 
                    backgroundColor: '#fee2e2', 
                    border: '2px solid #fca5a5', 
                    borderRadius: '8px', 
                    padding: '16px',
                    marginBottom: '24px'
                  }}>
                    <p style={{ color: '#dc2626', fontSize: '14px', margin: 0, fontWeight: '500' }}>
                      ❌ {error}
                    </p>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div style={{ 
                    backgroundColor: '#dcfce7', 
                    border: '2px solid #86efac', 
                    borderRadius: '8px', 
                    padding: '16px',
                    marginBottom: '24px'
                  }}>
                    <p style={{ color: '#16a34a', fontSize: '14px', margin: 0, fontWeight: '500' }}>
                      {success}
                    </p>
                  </div>
                )}

                {/* Email Field */}
                <div style={{ marginBottom: '24px' }}>
                  <label htmlFor="email" style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    📧 Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                {/* Password Field */}
                <div style={{ marginBottom: '32px' }}>
                  <label htmlFor="password" style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    🔑 Senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    if (!loading) e.target.style.backgroundColor = '#2563eb';
                  }}
                  onMouseOut={(e) => {
                    if (!loading) e.target.style.backgroundColor = '#3b82f6';
                  }}
                >
                  {loading && (
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #ffffff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%'
                    }} className="spinner"></div>
                  )}
                  {loading ? 'Entrando...' : '🚀 Entrar'}
                </button>
              </form>

              {/* Footer */}
              <div style={{ marginTop: '32px', textAlign: 'center', padding: '20px', backgroundColor: 'white', borderRadius: '6px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                  🔒 Apenas administradores autorizados podem acessar esta área.
                  <br />
                  Para suporte, entre em contato com a equipe técnica.
                </p>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
