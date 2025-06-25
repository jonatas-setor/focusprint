'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TestLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    // Check current session
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);
    };
    
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setResult({ event, session, timestamp: new Date().toISOString() });
    });

    return () => subscription.unsubscribe();
  }, []);

  const testEmailLogin = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setResult({
        type: 'email_login',
        data,
        error,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setResult({
        type: 'email_login',
        error: err,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const testGithubLogin = async () => {
    setGithubLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/test-login`
        }
      });

      setResult({
        type: 'github_login',
        data,
        error,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setResult({
        type: 'github_login',
        error: err,
        timestamp: new Date().toISOString()
      });
    } finally {
      setGithubLoading(false);
    }
  };

  const testSignup = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      setResult({
        type: 'signup',
        data,
        error,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setResult({
        type: 'signup',
        error: err,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    setResult({
      type: 'logout',
      error,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Diagnóstico de Login - FocuSprint</h1>
        
        {/* Current Session Status */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Status da Sessão</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Usuário logado:</strong>
              <pre className="bg-gray-100 p-2 rounded text-sm mt-1">
                {user ? JSON.stringify(user, null, 2) : 'Nenhum usuário logado'}
              </pre>
            </div>
            <div>
              <strong>Sessão:</strong>
              <pre className="bg-gray-100 p-2 rounded text-sm mt-1">
                {session ? 'Sessão ativa' : 'Nenhuma sessão'}
              </pre>
            </div>
          </div>
          {user && (
            <button
              onClick={logout}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          )}
        </div>

        {/* Test Forms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Email Login Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Teste Login Email</h2>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <div className="space-y-2">
                <button
                  onClick={testEmailLogin}
                  disabled={loading}
                  className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Testando Login...' : 'Testar Login'}
                </button>
                <button
                  onClick={testSignup}
                  disabled={loading}
                  className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Testando Signup...' : 'Testar Signup'}
                </button>
              </div>
            </div>
          </div>

          {/* GitHub Login Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Teste Login GitHub</h2>
            <button
              onClick={testGithubLogin}
              disabled={githubLoading}
              className="w-full p-2 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-50"
            >
              {githubLoading ? 'Redirecionando...' : 'Testar Login GitHub'}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Resultado do Teste</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* Environment Info */}
        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4">Informações do Ambiente</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>URL atual:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A (SSR)'}
            </div>
            <div>
              <strong>Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A (SSR)'}
            </div>
            <div>
              <strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}
            </div>
            <div>
              <strong>Anon Key (primeiros 20 chars):</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
