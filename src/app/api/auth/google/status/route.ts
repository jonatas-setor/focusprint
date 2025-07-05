import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/google/status - Check if user has Google account connected
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has Google account connected
    const { data: profile, error: profileError } = await supabase
      .from('client_data.client_profiles')
      .select('google_account_connected, google_refresh_token')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching client profile:', profileError);
      return NextResponse.json({ connected: false });
    }

    const connected = !!(profile?.google_account_connected && profile?.google_refresh_token);

    return NextResponse.json({ connected });

  } catch (error) {
    console.error('Google status API error:', error);
    return NextResponse.json({ connected: false });
  }
}
