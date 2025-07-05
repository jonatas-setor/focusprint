import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateClientAccess } from '@/lib/auth/server';
import { z } from 'zod';

// Validation schema for clone options
const CloneProjectSchema = z.object({
  new_project_name: z.string().optional(),
  include_tasks: z.boolean().default(true),
  include_members: z.boolean().default(true),
  include_settings: z.boolean().default(true)
});

// POST /api/client/projects/[id]/clone - Clone project
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

    // Validate client access (handles both regular users and super admins)
    const accessResult = await validateClientAccess();
    if ('error' in accessResult) {
      return NextResponse.json({ error: accessResult.error }, { status: accessResult.status });
    }

    const { profile: userProfile, isSuperAdmin } = accessResult;

    // Verify user has access to the original project using RPC function
    const { data: projectData, error: accessError } = await supabase
      .rpc('get_project_by_id', {
        p_project_id: projectId,
        p_user_id: user.id
      });

    const project = projectData?.[0] || null;

    if (accessError || !project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = CloneProjectSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid clone options',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const {
      new_project_name,
      include_tasks,
      include_members,
      include_settings
    } = validationResult.data;

    // Clone the project using RPC function
    const { data: newProjectId, error: cloneError } = await supabase
      .rpc('clone_project', {
        p_original_project_id: projectId,
        p_user_id: user.id,
        p_new_project_name: new_project_name,
        p_include_tasks: include_tasks,
        p_include_members: include_members,
        p_include_settings: include_settings
      });

    if (cloneError || !newProjectId) {
      console.error('Error cloning project:', cloneError);
      return NextResponse.json({ 
        error: 'Failed to clone project',
        details: cloneError?.message 
      }, { status: 500 });
    }

    // Get the cloned project details
    const { data: clonedProjectData, error: fetchError } = await supabase
      .rpc('get_project_by_id', {
        p_project_id: newProjectId,
        p_user_id: user.id
      });

    const clonedProject = clonedProjectData?.[0] || null;

    if (fetchError || !clonedProject) {
      console.error('Error fetching cloned project:', fetchError);
      return NextResponse.json({ 
        error: 'Project cloned but failed to fetch details' 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Project cloned successfully',
      original_project: {
        id: project.id,
        name: project.name
      },
      cloned_project: {
        id: clonedProject.id,
        name: clonedProject.name,
        status: clonedProject.status
      },
      clone_options: {
        include_tasks,
        include_members,
        include_settings
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Project clone API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
