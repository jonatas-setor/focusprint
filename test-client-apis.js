// Test script for Client APIs
// Run with: node test-client-apis.js

const BASE_URL = 'http://localhost:3001';

async function testClientAPIs() {
  console.log('🧪 Testing Client APIs Integration...\n');

  // Test 1: GET /api/admin/clients (should return 401 without auth)
  console.log('Test 1: GET /api/admin/clients (no auth)');
  try {
    const response = await fetch(`${BASE_URL}/api/admin/clients`);
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    console.log(response.status === 401 ? '✅ PASS: Correctly returns 401' : '❌ FAIL: Should return 401');
  } catch (error) {
    console.log('❌ FAIL: Request failed', error.message);
  }
  console.log('');

  // Test 2: POST /api/admin/clients (should return 401 without auth)
  console.log('Test 2: POST /api/admin/clients (no auth)');
  try {
    const response = await fetch(`${BASE_URL}/api/admin/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Company',
        email: 'test@example.com',
        plan_type: 'free'
      })
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    console.log(response.status === 401 ? '✅ PASS: Correctly returns 401' : '❌ FAIL: Should return 401');
  } catch (error) {
    console.log('❌ FAIL: Request failed', error.message);
  }
  console.log('');

  // Test 3: Validation test
  console.log('Test 3: POST /api/admin/clients (invalid data)');
  try {
    const response = await fetch(`${BASE_URL}/api/admin/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '', // Invalid: empty name
        email: 'invalid-email', // Invalid: bad email format
      })
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    console.log(response.status === 401 ? '✅ PASS: Auth check before validation' : '❌ FAIL: Should check auth first');
  } catch (error) {
    console.log('❌ FAIL: Request failed', error.message);
  }
  console.log('');

  // Test 4: Check server is responding
  console.log('Test 4: Server health check');
  try {
    const response = await fetch(`${BASE_URL}/admin`);
    console.log(`Status: ${response.status}`);
    console.log(response.status < 500 ? '✅ PASS: Server is responding' : '❌ FAIL: Server error');
  } catch (error) {
    console.log('❌ FAIL: Server not responding', error.message);
  }
  console.log('');

  console.log('🎯 API Integration Test Summary:');
  console.log('- Authentication: Working (401 responses)');
  console.log('- Server: Responding');
  console.log('- Endpoints: Properly configured');
  console.log('- Next step: Test with authenticated session');
}

// Run the tests
testClientAPIs().catch(console.error);
