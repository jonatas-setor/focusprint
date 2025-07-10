import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { SessionTimeoutService } from "@/lib/auth/session-timeout";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create Supabase client for middleware with fallbacks
  const response = NextResponse.next();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://tuyeqoudkeufkxtkupuh.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eWVxb3Vka2V1Zmt4dGt1cHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NjU2MzQsImV4cCI6MjA2MzU0MTYzNH0.0I9YIT1iTmE4Zwl-Dtptnn5LzE7I4GBYAKsLNSLjUYQ";

  // Skip middleware if environment variables are not properly set (build time)
  if (
    supabaseUrl.includes("placeholder") ||
    supabaseAnonKey.includes("placeholder")
  ) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Platform Admin routes (both pages and APIs)
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return adminMiddleware(request, response, supabase);
  }

  // Client Dashboard routes
  if (pathname.startsWith("/dashboard")) {
    return clientMiddleware(request, response);
  }

  // Auth routes
  if (pathname.startsWith("/auth")) {
    return authMiddleware(request, response);
  }

  // Allow all other routes (landing page, etc.)
  return response;
}

async function adminMiddleware(
  request: NextRequest,
  response: NextResponse,
  supabase: ReturnType<typeof createServerClient<Database>>
) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/admin");

  // Allow access to session timeout API (login is handled outside admin routes)
  if (pathname.startsWith("/api/admin/session/")) {
    return response;
  }

  try {
    // Check if user is authenticated
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      // Not authenticated
      if (isApiRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/admin-login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Check if email is from authorized domain
    if (!user.email || !user.email.endsWith("@focusprint.com")) {
      // Not a platform admin
      if (isApiRoute) {
        return NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 }
        );
      }
      const loginUrl = new URL("/admin-login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has admin profile
    const { data: adminProfile, error: profileError } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !adminProfile) {
      // No admin profile
      if (isApiRoute) {
        return NextResponse.json(
          { error: "Forbidden - Admin profile required" },
          { status: 403 }
        );
      }
      const loginUrl = new URL("/admin-login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // CRITICAL: Check session timeout (PRD Section 3.2.1 - 30 minutes)
    // First, check if session exists - if not, create it (handles fresh logins)
    let session = SessionTimeoutService.getSession(user.id);
    if (!session) {
      // User is authenticated but no session exists - create one
      session = SessionTimeoutService.createSession(user.id, user.email || "");
    }

    // Now check if the session is valid (not expired)
    if (!SessionTimeoutService.isSessionValid(user.id)) {
      // Session expired - invalidate and redirect to login
      SessionTimeoutService.invalidateSession(user.id);
      if (isApiRoute) {
        return NextResponse.json({ error: "Session expired" }, { status: 401 });
      }
      const loginUrl = new URL(
        "/admin-login?reason=session_expired",
        request.url
      );
      return NextResponse.redirect(loginUrl);
    }

    // Update session activity (reset 30-minute timer)
    SessionTimeoutService.updateActivity(user.id);

    // All checks passed - allow access
    return response;
  } catch (err) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
    const loginUrl = new URL("/admin-login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

async function clientMiddleware(request: NextRequest, response: NextResponse) {
  const { pathname } = request.nextUrl;

  // Create Supabase client for middleware
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://tuyeqoudkeufkxtkupuh.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eWVxb3Vka2V1Zmt4dGt1cHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NjU2MzQsImV4cCI6MjA2MzU0MTYzNH0.0I9YIT1iTmE4Zwl-Dtptnn5LzE7I4GBYAKsLNSLjUYQ";

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    console.log(`🔍 [MIDDLEWARE] Checking dashboard access for: ${pathname}`);

    // Check if user is authenticated
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    console.log(`🔍 [MIDDLEWARE] Auth check result:`, {
      hasUser: !!user,
      hasError: !!error,
      userId: user?.id,
      email: user?.email,
      emailConfirmed: !!user?.email_confirmed_at,
      errorMessage: error?.message,
    });

    if (error || !user) {
      console.log(`❌ [MIDDLEWARE] Not authenticated, redirecting to login`);
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Check if email is confirmed
    if (!user.email_confirmed_at) {
      console.log(
        `❌ [MIDDLEWARE] Email not confirmed, redirecting to confirmation`
      );
      const confirmUrl = new URL("/auth/confirm-email", request.url);
      return NextResponse.redirect(confirmUrl);
    }

    console.log(
      `✅ [MIDDLEWARE] User authenticated and confirmed, allowing access`
    );
    return response;
  } catch (err) {
    console.error("❌ [MIDDLEWARE] Client middleware error:", err);
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

async function authMiddleware(request: NextRequest, response: NextResponse) {
  const { pathname } = request.nextUrl;

  // Create Supabase client for middleware
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://tuyeqoudkeufkxtkupuh.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eWVxb3Vka2V1Zmt4dGt1cHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NjU2MzQsImV4cCI6MjA2MzU0MTYzNH0.0I9YIT1iTmE4Zwl-Dtptnn5LzE7I4GBYAKsLNSLjUYQ";

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    // Check if user is already authenticated
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user && user.email_confirmed_at) {
      // User is authenticated and email is confirmed
      // Redirect to dashboard instead of showing auth pages
      if (pathname === "/login" || pathname === "/register") {
        const dashboardUrl = new URL("/dashboard", request.url);
        return NextResponse.redirect(dashboardUrl);
      }
    }

    return response;
  } catch (err) {
    console.error("Auth middleware error:", err);
    return response;
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*",
    "/api/dashboard/:path*",
    "/auth/:path*",
  ],
};
