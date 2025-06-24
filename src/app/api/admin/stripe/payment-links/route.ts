import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authResult = await checkAdminAuth(supabase);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { client_id, plan_code } = await request.json();

    if (!client_id || !plan_code) {
      return NextResponse.json(
        { error: 'Missing required fields: client_id, plan_code' },
        { status: 400 }
      );
    }

    // Get client information
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Get plan information
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('code', plan_code)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Create or get Stripe customer
    let stripeCustomerId = client.stripe_customer_id;
    
    if (!stripeCustomerId) {
      // Create customer in Stripe using MCP tool
      const customer = await createStripeCustomer(client.name, client.email);
      stripeCustomerId = customer.id;
      
      // Update client with Stripe customer ID
      await supabase
        .from('clients')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', client_id);
    }

    // Create payment link
    const paymentLink = await createStripePaymentLink(plan, stripeCustomerId);

    return NextResponse.json({
      payment_link: paymentLink,
      customer_id: stripeCustomerId,
      plan: plan_code
    });

  } catch (error) {
    console.error('Error creating payment link:', error);
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authResult = await checkAdminAuth(supabase);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get('client_id');

    if (!client_id) {
      return NextResponse.json(
        { error: 'Missing client_id parameter' },
        { status: 400 }
      );
    }

    // Get existing payment links for client
    const paymentLinks = await getClientPaymentLinks(client_id);

    return NextResponse.json({ payment_links: paymentLinks });

  } catch (error) {
    console.error('Error fetching payment links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment links' },
      { status: 500 }
    );
  }
}

async function createStripeCustomer(name: string, email: string) {
  try {
    // This would use the Stripe MCP tool
    // For now, simulate the response
    const mockCustomer = {
      id: `cus_${Date.now()}`,
      email,
      name,
      created: Math.floor(Date.now() / 1000)
    };

    return mockCustomer;

  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

async function createStripePaymentLink(plan: any, customerId: string) {
  try {
    // This would use the Stripe MCP tool to create a payment link
    // For now, simulate the response
    
    const mockPaymentLink = {
      id: `plink_${Date.now()}`,
      url: `https://buy.stripe.com/test_${Date.now()}`,
      active: true,
      metadata: {
        plan_code: plan.code,
        customer_id: customerId
      }
    };

    return mockPaymentLink;

  } catch (error) {
    console.error('Error creating Stripe payment link:', error);
    throw error;
  }
}

async function getClientPaymentLinks(clientId: string) {
  try {
    // This would fetch payment links from Stripe for the client
    // For now, return empty array
    return [];

  } catch (error) {
    console.error('Error fetching client payment links:', error);
    throw error;
  }
}

// Alternative implementation using direct Stripe API
async function createStripePaymentLinkDirect(plan: any, customerId: string) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    // First, create or get the price for this plan
    const priceResponse = await fetch('https://api.stripe.com/v1/prices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'unit_amount': (plan.price * 100).toString(), // Convert to cents
        'currency': plan.currency || 'brl',
        'recurring[interval]': plan.interval || 'month',
        'product_data[name]': `FocuSprint ${plan.name}`,
        'product_data[description]': plan.description || ''
      })
    });

    if (!priceResponse.ok) {
      throw new Error(`Failed to create price: ${priceResponse.status}`);
    }

    const price = await priceResponse.json();

    // Create payment link
    const linkResponse = await fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'line_items[0][price]': price.id,
        'line_items[0][quantity]': '1',
        'metadata[plan_code]': plan.code,
        'metadata[customer_id]': customerId
      })
    });

    if (!linkResponse.ok) {
      throw new Error(`Failed to create payment link: ${linkResponse.status}`);
    }

    return await linkResponse.json();

  } catch (error) {
    console.error('Error creating Stripe payment link directly:', error);
    throw error;
  }
}
