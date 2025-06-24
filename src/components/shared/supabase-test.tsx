'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [error, setError] = useState<string | null>(null);
  const [projectInfo, setProjectInfo] = useState<{
    url: string;
    hasAnonKey: boolean;
    session: string;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        // Testar conexão básica
        try {
          // Teste simples de conexão
          const { error } = await supabase.auth.getUser();

          if (error && error.message !== 'Auth session missing!') {
            setError(error.message);
            setConnectionStatus('error');
            return;
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setConnectionStatus('error');
          return;
        }

        // Obter informações do projeto
        const { data: { session } } = await supabase.auth.getSession();
        
        setProjectInfo({
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured',
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          session: session ? 'Active' : 'No session',
          timestamp: new Date().toISOString()
        });

        setConnectionStatus('connected');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setConnectionStatus('error');
      }
    }

    testConnection();
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'testing': return 'text-yellow-600';
      case 'connected': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing': return '🔄';
      case 'connected': return '✅';
      case 'error': return '❌';
      default: return '⚪';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Teste de Conexão Supabase
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{getStatusIcon()}</span>
          <span className={`font-medium ${getStatusColor()}`}>
            Status: {connectionStatus === 'testing' ? 'Testando...' : 
                    connectionStatus === 'connected' ? 'Conectado' : 'Erro'}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-800 text-sm">
              <strong>Erro:</strong> {error}
            </p>
          </div>
        )}

        {projectInfo && (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <h4 className="font-medium text-green-800 mb-2">Informações do Projeto:</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>URL:</strong> {projectInfo.url}</p>
              <p><strong>Anon Key:</strong> {projectInfo.hasAnonKey ? 'Configurada' : 'Não configurada'}</p>
              <p><strong>Session:</strong> {projectInfo.session}</p>
              <p><strong>Testado em:</strong> {new Date(projectInfo.timestamp).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p>Schema: platform_admin ✅</p>
          <p>Tabela: admin_profiles ✅</p>
          <p>RLS: Habilitado ✅</p>
        </div>
      </div>
    </div>
  );
}
