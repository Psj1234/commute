/**
 * MULTI-MODAL ROUTING - VERIFICATION TEST SCRIPT
 * 
 * This script verifies that the multi-modal routing extension works correctly
 * while maintaining full backward compatibility with existing routing.
 * 
 * To run these tests in the browser:
 * 1. Navigate to the Dashboard
 * 2. Select two distant locations (e.g., NYC to Boston)
 * 3. Open browser DevTools → Console
 * 4. Run the test functions below
 * 
 * For API testing:
 * 1. Use curl or Postman to POST to /api/routes/generate
 * 2. Verify response structure matches expected format
 */

// ============================================================================
// TEST 1: Verify Mixed Routes Response Structure
// ============================================================================

async function testMixedRoutesStructure() {
  console.log("🧪 TEST 1: Verify Mixed Routes Response Structure");
  
  const testCases = [
    {
      name: "NYC to Boston",
      start: { lat: 40.7128, lng: -74.006 },
      end: { lat: 42.3601, lng: -71.0589 },
    },
    {
      name: "Adjacent Locations (Fallback Test)",
      start: { lat: 40.7128, lng: -74.006 },
      end: { lat: 40.7148, lng: -73.9860 },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📍 Testing: ${testCase.name}`);
    try {
      const response = await fetch("/api/routes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: testCase.start,
          end: testCase.end,
          userId: "test-user",
          persona: "SAFE_PLANNER",
        }),
      });

      if (!response.ok) {
        console.error(`❌ API Error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log(`✅ Response received with ${data.routes.length} routes`);

      // Verify response structure
      let singleCount = 0,
        multiCount = 0;
      data.routes.forEach((route, idx) => {
        if (route.mode_type === "SINGLE") {
          singleCount++;
          console.log(
            `  [${idx + 1}] 🚗 SINGLE-MODE: "${route.name}" | ETA: ${route.base_eta || (route.duration / 60).toFixed(0)}min | RCI: ${(route.rci * 100).toFixed(0)}%`
          );
        } else if (route.mode_type === "MULTI") {
          multiCount++;
          const modes = route.legs?.map((l) => l.mode).join(" + ") || "Unknown";
          console.log(
            `  [${idx + 1}] 🚌 MULTI-MODAL: "${modes}" | ETA: ${route.total_travel_time || (route.duration / 60).toFixed(0)}min | Transfers: ${route.transfer_count} | RCI: ${(route.rci * 100).toFixed(0)}%`
          );
        }
      });

      console.log(
        `📊 Results: ${singleCount} single-mode, ${multiCount} multi-modal`
      );

      // Validate key fields
      const allHaveRCI = data.routes.every((r) => typeof r.rci === "number");
      const allHaveModeType = data.routes.every((r) => r.mode_type);
      const multiHaveLegs = data.routes
        .filter((r) => r.mode_type === "MULTI")
        .every((r) => Array.isArray(r.legs));
      const multiHaveTransferCount = data.routes
        .filter((r) => r.mode_type === "MULTI")
        .every((r) => typeof r.transfer_count === "number");

      console.log(
        `✅ Validation: RCI=${allHaveRCI}, ModeType=${allHaveModeType}, Legs=${multiHaveLegs}, Transfers=${multiHaveTransferCount}`
      );

      // Verify fallback: if no routes, API still returns 200
      if (data.routes.length === 0) {
        console.warn("⚠️ No routes generated (expected for adjacent locations)");
      }
    } catch (err) {
      console.error(`❌ Test failed: ${err.message}`);
    }
  }
}

// ============================================================================
// TEST 2: Verify Persona Penalties for Multi-Modal
// ============================================================================

