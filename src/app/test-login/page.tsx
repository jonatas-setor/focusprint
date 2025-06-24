'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function TestLoginPage() {
  const [email, setEmail] = useState('atendimento.setor@gmail.com');
  const [password, setPassword] = useState('abc123!@#');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔐 Tentando fazer login...');
      
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

      // Verificar perfil admin
      const { data: profile, error: profileError } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Erro no perfil:', profileError);
        await supabase.auth.signOut();
        throw new Error('Usuário não possui permissões de administrador');
      }

      console.log('✅ Perfil admin encontrado:', profile);
      setSuccess(`Login bem-sucedido! Bem-vindo, ${profile.first_name} ${profile.last_name}`);

    } catch (err) {
      console.error('❌ Erro no login:', err);
      setError(err instanceof Error ? err.message : 'Erro interno do servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <html lang="en">
      <head>
        <title>Test Login - FocuSprint</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ 
          minHeight: '100vh', 
          backgroundColor: '#f3f4f6', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{ 
            maxWidth: '400px', 
            width: '100%', 
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' }}>
                🔐 Test Login
              </h1>
              <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
                FocuSprint Admin Authentication Test
              </p>
            </div>

            <form onSubmit={handleLogin} style={{ marginBottom: '20px' }}>
              {error && (
                <div style={{ 
                  backgroundColor: '#fee2e2', 
                  border: '2px solid #fca5a5', 
                  borderRadius: '8px', 
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <p style={{ color: '#dc2626', fontSize: '14px', margin: 0, fontWeight: '500' }}>
                    ❌ {error}
                  </p>
                </div>
              )}

              {success && (
                <div style={{ 
                  backgroundColor: '#dcfce7', 
                  border: '2px solid #86efac', 
                  borderRadius: '8px', 
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <p style={{ color: '#16a34a', fontSize: '14px', margin: 0, fontWeight: '500' }}>
                    ✅ {success}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
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
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '30px' }}>
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
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {loading ? '⏳ Entrando...' : '🚀 Entrar'}
              </button>
            </form>

            <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                🧪 Esta é uma página de teste para verificar a autenticação admin.
                <br />
                Se o login funcionar aqui, o problema está na página principal.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
