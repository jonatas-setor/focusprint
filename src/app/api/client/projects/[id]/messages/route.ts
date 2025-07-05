import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateClientAccess } from '@/lib/auth/server';

// GET /api/client/projects/[id]/messages - List project messages
export async function GET(
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate client access (handles both regular users and super admins)
    const accessResult = await validateClientAccess();
    if ('error' in accessResult) {
      return NextResponse.json({ error: accessResult.error }, { status: accessResult.status });
    }

    const { profile: userProfile, isSuperAdmin } = accessResult;

    // Verify user has access to the project using RPC function
    const { data: projectData, error: accessError } = await supabase
      .rpc('get_project_by_id', {
        p_project_id: projectId,
        p_user_id: user.id
      });

    const project = projectData?.[0] || null;

    if (accessError || !project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Get messages for the project using RPC function
    const { data: messages, error: messagesError } = await supabase
      .rpc('get_project_messages', {
        p_project_id: projectId,
        p_limit: limit,
        p_offset: offset
      });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({ 
      messages: messages || [],
      pagination: {
        limit,
        offset,
        total: messages?.length || 0
      }
    });

  } catch (error) {
    console.error('Messages API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/client/projects/[id]/messages - Send message
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
    const body = await request.json();
    const { 
      content, 
      message_type, 
      meet_link, 
      referenced_task_id, 
      thread_id 
    } = body;

    // Validate required fields
    if (!content) {
      return NextResponse.json({ 
        error: 'Missing required field: content is required' 
      }, { status: 400 });
    }

    // Validate client access (handles both regular users and super admins)
    const accessResult = await validateClientAccess();
    if ('error' in accessResult) {
      return NextResponse.json({ error: accessResult.error }, { status: accessResult.status });
    }

    const { profile: userProfile, isSuperAdmin } = accessResult;

    // Verify user has access to the project using RPC function
    const { data: projectData, error: accessError } = await supabase
      .rpc('get_project_by_id', {
        p_project_id: projectId,
        p_user_id: user.id
      });

    const project = projectData?.[0] || null;

    if (accessError || !project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Create the message using RPC function
    const { data: message, error: messageError } = await supabase
      .rpc('create_message', {
        p_project_id: projectId,
        p_user_id: user.id,
        p_content: content,
        p_message_type: message_type || 'text',
        p_meet_link: meet_link,
        p_referenced_task_id: referenced_task_id,
        p_thread_id: thread_id
      });

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }

    return NextResponse.json({ message }, { status: 201 });

  } catch (error) {
    console.error('Message creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
