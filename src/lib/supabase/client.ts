import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Verificação mais rigorosa das variáveis de ambiente
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Supabase environment variables missing:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      url: supabaseUrl ? "SET" : "MISSING",
      key: supabaseAnonKey ? "SET" : "MISSING",
    });

    // Em desenvolvimento, mostrar erro mais claro
    if (typeof window !== "undefined") {
      console.error(
        "🚨 Configure as variáveis de ambiente do Supabase no arquivo .env.local"
      );
    }

    // Retornar cliente com valores placeholder apenas para build
    return createBrowserClient<Database>(
      supabaseUrl || "https://placeholder.supabase.co",
      supabaseAnonKey || "placeholder-anon-key"
    );
  }

  console.log("✅ Supabase client initialized successfully");
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
};

// Para uso em componentes client
export const supabase = createClient();
