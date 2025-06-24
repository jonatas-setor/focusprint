import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Create Supabase server client
function createClient() {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

async function checkAdminAuth(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const adminEmails = ['admin@focusprint.com', 'atendimento.setor@gmail.com'];
  if (!user.email || !adminEmails.includes(user.email)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { user };
}

// GET /api/admin/licenses/[id] - Get specific license
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const authResult = await checkAdminAuth(supabase);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'License not found' }, { status: 404 });
      }
      console.error('Error fetching license:', error);
      return NextResponse.json({ error: 'Failed to fetch license' }, { status: 500 });
    }

    return NextResponse.json({ license });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/licenses/[id] - Update license
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const authResult = await checkAdminAuth(supabase);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const updates = {
      ...body,
      updated_at: new Date().toISOString()
    };

    // Remove id from updates if present
    delete updates.id;
    delete updates.created_at;

    const { data: license, error } = await supabase
      .from('licenses')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'License not found' }, { status: 404 });
      }
      console.error('Error updating license:', error);
      return NextResponse.json({ error: 'Failed to update license' }, { status: 500 });
    }

    return NextResponse.json({ license });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/licenses/[id] - Delete license
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const authResult = await checkAdminAuth(supabase);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { error } = await supabase
      .from('licenses')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting license:', error);
      return NextResponse.json({ error: 'Failed to delete license' }, { status: 500 });
    }

    return NextResponse.json({ message: 'License deleted successfully' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
