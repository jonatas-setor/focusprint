import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Valid preference sections
const VALID_SECTIONS = [
  'kanban',
  'chat', 
  'dashboard',
  'notifications',
  'appearance',
  'workflow',
  'mobile'
];

// GET /api/client/preferences/[section] - Get specific preference section
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  console.log('🎨 [PREFERENCES SECTION API] GET request started for section:', section);

  try {

    // Validate section
    if (!VALID_SECTIONS.includes(section)) {
      console.error('❌ [PREFERENCES SECTION API] Invalid section:', section);
      return NextResponse.json(
        { error: `Invalid section. Valid sections: ${VALID_SECTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    console.log('🔍 [PREFERENCES SECTION API] GET - Supabase client created:', { hasAuth: !!supabase.auth });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [PREFERENCES SECTION API] Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('👤 [PREFERENCES SECTION API] User authenticated:', { user_id: user.id });

    // Get user preferences
    const { data: preferences, error: preferencesError } = await supabase
      .rpc('get_user_preferences', { p_user_id: user.id });

    if (preferencesError) {
      console.error('❌ [PREFERENCES SECTION API] Error fetching preferences:', preferencesError);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    const sectionPreferences = preferences?.[section] || {};

    console.log('✅ [PREFERENCES SECTION API] Section preferences fetched successfully:', {
      section,
      keys: Object.keys(sectionPreferences)
    });

    return NextResponse.json({
      success: true,
      section,
      preferences: sectionPreferences
    });

  } catch (error) {
    console.error('❌ [PREFERENCES SECTION API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/client/preferences/[section] - Update specific preference section
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  console.log('🎨 [PREFERENCES SECTION API] PATCH request started for section:', section);

  try {

    // Validate section
    if (!VALID_SECTIONS.includes(section)) {
      console.error('❌ [PREFERENCES SECTION API] Invalid section:', section);
      return NextResponse.json(
        { error: `Invalid section. Valid sections: ${VALID_SECTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    console.log('🔍 [PREFERENCES SECTION API] PATCH - Supabase client created:', { hasAuth: !!supabase.auth });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [PREFERENCES SECTION API] Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('👤 [PREFERENCES SECTION API] User authenticated:', { user_id: user.id });

    // Parse request body
    const body = await request.json();
    const { preferences: sectionUpdate } = body;

    if (!sectionUpdate || typeof sectionUpdate !== 'object') {
      console.error('❌ [PREFERENCES SECTION API] Invalid preferences data:', sectionUpdate);
      return NextResponse.json(
        { error: 'Invalid preferences data provided' },
        { status: 400 }
      );
    }

    console.log('📝 [PREFERENCES SECTION API] Updating section preferences:', {
      user_id: user.id,
      section,
      update_keys: Object.keys(sectionUpdate)
    });

    // Create the update object with the section
    const preferencesUpdate = {
      [section]: sectionUpdate
    };

    // Update user preferences using the database function
    const { data: updatedPreferences, error: updateError } = await supabase
      .rpc('update_user_preferences', {
        p_user_id: user.id,
        p_preferences_update: preferencesUpdate
      });

    if (updateError) {
      console.error('❌ [PREFERENCES SECTION API] Error updating preferences:', updateError);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    const updatedSectionPreferences = updatedPreferences?.[section] || {};

    console.log('✅ [PREFERENCES SECTION API] Section preferences updated successfully');

    return NextResponse.json({
      success: true,
      section,
      preferences: updatedSectionPreferences,
      full_preferences: updatedPreferences
    });

  } catch (error) {
    console.error('❌ [PREFERENCES SECTION API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/client/preferences/[section] - Replace specific preference section
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  console.log('🎨 [PREFERENCES SECTION API] PUT request started for section:', section);

  try {

    // Validate section
    if (!VALID_SECTIONS.includes(section)) {
      console.error('❌ [PREFERENCES SECTION API] Invalid section:', section);
      return NextResponse.json(
        { error: `Invalid section. Valid sections: ${VALID_SECTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    console.log('🔍 [PREFERENCES SECTION API] PUT - Supabase client created:', { hasAuth: !!supabase.auth });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [PREFERENCES SECTION API] Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('👤 [PREFERENCES SECTION API] User authenticated:', { user_id: user.id });

    // Parse request body
    const body = await request.json();
    const { preferences: newSectionPreferences } = body;

    if (!newSectionPreferences || typeof newSectionPreferences !== 'object') {
      console.error('❌ [PREFERENCES SECTION API] Invalid preferences data:', newSectionPreferences);
      return NextResponse.json(
        { error: 'Invalid preferences data provided' },
        { status: 400 }
      );
    }

    console.log('🔄 [PREFERENCES SECTION API] Replacing section preferences:', {
      user_id: user.id,
      section,
      keys: Object.keys(newSectionPreferences)
    });

    // Get current preferences first
    const { data: currentPreferences, error: getCurrentError } = await supabase
      .rpc('get_user_preferences', { p_user_id: user.id });

    if (getCurrentError) {
      console.error('❌ [PREFERENCES SECTION API] Error getting current preferences:', getCurrentError);
      return NextResponse.json(
        { error: 'Failed to get current preferences' },
        { status: 500 }
      );
    }

    // Replace the specific section
    const updatedPreferences = {
      ...currentPreferences,
      [section]: newSectionPreferences
    };

    // Update the full preferences
    const { data: updatedProfile, error: updateError } = await supabase
      .schema('client_data')
      .from('client_profiles')
      .update({
        preferences: updatedPreferences,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select('preferences')
      .single();

    if (updateError) {
      console.error('❌ [PREFERENCES SECTION API] Error replacing section preferences:', updateError);
      return NextResponse.json(
        { error: 'Failed to replace section preferences' },
        { status: 500 }
      );
    }

    const finalSectionPreferences = updatedProfile.preferences?.[section] || {};

    console.log('✅ [PREFERENCES SECTION API] Section preferences replaced successfully');

    return NextResponse.json({
      success: true,
      section,
      preferences: finalSectionPreferences,
      full_preferences: updatedProfile.preferences
    });

  } catch (error) {
    console.error('❌ [PREFERENCES SECTION API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
