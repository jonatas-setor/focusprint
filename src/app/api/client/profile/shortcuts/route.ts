import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateClientAccess } from '@/lib/auth/server';
import { z } from 'zod';

// Validation schema for shortcuts configuration
const ShortcutsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  custom_shortcuts: z.record(z.string(), z.string()).default({}),
  disabled_shortcuts: z.array(z.string()).default([])
});

// GET /api/client/profile/shortcuts - Get user shortcuts preferences
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Validate client access
    const authResult = await validateClientAccess();
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { profile } = authResult;

    // Get shortcuts configuration from the user's profile
    const shortcutsConfig = profile?.shortcuts_config || {
      enabled: true,
      custom_shortcuts: {},
      disabled_shortcuts: []
    };

    return NextResponse.json({ shortcuts: shortcutsConfig });

  } catch (error) {
    console.error('Get shortcuts preferences API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/client/profile/shortcuts - Update user shortcuts preferences
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Validate client access
    const authResult = await validateClientAccess();
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { profile } = authResult;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ShortcutsConfigSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid shortcuts configuration',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const shortcutsConfig = validationResult.data;

    // Update user profile with new shortcuts preferences
    const { data: updatedProfile, error: updateError } = await supabase
      .from('client_profiles')
      .update({
        shortcuts_config: shortcutsConfig,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', profile.user_id)
      .select('shortcuts_config')
      .single();

    if (updateError) {
      console.error('Error updating shortcuts preferences:', updateError);
      return NextResponse.json({ error: 'Failed to update shortcuts preferences' }, { status: 500 });
    }

    // Return the updated shortcuts configuration
    const updatedShortcuts = updatedProfile?.shortcuts_config || shortcutsConfig;

    return NextResponse.json({ 
      message: 'Shortcuts preferences updated successfully',
      shortcuts: updatedShortcuts 
    });

  } catch (error) {
    console.error('Update shortcuts preferences API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
