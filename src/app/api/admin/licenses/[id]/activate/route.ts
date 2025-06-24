import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Create Supabase server client
async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

async function checkAdminAuth(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const adminEmails = ['admin@focusprint.com', 'atendimento.setor@gmail.com'];
  if (!user.email || !adminEmails.includes(user.email)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { user };
}

// POST /api/admin/licenses/[id]/activate - Activate license
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const authResult = await checkAdminAuth(supabase);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get current license to preserve metadata
    const { data: currentLicense, error: fetchError } = await supabase
      .schema('platform_admin')
      .from('licenses')
      .select('metadata')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'License not found' }, { status: 404 });
      }
      console.error('Error fetching license:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch license' }, { status: 500 });
    }

    // Update metadata to track activation
    const updatedMetadata = {
      ...currentLicense.metadata,
      activated_at: new Date().toISOString(),
      activated_by: authResult.user.email,
      // Remove suspension info if present
      suspension_reason: undefined,
      suspended_at: undefined,
      suspended_by: undefined
    };

    // Update license status to active
    const { data: license, error } = await supabase
      .schema('platform_admin')
      .from('licenses')
      .update({ 
        status: 'active',
        metadata: updatedMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error activating license:', error);
      return NextResponse.json({ error: 'Failed to activate license' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'License activated successfully',
      license 
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
