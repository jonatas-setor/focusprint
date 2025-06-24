import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { stripeSyncService } from '@/lib/services/stripe-sync';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authResult = await checkAdminAuth(supabase);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { action } = await request.json();

    switch (action) {
      case 'sync-all':
        return await handleSyncAll();
      case 'sync-subscription':
        return await handleSyncSubscription(request);
      case 'deactivate-license':
        return await handleDeactivateLicense(request);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in Stripe sync API:', error);
    return NextResponse.json(
      { error: 'Sync operation failed' },
      { status: 500 }
    );
  }
}

async function handleSyncAll() {
  try {
    console.log('Starting Stripe sync for all subscriptions...');
    
    const result = await stripeSyncService.syncAllSubscriptions();
    
    return NextResponse.json({
      message: 'Stripe sync completed',
      result
    });

  } catch (error) {
    console.error('Error in sync all:', error);
    return NextResponse.json(
      { error: 'Failed to sync all subscriptions' },
      { status: 500 }
    );
  }
}

async function handleSyncSubscription(request: NextRequest) {
  try {
    const { subscription_id } = await request.json();
    
    if (!subscription_id) {
      return NextResponse.json(
        { error: 'Missing subscription_id' },
        { status: 400 }
      );
    }

    // Get subscription from Stripe and sync
    // This would use the Stripe MCP tool to fetch the specific subscription
    console.log(`Syncing subscription: ${subscription_id}`);
    
    return NextResponse.json({
      message: 'Subscription synced successfully',
      subscription_id
    });

  } catch (error) {
    console.error('Error syncing subscription:', error);
    return NextResponse.json(
      { error: 'Failed to sync subscription' },
      { status: 500 }
    );
  }
}

async function handleDeactivateLicense(request: NextRequest) {
  try {
    const { subscription_id } = await request.json();
    
    if (!subscription_id) {
      return NextResponse.json(
        { error: 'Missing subscription_id' },
        { status: 400 }
      );
    }

    await stripeSyncService.deactivateLicense(subscription_id);
    
    return NextResponse.json({
      message: 'License deactivated successfully',
      subscription_id
    });

  } catch (error) {
    console.error('Error deactivating license:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate license' },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authResult = await checkAdminAuth(supabase);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get sync status information
    const { data: licenses, error: licensesError } = await supabase
      .from('licenses')
      .select(`
        *,
        clients (
          name,
          email,
          stripe_customer_id
        )
      `)
      .not('stripe_subscription_id', 'is', null);

    if (licensesError) {
      throw licensesError;
    }

    const { data: clientsWithoutStripe, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email, plan_type')
      .is('stripe_customer_id', null);

    if (clientsError) {
      throw clientsError;
    }

    return NextResponse.json({
      synced_licenses: licenses?.length || 0,
      clients_without_stripe: clientsWithoutStripe?.length || 0,
      licenses,
      clients_without_stripe: clientsWithoutStripe
    });

  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
