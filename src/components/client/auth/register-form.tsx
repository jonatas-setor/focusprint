"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { onboardingService, OnboardingData } from "@/lib/auth/onboarding";
import {
  Github,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  User,
  Building,
  Users,
  Briefcase,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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

  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados de debug
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [onboardingSteps, setOnboardingSteps] = useState({
    userCreated: false,
    userProfileCreated: false,
    clientCreated: false,
    clientProfileCreated: false,
    teamCreated: false,
    emailSent: false,
  });

  // Estados de validação
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [supabaseReady, setSupabaseReady] = useState(false);
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

  // Função para atualizar steps do onboarding
  const updateOnboardingStep = (
    step: keyof typeof onboardingSteps,
    status: boolean
  ) => {
    setOnboardingSteps((prev) => ({ ...prev, [step]: status }));
    addDebugLog(
      `Step ${step}: ${status ? "Concluído" : "Iniciado"}`,
      status ? "success" : "info"
    );
  };

  // Verificar se o Supabase está configurado corretamente
  useEffect(() => {
    const checkSupabaseConfig = async () => {
      addDebugLog("Verificando configuração do Supabase...");

      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      addDebugLog(
        `Variáveis de ambiente: URL=${hasUrl ? "SET" : "MISSING"}, KEY=${
          hasKey ? "SET" : "MISSING"
        }`
      );

      if (!hasUrl || !hasKey) {
        addDebugLog("Variáveis de ambiente não encontradas", "error");
        setError(
          "Configuração do Supabase não encontrada. Verifique as variáveis de ambiente."
        );
        setSupabaseReady(false);
      } else {
        addDebugLog("Variáveis de ambiente encontradas", "success");

        // Testar conexão com Supabase
        try {
          addDebugLog("Testando conexão com Supabase...");
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            addDebugLog(
              `Erro na conexão com Supabase: ${error.message}`,
              "error"
            );
            setError(`Erro de conexão com Supabase: ${error.message}`);
            setSupabaseReady(false);
          } else {
            addDebugLog("Conexão com Supabase OK", "success");
            setSupabaseReady(true);
          }
        } catch (err) {
          addDebugLog(`Erro ao testar conexão: ${err}`, "error");
          setError("Erro ao conectar com o serviço de autenticação");
          setSupabaseReady(false);
        }
      }
    };

    checkSupabaseConfig();
  }, []);

  // Validação em tempo real
  useEffect(() => {
    const errors: Record<string, string> = {};

    if (formData.email && !validateEmail(formData.email)) {
      errors.email = "Email inválido";
    }

    if (formData.password) {
      const passwordErrors = validatePassword(formData.password);
      if (passwordErrors.length > 0) {
        errors.password = passwordErrors.join(", ");
      }
    }

    if (
      formData.confirmPassword &&
      formData.password !== formData.confirmPassword
    ) {
      errors.confirmPassword = "As senhas não coincidem";
    }

    if (formData.firstName && formData.firstName.trim().length < 2) {
      errors.firstName = "Nome deve ter pelo menos 2 caracteres";
    }

    if (formData.lastName && formData.lastName.trim().length < 2) {
      errors.lastName = "Sobrenome deve ter pelo menos 2 caracteres";
    }

    if (formData.clientName && formData.clientName.trim().length < 2) {
      errors.clientName = "Nome da conta deve ter pelo menos 2 caracteres";
    }

    setValidationErrors(errors);
  }, [formData]);

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
    setDebugLogs([]); // Limpar logs anteriores

    // Reset onboarding steps
    setOnboardingSteps({
      userCreated: false,
      userProfileCreated: false,
      clientCreated: false,
      clientProfileCreated: false,
      teamCreated: false,
      emailSent: false,
    });

    try {
      addDebugLog("🚀 Iniciando processo de registro...");

      // Validações mais robustas
      addDebugLog("Validando dados do formulário...");

      if (!formData.firstName.trim()) {
        throw new Error("Nome é obrigatório");
      }

      if (!formData.lastName.trim()) {
        throw new Error("Sobrenome é obrigatório");
      }

      if (!formData.clientName.trim()) {
        throw new Error("Nome da conta é obrigatório");
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

      addDebugLog("Validações concluídas com sucesso", "success");
      addDebugLog(`Tentando criar usuário: ${formData.email}`);

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

      addDebugLog(
        `Resposta do signup: ${
          data.user ? "Usuário criado" : "Falha na criação"
        }`
      );

      if (authError) {
        updateOnboardingStep("userCreated", false);
        addDebugLog(`Erro no signup: ${authError.message}`, "error");

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
        updateOnboardingStep("userCreated", true);
        addDebugLog(`Usuário criado com ID: ${data.user.id}`, "success");

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
          addDebugLog("Iniciando onboarding automático...");

          // Criar um onboarding service customizado com debug
          const customOnboardingService = {
            async completeOnboarding(user: any, data: OnboardingData) {
              addDebugLog("Criando perfil de usuário...");
              updateOnboardingStep("userProfileCreated", false);

              try {
                const { error: profileError } = await supabase
                  .schema("public")
                  .from("user_profiles")
                  .insert({
                    id: user.id,
                    user_type: "client_user",
                    status: "active",
                  });

                if (profileError) {
                  addDebugLog(
                    `Erro ao criar user_profile: ${profileError.message}`,
                    "error"
                  );
                  throw new Error(
                    `Erro ao criar perfil de usuário: ${profileError.message}`
                  );
                }

                updateOnboardingStep("userProfileCreated", true);
                addDebugLog("Perfil de usuário criado com sucesso", "success");

                // Criar cliente
                addDebugLog("Criando cliente...");
                updateOnboardingStep("clientCreated", false);

                const clientData = {
                  name: data.clientName,
                  client_type: data.clientType,
                  plan_type: data.planType,
                  status: "active",
                  max_users:
                    data.planType === "free"
                      ? 5
                      : data.planType === "pro"
                      ? 15
                      : 50,
                  max_projects:
                    data.planType === "free"
                      ? 3
                      : data.planType === "pro"
                      ? 10
                      : 50,
                  max_storage_gb:
                    data.planType === "free"
                      ? 0.1
                      : data.planType === "pro"
                      ? 5
                      : 20,
                  trial_ends_at:
                    data.planType === "free"
                      ? null
                      : new Date(
                          Date.now() + 14 * 24 * 60 * 60 * 1000
                        ).toISOString(),
                };

                const { data: client, error: clientError } = await supabase
                  .schema("client_data")
                  .from("clients")
                  .insert(clientData)
                  .select("id")
                  .single();

                if (clientError) {
                  addDebugLog(
                    `Erro ao criar cliente: ${clientError.message}`,
                    "error"
                  );
                  throw new Error(
                    `Erro ao criar cliente: ${clientError.message}`
                  );
                }

                updateOnboardingStep("clientCreated", true);
                addDebugLog(`Cliente criado com ID: ${client.id}`, "success");

                // Criar perfil de cliente
                addDebugLog("Criando perfil de cliente...");
                updateOnboardingStep("clientProfileCreated", false);

                const { error: clientProfileError } = await supabase
                  .schema("client_data")
                  .from("client_profiles")
                  .insert({
                    user_id: user.id,
                    client_id: client.id,
                    role: "client_owner",
                    first_name: data.firstName,
                    last_name: data.lastName,
                    is_active: true,
                    google_account_connected: false,
                  });

                if (clientProfileError) {
                  addDebugLog(
                    `Erro ao criar client_profile: ${clientProfileError.message}`,
                    "error"
                  );
                  throw new Error(
                    `Erro ao criar perfil de cliente: ${clientProfileError.message}`
                  );
                }

                updateOnboardingStep("clientProfileCreated", true);
                addDebugLog("Perfil de cliente criado com sucesso", "success");

                // Criar time padrão
                addDebugLog("Criando time padrão...");
                updateOnboardingStep("teamCreated", false);

                const teamName =
                  data.clientType === "personal"
                    ? `Meus Projetos - ${data.firstName}`
                    : `Equipe Principal - ${data.clientName}`;

                const { data: team, error: teamError } = await supabase
                  .schema("client_data")
                  .from("teams")
                  .insert({
                    client_id: client.id,
                    name: teamName,
                    description:
                      data.clientType === "personal"
                        ? "Espaço para projetos pessoais"
                        : "Time principal da empresa",
                    is_active: true,
                  })
                  .select("id")
                  .single();

                if (teamError) {
                  addDebugLog(
                    `Erro ao criar time: ${teamError.message}`,
                    "error"
                  );
                  throw new Error(
                    `Erro ao criar time padrão: ${teamError.message}`
                  );
                }

                updateOnboardingStep("teamCreated", true);
                addDebugLog(`Time criado com ID: ${team.id}`, "success");

                updateOnboardingStep("emailSent", true);
                addDebugLog("Onboarding completo!", "success");

                return { success: true, clientId: client.id, teamId: team.id };
              } catch (error) {
                addDebugLog(`Erro no onboarding: ${error}`, "error");
                throw error;
              }
            },
          };

          const onboardingResult =
            await customOnboardingService.completeOnboarding(
              data.user,
              onboardingData
            );

          addDebugLog(
            "🎉 Registro completo! Todas as estruturas criadas.",
            "success"
          );

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

          // Redirecionar após 5 segundos para dar tempo de ver os logs
          setTimeout(() => {
            window.location.href = "/login?message=account-created";
          }, 5000);
        } catch (onboardingError) {
          addDebugLog(`Erro no onboarding: ${onboardingError}`, "error");
          // Mesmo com erro no onboarding, conta foi criada
          setSuccess(
            "✅ Conta criada! Verifique seu email. Alguns dados podem precisar ser configurados no dashboard."
          );

          setTimeout(() => {
            window.location.href = "/login?message=account-created";
          }, 5000);
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

  const getClientTypeIcon = (type: string) => {
    switch (type) {
      case "personal":
        return <User className="h-5 w-5" />;
      case "company":
        return <Building className="h-5 w-5" />;
      case "organization":
        return <Users className="h-5 w-5" />;
      case "department":
        return <Briefcase className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "free":
        return "border-gray-300 bg-gray-50";
      case "pro":
        return "border-blue-300 bg-blue-50";
      case "business":
        return "border-purple-300 bg-purple-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">FocuSprint</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Crie sua conta e comece a usar nossa plataforma de gestão de
            projetos
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Criar Conta no FocuSprint
            </h2>
            <p className="text-gray-600">
              Preencha os dados abaixo para criar sua conta completa
            </p>
          </div>

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

          {/* Debug e Status do Onboarding */}
          {(loading || debugLogs.length > 0) && (
            <div className="mb-6 border border-gray-200 rounded-lg">
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                onClick={() => setShowDebug(!showDebug)}
              >
                <div className="flex items-center">
                  <div className="text-sm font-medium text-gray-700">
                    Status do Registro
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
                  {/* Steps do Onboarding */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        {onboardingSteps.userCreated ? (
                          <Check className="h-4 w-4 text-green-600 mr-2" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-gray-300 rounded mr-2"></div>
                        )}
                        Usuário Criado
                      </div>
                      <div className="flex items-center text-sm">
                        {onboardingSteps.userProfileCreated ? (
                          <Check className="h-4 w-4 text-green-600 mr-2" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-gray-300 rounded mr-2"></div>
                        )}
                        Perfil de Usuário
                      </div>
                      <div className="flex items-center text-sm">
                        {onboardingSteps.clientCreated ? (
                          <Check className="h-4 w-4 text-green-600 mr-2" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-gray-300 rounded mr-2"></div>
                        )}
                        Cliente Criado
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        {onboardingSteps.clientProfileCreated ? (
                          <Check className="h-4 w-4 text-green-600 mr-2" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-gray-300 rounded mr-2"></div>
                        )}
                        Perfil de Cliente
                      </div>
                      <div className="flex items-center text-sm">
                        {onboardingSteps.teamCreated ? (
                          <Check className="h-4 w-4 text-green-600 mr-2" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-gray-300 rounded mr-2"></div>
                        )}
                        Time Criado
                      </div>
                      <div className="flex items-center text-sm">
                        {onboardingSteps.emailSent ? (
                          <Check className="h-4 w-4 text-green-600 mr-2" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-gray-300 rounded mr-2"></div>
                        )}
                        Email Enviado
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Formulário */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Dados Pessoais
              </h3>

              <form onSubmit={handleEmailRegister} className="space-y-6">
                {/* Dados Pessoais */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Nome *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      className={`mt-2 block w-full h-12 px-4 py-3 border rounded-lg shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        validationErrors.firstName
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      placeholder="Seu nome"
                      required
                    />
                    {validationErrors.firstName && (
                      <p className="mt-1 text-xs text-red-600">
                        {validationErrors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Sobrenome *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      className={`mt-2 block w-full h-12 px-4 py-3 border rounded-lg shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        validationErrors.lastName
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      placeholder="Seu sobrenome"
                      required
                    />
                    {validationErrors.lastName && (
                      <p className="mt-1 text-xs text-red-600">
                        {validationErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`mt-2 block w-full h-12 px-4 py-3 border rounded-lg shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      validationErrors.email
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    placeholder="seu@email.com"
                    required
                  />
                  {validationErrors.email && (
                    <p className="mt-1 text-xs text-red-600">
                      {validationErrors.email}
                    </p>
                  )}
                </div>

                {/* Senhas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Senha *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        className={`mt-2 block w-full h-12 px-4 py-3 pr-12 border rounded-lg shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                          validationErrors.password
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                        placeholder="Sua senha"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <p className="mt-1 text-xs text-red-600">
                        {validationErrors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Confirmar Senha *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          handleInputChange("confirmPassword", e.target.value)
                        }
                        className={`mt-2 block w-full h-12 px-4 py-3 pr-12 border rounded-lg shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                          validationErrors.confirmPassword
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                        placeholder="Confirme sua senha"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {validationErrors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-600">
                        {validationErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tipo de Cliente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de Conta *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        value: "personal",
                        label: "Uso Pessoal",
                        desc: "Para projetos pessoais",
                      },
                      {
                        value: "company",
                        label: "Empresa",
                        desc: "Para empresas e negócios",
                      },
                      {
                        value: "organization",
                        label: "Organização",
                        desc: "ONGs, associações",
                      },
                      {
                        value: "department",
                        label: "Departamento",
                        desc: "Setor de uma empresa",
                      },
                    ].map((type) => (
                      <div
                        key={type.value}
                        className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all ${
                          formData.clientType === type.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() =>
                          handleInputChange("clientType", type.value)
                        }
                      >
                        <div className="flex items-center">
                          <div className="flex-shrink-0 mr-3">
                            {getClientTypeIcon(type.value)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {type.label}
                            </div>
                            <div className="text-xs text-gray-500">
                              {type.desc}
                            </div>
                          </div>
                          {formData.clientType === type.value && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nome da Conta/Empresa */}
                <div>
                  <label
                    htmlFor="clientName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    {formData.clientType === "personal"
                      ? "Nome da Conta *"
                      : formData.clientType === "company"
                      ? "Nome da Empresa *"
                      : formData.clientType === "organization"
                      ? "Nome da Organização *"
                      : "Nome do Departamento *"}
                  </label>
                  <input
                    type="text"
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) =>
                      handleInputChange("clientName", e.target.value)
                    }
                    className={`mt-2 block w-full h-12 px-4 py-3 border rounded-lg shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      validationErrors.clientName
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
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
                  {validationErrors.clientName && (
                    <p className="mt-1 text-xs text-red-600">
                      {validationErrors.clientName}
                    </p>
                  )}
                </div>

                {/* Botão de Submit */}
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !supabaseReady ||
                    Object.keys(validationErrors).length > 0
                  }
                  className="w-full h-12 flex justify-center items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Criando conta...
                    </div>
                  ) : (
                    "Criar Conta"
                  )}
                </button>
              </form>
            </div>

            {/* Seção de Planos */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Escolha seu Plano
              </h3>

              <div className="space-y-4">
                {[
                  {
                    id: "free",
                    name: "Free",
                    price: "Gratuito",
                    description: "Perfeito para começar",
                    features: [
                      "5 usuários",
                      "3 projetos",
                      "100MB storage",
                      "Suporte por email",
                    ],
                    popular: false,
                  },
                  {
                    id: "pro",
                    name: "Pro",
                    price: "R$ 97/mês",
                    description: "14 dias grátis",
                    features: [
                      "15 usuários",
                      "10 projetos",
                      "5GB storage",
                      "Videochamadas",
                      "Relatórios",
                    ],
                    popular: true,
                  },
                  {
                    id: "business",
                    name: "Business",
                    price: "R$ 399/mês",
                    description: "14 dias grátis",
                    features: [
                      "50 usuários",
                      "50 projetos",
                      "20GB storage",
                      "Integrações avançadas",
                      "Suporte prioritário",
                    ],
                    popular: false,
                  },
                ].map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.planType === plan.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    } ${getPlanColor(plan.id)}`}
                    onClick={() => handleInputChange("planType", plan.id)}
                  >
                    {plan.popular && (
                      <div className="absolute -top-2 left-4 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        Mais Popular
                      </div>
                    )}

                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {plan.name}
                          </h4>
                          {formData.planType === plan.id && (
                            <Check className="h-5 w-5 text-blue-600 ml-2" />
                          )}
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">
                          {plan.price}
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          {plan.description}
                        </div>
                        <ul className="space-y-1">
                          {plan.features.map((feature, index) => (
                            <li
                              key={index}
                              className="flex items-center text-sm text-gray-600"
                            >
                              <Check className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* GitHub Register */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleGithubRegister}
                  disabled={githubLoading}
                  className="w-full h-12 flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
                >
                  {githubLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-3"></div>
                  ) : (
                    <Github className="h-5 w-5 mr-3" />
                  )}
                  Continuar com GitHub
                </button>
                <p className="mt-3 text-sm text-gray-500 text-center">
                  GitHub login permite acesso rápido e seguro
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Link para Login */}
        <div className="mt-12 text-center">
          <p className="text-base text-gray-600">
            Já tem uma conta?{" "}
            <a
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Fazer login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
