import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/google/callback - Handle Google OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // User ID
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(new URL('/dashboard?error=google_auth_failed', request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard?error=invalid_callback', request.url));
    }

    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      console.error('Google OAuth not configured');
      return NextResponse.redirect(new URL('/dashboard?error=oauth_not_configured', request.url));
    }

    const supabase = await createClient();

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      console.error('No refresh token received from Google');
      return NextResponse.redirect(new URL('/dashboard?error=no_refresh_token', request.url));
    }

    // Update user profile with Google connection
    const { error: updateError } = await supabase
      .schema('client_data')
      .from('client_profiles')
      .update({
        google_account_connected: true,
        google_refresh_token: tokens.refresh_token,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', state);

    if (updateError) {
      console.error('Error updating client profile:', updateError);
      return NextResponse.redirect(new URL('/dashboard?error=profile_update_failed', request.url));
    }

    return NextResponse.redirect(new URL('/dashboard?success=google_connected', request.url));

  } catch (error) {
    console.error('Google callback API error:', error);
    return NextResponse.redirect(new URL('/dashboard?error=callback_failed', request.url));
  }
}
