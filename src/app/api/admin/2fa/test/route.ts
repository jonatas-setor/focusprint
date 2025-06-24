import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';

// Test 2FA dependencies
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_PROFILE);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const results = {
      authentication: 'OK',
      dependencies: {},
      errors: []
    };

    // Test speakeasy
    try {
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret({
        name: 'Test',
        issuer: 'FocuSprint',
        length: 32
      });
      results.dependencies.speakeasy = {
        status: 'OK',
        secret_generated: !!secret.base32,
        otpauth_url: !!secret.otpauth_url
      };
    } catch (error) {
      results.dependencies.speakeasy = {
        status: 'ERROR',
        error: error.message
      };
      results.errors.push(`Speakeasy error: ${error.message}`);
    }

    // Test qrcode
    try {
      const QRCode = require('qrcode');
      const testUrl = await QRCode.toDataURL('test');
      results.dependencies.qrcode = {
        status: 'OK',
        generated_url: testUrl.startsWith('data:image/png;base64,')
      };
    } catch (error) {
      results.dependencies.qrcode = {
        status: 'ERROR',
        error: error.message
      };
      results.errors.push(`QRCode error: ${error.message}`);
    }

    // Test crypto-js
    try {
      const CryptoJS = require('crypto-js');
      const encrypted = CryptoJS.AES.encrypt('test', 'key').toString();
      const decrypted = CryptoJS.AES.decrypt(encrypted, 'key').toString(CryptoJS.enc.Utf8);
      results.dependencies.cryptojs = {
        status: 'OK',
        encryption_works: decrypted === 'test'
      };
    } catch (error) {
      results.dependencies.cryptojs = {
        status: 'ERROR',
        error: error.message
      };
      results.errors.push(`CryptoJS error: ${error.message}`);
    }

    // Test environment variables
    results.environment = {
      encryption_key_set: !!process.env.NEXT_PUBLIC_2FA_ENCRYPTION_KEY,
      node_env: process.env.NODE_ENV
    };

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error testing 2FA dependencies:', error);
    return NextResponse.json(
      { error: 'Failed to test 2FA dependencies', details: error.message },
      { status: 500 }
    );
  }
}
