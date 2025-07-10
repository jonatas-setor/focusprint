'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DebugMiddlewarePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      const logEntry = `[${new Date().toLocaleTimeString()}] 🔍 User Status Check:`;
      setLogs(prev => [...prev, logEntry]);
      
      if (error) {
        setLogs(prev => [...prev, `❌ Error: ${error.message}`]);
      } else if (user) {
        setUserInfo(user);
        setLogs(prev => [...prev, `✅ User found: ${user.email}`]);
        setLogs(prev => [...prev, `📧 Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`]);
        setLogs(prev => [...prev, `🆔 User ID: ${user.id}`]);
      } else {
        setLogs(prev => [...prev, `❌ No user found`]);
      }
    } catch (err) {
      setLogs(prev => [...prev, `❌ Exception: ${err}`]);
    } finally {
      setLoading(false);
    }
  };

  const testDashboardAccess = async () => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🚀 Testing dashboard access...`]);
    
    try {
      const response = await fetch('/dashboard', {
        method: 'HEAD',
        credentials: 'include'
      });
      
      setLogs(prev => [...prev, `📡 Response status: ${response.status}`]);
      setLogs(prev => [...prev, `📍 Response URL: ${response.url}`]);
      
      if (response.redirected) {
        setLogs(prev => [...prev, `🔄 Redirected to: ${response.url}`]);
      }
      
      if (response.status === 200) {
        setLogs(prev => [...prev, `✅ Dashboard accessible`]);
      } else {
        setLogs(prev => [...prev, `❌ Dashboard not accessible`]);
      }
    } catch (err) {
      setLogs(prev => [...prev, `❌ Fetch error: ${err}`]);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <html>
      <head>
        <title>Debug Middleware - FocuSprint</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '30px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>
              🔍 Debug Middleware - FocuSprint
            </h1>

            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>
                📋 Status Atual:
              </h2>
              <div style={{ 
                padding: '15px', 
                backgroundColor: loading ? '#fef3c7' : userInfo ? '#dcfce7' : '#fee2e2',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontWeight: '600',
                  color: loading ? '#92400e' : userInfo ? '#166534' : '#dc2626'
                }}>
                  {loading ? '⏳ Verificando...' : userInfo ? '✅ Usuário Autenticado' : '❌ Não Autenticado'}
                </p>
              </div>
            </div>

            {userInfo && (
              <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>
                  👤 Informações do Usuário:
                </h2>
                <div style={{ 
                  padding: '15px', 
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }}>
                  <div><strong>Email:</strong> {userInfo.email}</div>
                  <div><strong>ID:</strong> {userInfo.id}</div>
                  <div><strong>Email Confirmado:</strong> {userInfo.email_confirmed_at ? 'Sim' : 'Não'}</div>
                  <div><strong>Criado em:</strong> {new Date(userInfo.created_at).toLocaleString()}</div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>
                🧪 Testes:
              </h2>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={checkUserStatus}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Verificar Status do Usuário
                </button>
                
                <button
                  onClick={testDashboardAccess}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🚀 Testar Acesso ao Dashboard
                </button>
                
                <button
                  onClick={clearLogs}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Limpar Logs
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>
                📝 Logs de Debug:
              </h2>
              <div style={{ 
                backgroundColor: '#1f2937',
                color: '#10b981',
                padding: '20px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '14px',
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #374151'
              }}>
                {logs.length === 0 ? (
                  <div style={{ color: '#6b7280' }}>Nenhum log ainda. Execute um teste para ver os logs.</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} style={{ marginBottom: '8px', lineHeight: '1.5' }}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <a
                href="/login"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginRight: '10px'
                }}
              >
                🔐 Ir para Login
              </a>
              
              <a
                href="/dashboard"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#059669',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                📊 Ir para Dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
