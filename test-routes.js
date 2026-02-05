#!/usr/bin/env node

/**
 * Test script for dynamic route generation
 * Tests the /api/routes/generate endpoint with different coordinates
 */

const BASE_URL = 'http://localhost:3000';

async function testRouteGeneration(startLat, startLng, endLat, endLng, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${description}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Start: ${startLat}, ${startLng}`);
  console.log(`End: ${endLat}, ${endLng}`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/routes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: { lat: startLat, lng: startLng },
        end: { lat: endLat, lng: endLng },
        userId: 'test-user-123'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ SUCCESS (${response.status})`);
      console.log(`Routes generated: ${data.routes?.length || 0}`);
      if (data.routes && data.routes.length > 0) {
        data.routes.forEach((route, idx) => {
          console.log(`  Route ${idx + 1}:`);
          console.log(`    - Name: ${route.route_id}`);
          console.log(`    - Distance: ${route.distance}km`);
          console.log(`    - Duration: ${route.duration}s`);
          console.log(`    - RCI Score: ${route.rci?.toFixed(2)}`);
          console.log(`    - Preferred: ${route.is_maps_preferred}`);
        });
      }
    } else {
      console.log(`❌ ERROR (${response.status})`);
      console.log(`Message: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`❌ NETWORK ERROR: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Dynamic Route Generation API Tests                    ║');
  console.log('║  Testing /api/routes/generate endpoint                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  // Test 1: Valid NYC coordinates
  await testRouteGeneration(
    40.7128, -74.006,
    40.6892, -74.0445,
    'Valid NYC coordinates'
  );
  
  // Test 2: Invalid coordinates (should use fallback)
  await testRouteGeneration(
    19.23570, -287.13690,
    19.18082, -287.04499,
    'Invalid coordinates (should fallback to NYC)'
  );
  
  // Test 3: Another valid route (Times Square to Central Park)
  await testRouteGeneration(
    40.7580, -73.9855,
    40.7829, -73.9654,
    'Times Square to Central Park'
  );
  
  // Test 4: San Francisco route
  await testRouteGeneration(
    37.7749, -122.4194,
    37.3382, -121.8863,
    'San Francisco to San Jose'
  );
  
  console.log('\n' + '='.repeat(60));
  console.log('All tests completed!');
  console.log('='.repeat(60) + '\n');
}

// Run tests
runTests().catch(console.error);
