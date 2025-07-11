"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Github, ChevronDown, ChevronUp, Check } from "lucide-react";

export default function ClientLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState("");

  // Estados de debug
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [loginSteps, setLoginSteps] = useState({
    credentialsValidated: false,
    userAuthenticated: false,
    sessionCreated: false,
    profileChecked: false,
    redirecting: false,
  });

  const supabase = createClient();

  // Função para adicionar logs de debug
  const addDebugLog = (
    message: string,
    type: "info" | "success" | "error" = "info"
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = type === "success" ? "✅" : type === "error" ? "❌" : "🔄";
    const logMessage = `[${timestamp}] ${emoji} ${message}`;
    setDebugLogs((prev) => [...prev, logMessage]);
    console.log(logMessage);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDebugLogs([]);
    setLoginSteps({
      credentialsValidated: false,
      userAuthenticated: false,
      sessionCreated: false,
      profileChecked: false,
      redirecting: false,
    });

    // Função de retry para operações Supabase
    const retryOperation = async (
      operation: () => Promise<any>,
      maxRetries = 3,
      delay = 1000
    ) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1)
            addDebugLog(`🔄 Tentativa ${attempt}/${maxRetries}...`);
          return await operation();
        } catch (error: any) {
          if (attempt === maxRetries) throw error;
          if (
            error.message?.includes("Load failed") ||
            error.message?.includes("network") ||
            error.message?.includes("fetch")
          ) {
            addDebugLog(
              `⚠️ Tentativa ${attempt} falhou, tentando novamente em ${delay}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 1.5; // Backoff exponencial
          } else {
            throw error; // Se não for erro de rede, não retry
          }
        }
      }
    };

    try {
      addDebugLog("🚀 Iniciando processo de login...");
      addDebugLog(`📧 Email: ${email}`);

      // Step 1: Validar credenciais com retry
      addDebugLog("🔍 Validando credenciais...");
      setLoginSteps((prev) => ({ ...prev, credentialsValidated: true }));

      const { data, error: authError } = await retryOperation(async () => {
        return await supabase.auth.signInWithPassword({
          email,
          password,
        });
      });

      if (authError) {
        addDebugLog(`❌ Erro de autenticação: ${authError.message}`, "error");
        throw new Error(authError.message);
      }

      if (!data.user) {
        addDebugLog("❌ Nenhum usuário retornado", "error");
        throw new Error("Falha na autenticação");
      }

      // Step 2: Usuário autenticado
      addDebugLog("✅ Usuário autenticado com sucesso", "success");
      addDebugLog(`👤 ID do usuário: ${data.user.id}`);
      addDebugLog(
        `📧 Email confirmado: ${data.user.email_confirmed_at ? "Sim" : "Não"}`
      );
      setLoginSteps((prev) => ({ ...prev, userAuthenticated: true }));

      // Step 3: Verificar sessão
      addDebugLog("🔐 Verificando sessão...");
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        addDebugLog(
          `❌ Erro ao verificar sessão: ${sessionError.message}`,
          "error"
        );
        throw new Error(sessionError.message);
      }

      if (sessionData.session) {
        addDebugLog("✅ Sessão criada com sucesso", "success");
        addDebugLog(
          `🔑 Token válido até: ${new Date(
            sessionData.session.expires_at! * 1000
          ).toLocaleString()}`
        );
        setLoginSteps((prev) => ({ ...prev, sessionCreated: true }));
      }

      // Step 4: Verificar perfil do usuário
      addDebugLog("👤 Verificando perfil do usuário...");
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        addDebugLog(
          `⚠️ Perfil não encontrado: ${profileError.message}`,
          "error"
        );
      } else {
        addDebugLog("✅ Perfil encontrado", "success");
        addDebugLog(`📝 Nome: ${profile.first_name} ${profile.last_name}`);
      }
      setLoginSteps((prev) => ({ ...prev, profileChecked: true }));

      // Step 5: Redirecionamento
      addDebugLog("🔄 Redirecionando para dashboard...");
      setLoginSteps((prev) => ({ ...prev, redirecting: true }));

      // Aguardar um pouco para mostrar o debug e garantir que a sessão seja salva
      setTimeout(() => {
        addDebugLog("🚀 EXECUTANDO REDIRECIONAMENTO COM ROUTER [v2]...");
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao fazer login";
      addDebugLog(`❌ Erro final: ${errorMessage}`, "error");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setGithubLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao fazer login com GitHub"
      );
      setGithubLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Entrar no FocuSprint
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Debug e Status do Login */}
      {(loading || debugLogs.length > 0) && (
        <div className="mb-6 border border-gray-200 rounded-lg">
          <div
            className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
            onClick={() => setShowDebug(!showDebug)}
          >
            <div className="flex items-center">
              <div className="text-sm font-medium text-gray-700">
                Status do Login
              </div>
              {loading && (
                <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </div>
            {showDebug ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>

          {showDebug && (
            <div className="p-4 border-t border-gray-200">
              {/* Steps do Login */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    {loginSteps.credentialsValidated ? (
                      <Check className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <div className="h-4 w-4 border-2 border-gray-300 rounded mr-2"></div>
                    )}
                    Credenciais Validadas
                  </div>
                  <div className="flex items-center text-sm">
                    {loginSteps.userAuthenticated ? (
                      <Check className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <div className="h-4 w-4 border-2 border-gray-300 rounded mr-2"></div>
                    )}
                    Usuário Autenticado
                  </div>
                  <div className="flex items-center text-sm">
                    {loginSteps.sessionCreated ? (
                      <Check className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <div className="h-4 w-4 border-2 border-gray-300 rounded mr-2"></div>
                    )}
                    Sessão Criada
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    {loginSteps.profileChecked ? (
                      <Check className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <div className="h-4 w-4 border-2 border-gray-300 rounded mr-2"></div>
                    )}
                    Perfil Verificado
                  </div>
                  <div className="flex items-center text-sm">
                    {loginSteps.redirecting ? (
                      <Check className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <div className="h-4 w-4 border-2 border-gray-300 rounded mr-2"></div>
                    )}
                    Redirecionando
                  </div>
                </div>
              </div>

              {/* Logs de Debug */}
              {debugLogs.length > 0 && (
                <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono max-h-40 overflow-y-auto">
                  {debugLogs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 block w-full h-12 px-4 py-3 border rounded-lg shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 border-gray-300 hover:border-gray-400"
            placeholder="seu@email.com"
            required
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Senha
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 block w-full h-12 px-4 py-3 border rounded-lg shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 border-gray-300 hover:border-gray-400"
            placeholder="Sua senha"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 flex justify-center items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Entrando...
            </div>
          ) : (
            "Entrar"
          )}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">ou</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGithubLogin}
          disabled={githubLoading}
          className="w-full h-12 flex justify-center items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {githubLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-3"></div>
          ) : (
            <Github className="h-5 w-5" />
          )}
          {githubLoading ? "Conectando..." : "Continuar com GitHub"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-500 text-center">
        GitHub login permite acesso rápido e seguro
      </p>
    </div>
  );
}
