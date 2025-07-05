import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/client/tasks/[id]/attachments - Get task attachments
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

    const { id: taskId } = await params;

    console.log('🔍 Attachments request:', { 
      taskId,
      userId: user.id 
    });

    // Get task attachments using RPC function
    const { data: attachments, error: attachmentsError } = await supabase.rpc('get_task_attachments', {
      p_task_id: taskId,
      p_user_id: user.id
    });

    if (attachmentsError) {
      console.error('Error fetching attachments:', attachmentsError);
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }

    return NextResponse.json({ attachments: attachments || [] });

  } catch (error) {
    console.error('Attachments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/client/tasks/[id]/attachments - Upload task attachment
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

    const { id: taskId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    console.log('🔍 File upload request:', { 
      taskId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId: user.id 
    });

    // Generate unique file path
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const storagePath = `tasks/${taskId}/${fileName}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('focusprint')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Create attachment record using RPC function
    const { data: attachment, error: attachmentError } = await supabase.rpc('create_task_attachment', {
      p_task_id: taskId,
      p_user_id: user.id,
      p_file_name: file.name,
      p_file_size: file.size,
      p_file_type: file.type,
      p_storage_path: storagePath
    });

    if (attachmentError) {
      console.error('Error creating attachment record:', attachmentError);
      
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('focusprint').remove([storagePath]);
      
      return NextResponse.json({ error: 'Failed to create attachment record' }, { status: 500 });
    }

    if (!attachment || attachment.length === 0) {
      // Clean up uploaded file if no attachment record was created
      await supabase.storage.from('focusprint').remove([storagePath]);
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 403 });
    }

    return NextResponse.json({ attachment: attachment[0] }, { status: 201 });

  } catch (error) {
    console.error('File upload API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