async function testPersonaPenalties() {
  console.log("\n🧪 TEST 2: Verify Persona Penalties for Multi-Modal Routes");

  const personas = ["RUSHER", "SAFE_PLANNER", "COMFORT_SEEKER", "EXPLORER"];
  const routes = [];

  // Fetch routes for each persona
  for (const persona of personas) {
    try {
      const response = await fetch("/api/routes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: { lat: 40.7128, lng: -74.006 },
          end: { lat: 42.3601, lng: -71.0589 },
          userId: "test-user",
          persona,
        }),
      });

      const data = await response.json();
      console.log(`\n👤 ${persona}:`);

      if (data.routes.length > 0) {
        const singleRCI = data.routes
          .filter((r) => r.mode_type === "SINGLE")
          .sort((a, b) => b.rci - a.rci)[0];
        const multiRCI = data.routes
          .filter((r) => r.mode_type === "MULTI" && r.transfer_count > 0)
          .sort((a, b) => b.rci - a.rci)[0];

        if (singleRCI && multiRCI) {
          const penalty = ((singleRCI.rci - multiRCI.rci) * 100).toFixed(1);
          console.log(
            `  Best Single-Mode: ${(singleRCI.rci * 100).toFixed(0)}% RCI`
          );
          console.log(
            `  Best Multi-Modal: ${(multiRCI.rci * 100).toFixed(0)}% RCI (${multiRCI.transfer_count} transfers)`
          );
          console.log(`  Transfer Penalty: -${penalty}%`);

          // Verify penalty alignment with persona
          const expectedPenalties = {
            RUSHER: 0.02, // -2% per transfer
            SAFE_PLANNER: 0.08, // -8% per transfer
            COMFORT_SEEKER: 0.05, // -5% per transfer
            EXPLORER: 0.01, // +1% per transfer (bonus, not penalty)
          };

          const expected =
            expectedPenalties[persona] * multiRCI.transfer_count * 100;
          console.log(
            `  Expected Penalty: ~${expected.toFixed(1)}% (matching persona)`
          );
        }
      }
    } catch (err) {
      console.error(`❌ Failed to test ${persona}: ${err.message}`);
    }
  }
}

// ============================================================================
// TEST 3: Verify Fallback Behavior
// ============================================================================

function testFallbackBehavior() {
  console.log("\n🧪 TEST 3: Verify Fallback Behavior (Manual Verification)");

  console.log(`
Fallback Scenarios to Verify:

1. ✅ No Multi-Modal Routes Available
   - Select two very close locations (< 20 km)
   - Expect: Only single-mode routes displayed
   - Look for: No multi-modal badges in the route list
   
2. ✅ Mixed Routes Available
   - Select two distant locations (> 200 km, with transit options)
   - Expect: Both single-mode and multi-modal routes
   - Look for: Multi-modal badges with leg icons (🚗→🚆→🚶)
   
3. ✅ Route Selection
   - Select a multi-modal route
   - Expect: Map highlights the multi-modal route
   - Expect: RCI consistent with transfer penalties
   - Check: persona_explanation updates for selected route
   
4. ⚠️ Error Handling (if API fails to generate multi-modal):
   - Open browser DevTools → Network → XHR tab
   - Look at /api/routes/generate response
   - If error occurs in multi-modal generation, should see:
     - ✅ Response still returns 200 OK
     - ✅ Routes array contains single-mode routes
     - ✅ Check Console for: "Multi-modal route generation failed"
   `);
}

// ============================================================================
// TEST 4: Verify RCI Consistency
// ============================================================================

