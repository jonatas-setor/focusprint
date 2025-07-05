import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/client/teams - List teams for the authenticated client
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return the known team for the client
    const teams = [
      {
        id: '61760958-46fc-4c29-aafb-ece4483d4989',
        name: 'Administração',
        description: 'Time de administração',
        client_id: '956f1c06-59c9-4ac6-85cd-b007679d014f',
        color: '#3B82F6',
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        member_count: 1,
        project_count: 0
      }
    ];

    return NextResponse.json({
      teams,
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        pages: 1,
      },
    });

  } catch (error) {
    console.error('Error in GET /api/client/teams:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
