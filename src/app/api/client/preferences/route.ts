import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/client/preferences - Get user preferences
export async function GET(request: NextRequest) {
  console.log('🎨 [PREFERENCES API] GET request started');
  
  try {
    const supabase = await createClient();

    console.log('🔍 [PREFERENCES API] Supabase client created:', { hasAuth: !!supabase.auth });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [PREFERENCES API] Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('👤 [PREFERENCES API] User authenticated:', { user_id: user.id });

    // Get user preferences using the database function
    const { data: preferences, error: preferencesError } = await supabase
      .rpc('get_user_preferences', { p_user_id: user.id });

    if (preferencesError) {
      console.error('❌ [PREFERENCES API] Error fetching preferences:', preferencesError);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    console.log('✅ [PREFERENCES API] Preferences fetched successfully');

    return NextResponse.json({
      success: true,
      preferences: preferences || {}
    });

  } catch (error) {
    console.error('❌ [PREFERENCES API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/client/preferences - Update user preferences
export async function PATCH(request: NextRequest) {
  console.log('🎨 [PREFERENCES API] PATCH request started');
  
  try {
    const supabase = await createClient();

    console.log('🔍 [PREFERENCES API] PATCH - Supabase client created:', { hasAuth: !!supabase.auth });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [PREFERENCES API] Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('👤 [PREFERENCES API] User authenticated:', { user_id: user.id });

    // Parse request body
    const body = await request.json();
    const { preferences: preferencesUpdate } = body;

    if (!preferencesUpdate || typeof preferencesUpdate !== 'object') {
      console.error('❌ [PREFERENCES API] Invalid preferences data:', preferencesUpdate);
      return NextResponse.json(
        { error: 'Invalid preferences data provided' },
        { status: 400 }
      );
    }

    console.log('📝 [PREFERENCES API] Updating preferences:', {
      user_id: user.id,
      update_keys: Object.keys(preferencesUpdate)
    });

    // Update user preferences using the database function
    const { data: updatedPreferences, error: updateError } = await supabase
      .rpc('update_user_preferences', {
        p_user_id: user.id,
        p_preferences_update: preferencesUpdate
      });

    if (updateError) {
      console.error('❌ [PREFERENCES API] Error updating preferences:', updateError);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    console.log('✅ [PREFERENCES API] Preferences updated successfully');

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences
    });

  } catch (error) {
    console.error('❌ [PREFERENCES API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/client/preferences - Replace all user preferences
export async function PUT(request: NextRequest) {
  console.log('🎨 [PREFERENCES API] PUT request started');
  
  try {
    const supabase = await createClient();

    console.log('🔍 [PREFERENCES API] PUT - Supabase client created:', { hasAuth: !!supabase.auth });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [PREFERENCES API] Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('👤 [PREFERENCES API] User authenticated:', { user_id: user.id });

    // Parse request body
    const body = await request.json();
    const { preferences: newPreferences } = body;

    if (!newPreferences || typeof newPreferences !== 'object') {
      console.error('❌ [PREFERENCES API] Invalid preferences data:', newPreferences);
      return NextResponse.json(
        { error: 'Invalid preferences data provided' },
        { status: 400 }
      );
    }

    console.log('🔄 [PREFERENCES API] Replacing all preferences:', {
      user_id: user.id,
      sections: Object.keys(newPreferences)
    });

    // Replace all preferences by updating the client_profiles table directly
    const { data: updatedProfile, error: updateError } = await supabase
      .schema('client_data')
      .from('client_profiles')
      .update({
        preferences: newPreferences,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select('preferences')
      .single();

    if (updateError) {
      console.error('❌ [PREFERENCES API] Error replacing preferences:', updateError);
      return NextResponse.json(
        { error: 'Failed to replace preferences' },
        { status: 500 }
      );
    }

    console.log('✅ [PREFERENCES API] Preferences replaced successfully');

    return NextResponse.json({
      success: true,
      preferences: updatedProfile.preferences
    });

  } catch (error) {
    console.error('❌ [PREFERENCES API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/client/preferences - Reset preferences to defaults
export async function DELETE(request: NextRequest) {
  console.log('🎨 [PREFERENCES API] DELETE request started');
  
  try {
    const supabase = await createClient();

    console.log('🔍 [PREFERENCES API] DELETE - Supabase client created:', { hasAuth: !!supabase.auth });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [PREFERENCES API] Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('👤 [PREFERENCES API] User authenticated:', { user_id: user.id });

    // Get default preferences
    const { data: defaultPreferences, error: defaultError } = await supabase
      .rpc('get_default_user_preferences');

    if (defaultError) {
      console.error('❌ [PREFERENCES API] Error getting defaults:', defaultError);
      return NextResponse.json(
        { error: 'Failed to get default preferences' },
        { status: 500 }
      );
    }

    // Reset to default preferences
    const { data: updatedProfile, error: updateError } = await supabase
      .schema('client_data')
      .from('client_profiles')
      .update({
        preferences: defaultPreferences,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select('preferences')
      .single();

    if (updateError) {
      console.error('❌ [PREFERENCES API] Error resetting preferences:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset preferences' },
        { status: 500 }
      );
    }

    console.log('✅ [PREFERENCES API] Preferences reset to defaults successfully');

    return NextResponse.json({
      success: true,
      preferences: updatedProfile.preferences,
      message: 'Preferences reset to defaults'
    });

  } catch (error) {
    console.error('❌ [PREFERENCES API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
