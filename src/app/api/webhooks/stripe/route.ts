import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // In a real implementation, you would verify the webhook signature here
    // For now, we'll parse the event directly
    let event;
    try {
      event = JSON.parse(body);
    } catch (err) {
      console.error('Invalid JSON in webhook body');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('Received Stripe webhook:', event.type);

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'customer.created':
        await handleCustomerCreated(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(subscription: any) {
  try {
    const supabase = await createClient();
    
    console.log('Handling subscription created:', subscription.id);
    
    // Find the client by Stripe customer ID
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('stripe_customer_id', subscription.customer)
      .single();

    if (clientError || !client) {
      console.error('Client not found for customer:', subscription.customer);
      return;
    }

    // Determine plan based on subscription amount
    const amount = subscription.items.data[0]?.price?.unit_amount || 0;
    let planCode = 'FREE';
    
    if (amount >= 39900) { // R$ 399.00
      planCode = 'BUSINESS';
    } else if (amount >= 9700) { // R$ 97.00
      planCode = 'PRO';
    }

    // Update client license
    const { error: licenseError } = await supabase
      .from('licenses')
      .update({
        plan_code: planCode,
        status: 'active',
        stripe_subscription_id: subscription.id,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('client_id', client.id);

    if (licenseError) {
      console.error('Error updating license:', licenseError);
    } else {
      console.log('License activated for client:', client.id);
    }

  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    const supabase = await createClient();
    
    console.log('Handling subscription updated:', subscription.id);
    
    // Find license by Stripe subscription ID
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*, clients(*)')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (licenseError || !license) {
      console.error('License not found for subscription:', subscription.id);
      return;
    }

    // Update license status and period
    const status = subscription.status === 'active' ? 'active' : 
                  subscription.status === 'past_due' ? 'suspended' : 'inactive';

    const { error: updateError } = await supabase
      .from('licenses')
      .update({
        status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', license.id);

    if (updateError) {
      console.error('Error updating license:', updateError);
    } else {
      console.log('License updated for subscription:', subscription.id);
    }

  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    const supabase = await createClient();
    
    console.log('Handling subscription deleted:', subscription.id);
    
    // Find and deactivate license
    const { error: licenseError } = await supabase
      .from('licenses')
      .update({
        status: 'inactive',
        stripe_subscription_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (licenseError) {
      console.error('Error deactivating license:', licenseError);
    } else {
      console.log('License deactivated for subscription:', subscription.id);
    }

  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handlePaymentSucceeded(invoice: any) {
  try {
    console.log('Payment succeeded for invoice:', invoice.id);
    
    // Could log payment history or send confirmation emails here
    
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(invoice: any) {
  try {
    console.log('Payment failed for invoice:', invoice.id);
    
    // Could send payment failure notifications here
    
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

async function handleCustomerCreated(customer: any) {
  try {
    console.log('Customer created:', customer.id);
    
    // Could sync customer data or send welcome emails here
    
  } catch (error) {
    console.error('Error handling customer created:', error);
  }
}
