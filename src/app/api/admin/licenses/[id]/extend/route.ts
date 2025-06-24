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

// POST /api/admin/licenses/[id]/extend - Extend trial period
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
    const { days = 30, reason } = body;

    // Validate days parameter
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return NextResponse.json({ 
        error: 'Invalid days parameter. Must be between 1 and 365' 
      }, { status: 400 });
    }

    // Get current license
    const { data: currentLicense, error: fetchError } = await supabase
      .schema('platform_admin')
      .from('licenses')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'License not found' }, { status: 404 });
      }
      console.error('Error fetching license:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch license' }, { status: 500 });
    }

    // Calculate new trial end date
    const currentTrialEnd = currentLicense.trial_ends_at 
      ? new Date(currentLicense.trial_ends_at)
      : new Date();
    
    const newTrialEnd = new Date(currentTrialEnd);
    newTrialEnd.setDate(newTrialEnd.getDate() + days);

    // Update metadata to track extension
    const updatedMetadata = {
      ...currentLicense.metadata,
      trial_extended_at: new Date().toISOString(),
      trial_extended_by: authResult.user.email,
      trial_extension_days: days,
      trial_extension_reason: reason || 'Administrative extension'
    };

    // Update license with extended trial
    const { data: license, error } = await supabase
      .schema('platform_admin')
      .from('licenses')
      .update({ 
        status: 'trial',
        trial_ends_at: newTrialEnd.toISOString(),
        metadata: updatedMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error extending trial:', error);
      return NextResponse.json({ error: 'Failed to extend trial' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Trial extended by ${days} days successfully`,
      license,
      new_trial_end: newTrialEnd.toISOString()
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
