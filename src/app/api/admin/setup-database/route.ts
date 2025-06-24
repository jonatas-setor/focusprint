import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Create clients table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'business')),
        max_users INTEGER NOT NULL DEFAULT 5,
        max_projects INTEGER NOT NULL DEFAULT 3,
        stripe_customer_id TEXT,
        cnpj TEXT,
        phone TEXT,
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: createError } = await supabase.rpc('exec', { sql: createTableSQL });
    
    if (createError) {
      console.error('Error creating table:', createError);
      return NextResponse.json({ error: 'Failed to create table', details: createError }, { status: 500 });
    }

    // Enable RLS
    const enableRLSSQL = `ALTER TABLE clients ENABLE ROW LEVEL SECURITY;`;
    const { error: rlsError } = await supabase.rpc('exec', { sql: enableRLSSQL });
    
    if (rlsError) {
      console.log('RLS enable error (may already be enabled):', rlsError);
    }

    // Create RLS policy
    const createPolicySQL = `
      CREATE POLICY IF NOT EXISTS "Platform admins can manage clients" ON clients
        FOR ALL USING (auth.email() LIKE '%@focusprint.com');
    `;
    
    const { error: policyError } = await supabase.rpc('exec', { sql: createPolicySQL });
    
    if (policyError) {
      console.log('Policy creation error (may already exist):', policyError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database setup completed successfully' 
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      error: 'Setup failed', 
      details: error 
    }, { status: 500 });
  }
}
