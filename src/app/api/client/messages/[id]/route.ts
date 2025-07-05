import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PUT /api/client/messages/[id] - Edit message
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.id;
    const body = await request.json();
    const { content } = body;

    // Validate required fields
    if (!content) {
      return NextResponse.json({ 
        error: 'Missing required field: content is required' 
      }, { status: 400 });
    }

    // Verify user has access to the message and owns it
    const { data: message, error: accessError } = await supabase
      .from('messages')
      .select(`
        id,
        user_id,
        project_id,
        projects!inner(
          teams!inner(client_id)
        )
      `)
      .eq('id', messageId)
      .eq('user_id', user.id) // User can only edit their own messages
      .eq('projects.teams.client_id', user.id)
      .single();

    if (accessError || !message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 403 });
    }

    // Update the message
    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({ 
        content,
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select(`
        id,
        project_id,
        user_id,
        content,
        message_type,
        meet_link,
        referenced_task_id,
        thread_id,
        is_edited,
        created_at,
        updated_at,
        tasks(
          id,
          title
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating message:', updateError);
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    return NextResponse.json({ message: updatedMessage });

  } catch (error) {
    console.error('Message update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/client/messages/[id] - Delete message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.id;

    // Verify user has access to the message and owns it
    const { data: message, error: accessError } = await supabase
      .from('messages')
      .select(`
        id,
        user_id,
        project_id,
        projects!inner(
          teams!inner(client_id)
        )
      `)
      .eq('id', messageId)
      .eq('user_id', user.id) // User can only delete their own messages
      .eq('projects.teams.client_id', user.id)
      .single();

    if (accessError || !message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 403 });
    }

    // Check if there are replies to this message
    const { data: replies, error: repliesError } = await supabase
      .from('messages')
      .select('id')
      .eq('thread_id', messageId);

    if (repliesError) {
      console.error('Error checking replies:', repliesError);
    }

    if (replies && replies.length > 0) {
      // If there are replies, just mark the message as deleted instead of removing it
      const { data: updatedMessage, error: updateError } = await supabase
        .from('messages')
        .update({ 
          content: '[Message deleted]',
          message_type: 'system',
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select(`
          id,
          project_id,
          user_id,
          content,
          message_type,
          meet_link,
          referenced_task_id,
          thread_id,
          is_edited,
          created_at,
          updated_at
        `)
        .single();

      if (updateError) {
        console.error('Error marking message as deleted:', updateError);
        return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
      }

      return NextResponse.json({ 
        message: updatedMessage,
        deleted: false,
        reason: 'Message has replies, marked as deleted instead'
      });
    } else {
      // No replies, safe to delete completely
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (deleteError) {
        console.error('Error deleting message:', deleteError);
        return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'Message deleted successfully',
        deleted: true
      });
    }

  } catch (error) {
    console.error('Message delete API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
