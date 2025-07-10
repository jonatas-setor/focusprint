"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TestSignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const testSignup = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log("🚀 Iniciando teste de signup...");
      console.log("📧 Email:", email);
      console.log("🔐 Password length:", password.length);

      // Primeiro, testar se o cliente Supabase está funcionando
      console.log("🔧 Testando conexão...");
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      console.log("📊 Session test:", { sessionData, sessionError });

      // Testar se conseguimos fazer uma requisição simples
      console.log("🔧 Testando requisição básica...");
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
          {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
              "Content-Type": "application/json",
            },
          }
        );
        console.log("📊 Settings test:", {
          status: response.status,
          ok: response.ok,
        });
      } catch (fetchError) {
        console.error("❌ Erro na requisição básica:", fetchError);
      }

      // Agora testar o signup
      console.log("🚀 Executando signup...");
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            first_name: "Test",
            last_name: "User",
          },
        },
      });

      console.log("📝 Resultado do signup:", { data, error });

      // Capturar mais detalhes do erro
      if (error) {
        console.error("🔍 Detalhes do erro:", {
          name: error.name,
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      }

      setResult({
        type: "signup",
        data,
        error: error
          ? {
              name: error.name,
              message: error.message,
              status: error.status,
              statusText: error.statusText,
              details: error.details,
              hint: error.hint,
              code: error.code,
              __isAuthError: error.__isAuthError,
            }
          : null,
        timestamp: new Date().toISOString(),
        success: !error && !!data.user,
      });
    } catch (err) {
      console.error("❌ Erro capturado:", err);
      setResult({
        type: "signup",
        error: err,
        timestamp: new Date().toISOString(),
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          🧪 Teste de Signup - FocuSprint
        </h1>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuração do Teste</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email de teste:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="test@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha de teste:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="senha123"
              />
            </div>

            <button
              onClick={testSignup}
              disabled={loading || !email || !password}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Testando..." : "Testar Signup"}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Resultado do Teste</h2>

            <div
              className={`p-4 rounded-md mb-4 ${
                result.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p
                className={`font-semibold ${
                  result.success ? "text-green-800" : "text-red-800"
                }`}
              >
                {result.success
                  ? "✅ Signup realizado com sucesso!"
                  : "❌ Falha no signup"}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700">Timestamp:</h3>
                <p className="text-sm text-gray-600">{result.timestamp}</p>
              </div>

              {result.data && (
                <div>
                  <h3 className="font-semibold text-gray-700">Data:</h3>
                  <pre className="text-sm bg-gray-100 p-3 rounded-md overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}

              {result.error && (
                <div>
                  <h3 className="font-semibold text-red-700">Error:</h3>
                  <pre className="text-sm bg-red-100 p-3 rounded-md overflow-auto">
                    {JSON.stringify(result.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 bg-yellow-50 border border-yellow-200 p-4 rounded-md">
          <h3 className="font-semibold text-yellow-800 mb-2">📋 Instruções:</h3>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. Abra o Console do navegador (F12)</li>
            <li>2. Preencha um email e senha de teste</li>
            <li>3. Clique em "Testar Signup"</li>
            <li>4. Verifique os logs detalhados no console</li>
            <li>5. Analise o resultado mostrado na tela</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
