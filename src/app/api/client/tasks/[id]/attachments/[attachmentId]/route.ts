import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/client/tasks/[id]/attachments/[attachmentId] - Download attachment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: taskId, attachmentId } = await params;

    console.log('🔍 Attachment download request:', { 
      taskId,
      attachmentId,
      userId: user.id 
    });

    // Get attachment details using RPC function
    const { data: attachments, error: attachmentError } = await supabase.rpc('get_task_attachments', {
      p_task_id: taskId,
      p_user_id: user.id
    });

    if (attachmentError) {
      console.error('Error fetching attachment:', attachmentError);
      return NextResponse.json({ error: 'Failed to fetch attachment' }, { status: 500 });
    }

    const attachment = attachments?.find((a: any) => a.id === attachmentId);

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Get signed URL for download
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('focusprint')
      .createSignedUrl(attachment.storage_path, 3600); // 1 hour expiry

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    return NextResponse.json({ 
      downloadUrl: signedUrlData.signedUrl,
      fileName: attachment.file_name,
      fileSize: attachment.file_size,
      fileType: attachment.file_type
    });

  } catch (error) {
    console.error('Attachment download API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/client/tasks/[id]/attachments/[attachmentId] - Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: taskId, attachmentId } = await params;

    console.log('🔍 Attachment delete request:', { 
      taskId,
      attachmentId,
      userId: user.id 
    });

    // Delete attachment using RPC function (returns storage path for cleanup)
    const { data: deletedAttachment, error: deleteError } = await supabase.rpc('delete_task_attachment', {
      p_attachment_id: attachmentId,
      p_user_id: user.id
    });

    if (deleteError) {
      console.error('Error deleting attachment:', deleteError);
      return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
    }

    if (!deletedAttachment || deletedAttachment.length === 0) {
      return NextResponse.json({ error: 'Attachment not found or access denied' }, { status: 404 });
    }

    const storagePath = deletedAttachment[0].storage_path;

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('focusprint')
      .remove([storagePath]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      // Note: We don't return an error here as the database record was already deleted
    }

    return NextResponse.json({ message: 'Attachment deleted successfully' });

  } catch (error) {
    console.error('Attachment delete API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