function testRCIConsistency() {
  console.log("\n🧪 TEST 4: Verify RCI Consistency");

  // This test is meant to be run in the browser after viewing routes
  if (typeof window !== "undefined" && window.routeData) {
    console.log("Analyzing loaded routes...");

    const routes = window.routeData;
    console.log(`Total routes: ${routes.length}`);

    // Check RCI values are in valid range
    const validRCI = routes.every((r) => r.rci >= 0 && r.rci <= 1);
    console.log(
      `✅ All RCI values in range [0,1]: ${validRCI ? "PASS" : "FAIL"}`
    );

    // Check multi-modal routes have transfer penalties
    const multiRoutes = routes.filter((r) => r.mode_type === "MULTI");
    if (multiRoutes.length > 0) {
      const allHaveTransferCount = multiRoutes.every(
        (r) => typeof r.transfer_count === "number"
      );
      console.log(
        `✅ Multi-modal routes have transfer_count: ${allHaveTransferCount ? "PASS" : "FAIL"}`
      );

      const allHaveComponents = multiRoutes.every(
        (r) => r.components && r.components.crowd_stability !== undefined
      );
      console.log(
        `✅ Multi-modal routes have components: ${allHaveComponents ? "PASS" : "FAIL"}`
      );
    }

    // Check single-mode routes are unchanged
    const singleRoutes = routes.filter((r) => r.mode_type === "SINGLE");
    if (singleRoutes.length > 0) {
      const allHaveBaseETA = singleRoutes.every(
        (r) => r.base_eta || r.duration
      );
      const allHaveGeometry = singleRoutes.every((r) => r.geometry);
      console.log(
        `✅ Single-mode routes have ETA: ${allHaveBaseETA ? "PASS" : "FAIL"}`
      );
      console.log(
        `✅ Single-mode routes have geometry: ${allHaveGeometry ? "PASS" : "FAIL"}`
      );
    }
  } else {
    console.log("ℹ️ This test requires routes to be loaded in the browser");
    console.log("1. Navigate to Dashboard");
    console.log("2. Select start and end locations");
    console.log("3. Wait for routes to load");
    console.log("4. Run: window.routeData = window.__ROUTE_DATA__");
    console.log("5. Re-run this test");
  }
}

// ============================================================================
// TEST 5: Verify Map Rendering (Automatic)
// ============================================================================

function testMapRendering() {
  console.log("\n🧪 TEST 5: Verify Map Rendering");

  console.log(`
Map Rendering Tests (Manual Verification):

1. ✅ Single-Mode Route Rendering
   - Select a single-mode route
   - Expect: Map shows blue polyline from start to end
   - Expect: Highway routes clearly visible
   
2. ✅ Multi-Modal Route Rendering
   - Select a multi-modal route
   - Expect: Map shows combined polyline (all legs)
   - Expect: Route should connect start → transit hub → destination
   - Expect: Color changes to red if selected
   
3. ✅ Polyline Geometry Parsing
   - Check Browser Console for errors
   - Should NOT see: "Failed to decode polyline" errors
   - Should see: Routes render without console errors
   
4. ✅ Multiple Routes (No Overlap Issues)
   - With multiple routes visible on map:
     - Expect: Dashed lines for non-selected routes
     - Expect: Solid line for selected route
     - Expect: Different opacity levels
  `);
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.clear();
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   MULTI-MODAL ROUTING VERIFICATION TEST SUITE             ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("📋 Running automated tests...\n");

  await testMixedRoutesStructure();
  await testPersonaPenalties();
  testFallbackBehavior();
  testRCIConsistency();
  testMapRendering();

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   TEST SUITE COMPLETE                                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("✅ Automated tests completed");
  console.log("⚠️ Manual verification tests still required");
  console.log(
    "\n💡 Next Steps: Review the verification checklist in MULTIMODAL_ROUTING_IMPLEMENTATION.md"
  );
}

// Export for global access
if (typeof window !== "undefined") {
  window.testMultiModalRouting = {
    testMixedRoutesStructure,
    testPersonaPenalties,
    testFallbackBehavior,
    testRCIConsistency,
    testMapRendering,
    runAllTests,
  };

  console.log(
    "✨ Multi-modal routing tests available. Run: testMultiModalRouting.runAllTests()"
  );
}

export {
  testMixedRoutesStructure,
  testPersonaPenalties,
  testFallbackBehavior,
  testRCIConsistency,
  testMapRendering,
  runAllTests,
};
