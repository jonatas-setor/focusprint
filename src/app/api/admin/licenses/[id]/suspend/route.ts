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

// POST /api/admin/licenses/[id]/suspend - Suspend license
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

    const body = await request.json();
    const { reason } = body;

    // Update license status to suspended
    const { data: license, error } = await supabase
      .schema('platform_admin')
      .from('licenses')
      .update({ 
        status: 'suspended',
        metadata: {
          suspension_reason: reason || 'Administrative action',
          suspended_at: new Date().toISOString(),
          suspended_by: authResult.user.email
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'License not found' }, { status: 404 });
      }
      console.error('Error suspending license:', error);
      return NextResponse.json({ error: 'Failed to suspend license' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'License suspended successfully',
      license 
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
