import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";

export const createClient = () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://tuyeqoudkeufkxtkupuh.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eWVxb3Vka2V1Zmt4dGt1cHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NjU2MzQsImV4cCI6MjA2MzU0MTYzNH0.0I9YIT1iTmE4Zwl-Dtptnn5LzE7I4GBYAKsLNSLjUYQ";

  // Log das configurações (sem expor a chave completa)
  console.log("🔧 Supabase configuration:", {
    url: supabaseUrl,
    keyPrefix: supabaseAnonKey.substring(0, 20) + "...",
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
  });

  // Verificação de segurança
  if (
    supabaseUrl.includes("placeholder") ||
    supabaseAnonKey.includes("placeholder")
  ) {
    console.error("❌ Supabase usando valores placeholder!");
    if (typeof window !== "undefined") {
      console.error("🚨 Configure as variáveis de ambiente do Supabase");
    }
  }

  console.log("✅ Supabase client initialized successfully");

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        "X-Client-Info": "focusprint-web",
      },
    },
  });
};

// Para uso em componentes client
export const supabase = createClient();
