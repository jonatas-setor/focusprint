import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { validateClientAccess } from '@/lib/auth/server';

/**
 * POST /api/client/projects/[id]/meet - Create Google Meet for project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Validate client access
    const accessResult = await validateClientAccess();
    if ('error' in accessResult) {
      return NextResponse.json({ error: accessResult.error }, { status: accessResult.status });
    }

    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Google OAuth not configured' },
        { status: 500 }
      );
    }

    // Get user's Google credentials
    const { data: profile, error: profileError } = await supabase
      .schema('client_data')
      .from('client_profiles')
      .select('google_account_connected, google_refresh_token')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.google_account_connected || !profile?.google_refresh_token) {
      return NextResponse.json(
        { error: 'Google account not connected' },
        { status: 400 }
      );
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    if (projectError) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: profile.google_refresh_token
    });

    // Create Google Calendar event with Meet
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const now = new Date();
    const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    const event = {
      summary: `Reunião - ${project.name}`,
      description: `Reunião do projeto ${project.name} criada via FocuSprint`,
      start: {
        dateTime: now.toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${projectId}-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1
    });

    const meetLink = response.data.conferenceData?.entryPoints?.[0]?.uri;

    if (!meetLink) {
      throw new Error('Failed to create Meet link');
    }

    return NextResponse.json({ meetLink });

  } catch (error) {
    console.error('Google Meet creation API error:', error);
    return NextResponse.json(
      { error: 'Failed to create Google Meet' },
      { status: 500 }
    );
  }
}
