"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { onboardingService, OnboardingData } from "@/lib/auth/onboarding";
import { Github, AlertCircle, CheckCircle } from "lucide-react";

export default function ClientRegisterForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    clientName: "",
    clientType: "personal" as
      | "personal"
      | "company"
      | "organization"
      | "department",
    planType: "free" as "free" | "pro" | "business" | "enterprise",
  });
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [supabaseReady, setSupabaseReady] = useState(false);
  const supabase = createClient();

  // Verificar se o Supabase está configurado corretamente
  useEffect(() => {
    const checkSupabaseConfig = async () => {
      console.log("🔧 DEBUG: Verificando configuração do Supabase...");

      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      console.log("🔧 DEBUG: Variáveis de ambiente:", {
        hasUrl,
        hasKey,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING",
      });

      if (!hasUrl || !hasKey) {
        console.error("❌ DEBUG: Variáveis de ambiente não encontradas");
        setError(
          "Configuração do Supabase não encontrada. Verifique as variáveis de ambiente."
        );
        setSupabaseReady(false);
      } else {
        console.log("✅ DEBUG: Variáveis de ambiente encontradas");

        // Testar conexão com Supabase
        try {
          console.log("🔧 DEBUG: Testando conexão com Supabase...");
          const { data, error } = await supabase.auth.getSession();
          console.log("🔧 DEBUG: Teste de conexão:", { data, error });

          if (error) {
            console.error("❌ DEBUG: Erro na conexão com Supabase:", error);
            setError(`Erro de conexão com Supabase: ${error.message}`);
            setSupabaseReady(false);
          } else {
            console.log("✅ DEBUG: Conexão com Supabase OK");
            setSupabaseReady(true);
          }
        } catch (err) {
          console.error("❌ DEBUG: Erro ao testar conexão:", err);
          setError("Erro ao conectar com o serviço de autenticação");
          setSupabaseReady(false);
        }
      }
    };

    checkSupabaseConfig();
  }, [supabase]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Validação de email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validação de senha
  const validatePassword = (password: string): string[] => {
    const errors = [];
    if (password.length < 8) errors.push("Mínimo 8 caracteres");
    if (!/[A-Z]/.test(password)) errors.push("Uma letra maiúscula");
    if (!/[a-z]/.test(password)) errors.push("Uma letra minúscula");
    if (!/[0-9]/.test(password)) errors.push("Um número");
    return errors;
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabaseReady) {
      setError(
        "Serviço temporariamente indisponível. Tente novamente em alguns minutos."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validações mais robustas
      if (!formData.firstName.trim()) {
        throw new Error("Nome é obrigatório");
      }

      if (!formData.lastName.trim()) {
        throw new Error("Sobrenome é obrigatório");
      }

      if (!validateEmail(formData.email)) {
        throw new Error("Email inválido");
      }

      const passwordErrors = validatePassword(formData.password);
      if (passwordErrors.length > 0) {
        throw new Error(`Senha deve ter: ${passwordErrors.join(", ")}`);
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error("As senhas não coincidem");
      }

      console.log("🚀 Tentando criar conta...", { email: formData.email });

      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
          },
        },
      });

      console.log("📝 Resposta do signup:", { data, error: authError });

      if (authError) {
        // Tratar erros específicos do Supabase
        let errorMessage = authError.message;

        if (authError.message.includes("User already registered")) {
          errorMessage = "Este email já está cadastrado. Tente fazer login.";
        } else if (authError.message.includes("Invalid email")) {
          errorMessage = "Email inválido.";
        } else if (authError.message.includes("Password should be at least")) {
          errorMessage = "Senha muito fraca.";
        } else if (
          authError.message.includes("Unable to validate email address")
        ) {
          errorMessage =
            "Não foi possível validar o email. Verifique se está correto.";
        }

        throw new Error(errorMessage);
      }

      if (data.user) {
        console.log("✅ Usuário criado, iniciando onboarding...");

        // Preparar dados para onboarding
        const onboardingData: OnboardingData = {
          clientName:
            formData.clientName || `${formData.firstName} ${formData.lastName}`,
          clientType: formData.clientType,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          planType: formData.planType,
        };

        try {
          // Executar onboarding automático
          const onboardingResult = await onboardingService.completeOnboarding(
            data.user,
            onboardingData
          );

          console.log("✅ Onboarding completo:", onboardingResult);

          setSuccess(
            "✅ Conta criada com sucesso! Verifique seu email para confirmar a conta."
          );

          // Limpar formulário
          setFormData({
            email: "",
            password: "",
            confirmPassword: "",
            firstName: "",
            lastName: "",
            clientName: "",
            clientType: "personal",
            planType: "free",
          });

          // Redirecionar após 3 segundos
          setTimeout(() => {
            window.location.href = "/login?message=account-created";
          }, 3000);
        } catch (onboardingError) {
          console.error("❌ Erro no onboarding:", onboardingError);
          // Mesmo com erro no onboarding, conta foi criada
          setSuccess(
            "✅ Conta criada! Verifique seu email. Alguns dados podem precisar ser configurados no dashboard."
          );

          setTimeout(() => {
            window.location.href = "/login?message=account-created";
          }, 3000);
        }
      }
    } catch (err) {
      console.error("❌ Erro no registro:", err);
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleGithubRegister = async () => {
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
        err instanceof Error ? err.message : "Erro ao criar conta com GitHub"
      );
      setGithubLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Criar Conta no FocuSprint
      </h2>

      {/* Status de configuração do Supabase */}
      {!supabaseReady && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-700">
              Configuração em andamento...
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            <p className="text-sm text-green-600">{success}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleEmailRegister} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-700"
            >
              Nome
            </label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Seu nome"
              required
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-700"
            >
              Sobrenome
            </label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Seu sobrenome"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="clientType"
            className="block text-sm font-medium text-gray-700"
          >
            Tipo de Conta
          </label>
          <select
            id="clientType"
            value={formData.clientType}
            onChange={(e) => handleInputChange("clientType", e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="personal">Uso Pessoal</option>
            <option value="company">Empresa</option>
            <option value="organization">Organização</option>
            <option value="department">Departamento</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="clientName"
            className="block text-sm font-medium text-gray-700"
          >
            {formData.clientType === "personal"
              ? "Nome da Conta"
              : formData.clientType === "company"
              ? "Nome da Empresa"
              : formData.clientType === "organization"
              ? "Nome da Organização"
              : "Nome do Departamento"}
          </label>
          <input
            type="text"
            id="clientName"
            value={formData.clientName}
            onChange={(e) => handleInputChange("clientName", e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder={
              formData.clientType === "personal"
                ? "Ex: João Silva"
                : formData.clientType === "company"
                ? "Ex: Minha Empresa Ltda"
                : formData.clientType === "organization"
                ? "Ex: ONG Esperança"
                : "Ex: TI - Empresa X"
            }
            required
          />
        </div>

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
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            value={formData.password}
            onChange={(e) => handleInputChange("password", e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Mínimo 6 caracteres"
            required
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700"
          >
            Confirmar Senha
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={formData.confirmPassword}
            onChange={(e) =>
              handleInputChange("confirmPassword", e.target.value)
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Digite a senha novamente"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Criando conta..." : "Criar Conta"}
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
          onClick={handleGithubRegister}
          disabled={githubLoading}
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Github className="h-4 w-4" />
          {githubLoading ? "Conectando..." : "Criar conta com GitHub"}
        </button>
      </form>

      <p className="mt-4 text-xs text-gray-500 text-center">
        GitHub permite acesso rápido e seguro à sua conta
      </p>
    </div>
  );
}
