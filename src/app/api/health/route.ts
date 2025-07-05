import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
    };

    // Check if critical variables are missing
    const missingVars = Object.entries(envCheck)
      .filter(([key, value]) => key !== 'NODE_ENV' && key !== 'NEXT_PUBLIC_APP_URL' && !value)
      .map(([key]) => key);

    const status = missingVars.length === 0 ? 'healthy' : 'unhealthy';
    const statusCode = missingVars.length === 0 ? 200 : 500;

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      app_url: process.env.NEXT_PUBLIC_APP_URL || 'unknown',
      environment_variables: envCheck,
      missing_variables: missingVars,
      message: missingVars.length === 0 
        ? 'All required environment variables are configured'
        : `Missing ${missingVars.length} required environment variables: ${missingVars.join(', ')}`
    }, { status: statusCode });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Health check failed'
    }, { status: 500 });
  }
}
