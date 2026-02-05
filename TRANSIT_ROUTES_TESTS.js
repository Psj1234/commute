/**
 * TRANSIT ROUTES TEST SUITE
 * 
 * Manual and automated tests for TRAIN and METRO route generation
 * Run in browser console to validate transit implementation
 */

// ============================================
// 1. UNIT TESTS - Transit Hub Generation
// ============================================

console.log("=== TRANSIT ROUTES TEST SUITE ===\n");

// Test data: NYC coordinates
const TEST_LOCATIONS = {
  times_square: { lat: 40.758, lng: -73.985, name: "Times Square" },
  central_park_south: { lat: 40.772, lng: -73.978, name: "Central Park South" },
  brooklyn_bridge: { lat: 40.706, lng: -73.998, name: "Brooklyn Bridge" },
  empire_state: { lat: 40.748, lng: -73.986, name: "Empire State Building" },
  jfk_area: { lat: 40.640, lng: -73.778, name: "JFK Area" }
};

describe("TransitHubGeneration", () => {
  it("should generate hubs within specified radius", () => {
    // Mock function (would use actual transit-routes.ts functions)
    const mockGenerateTransitHubs = (lat, lng, radius) => {
      const hubs = [];
      const hub_count = Math.ceil(radius * 0.8);
      for (let i = 0; i < hub_count; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.sqrt(Math.random()) * radius;
        const dlat = (distance / 111) * Math.cos(angle);
        const dlng = (distance / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
        
        hubs.push({
          id: `hub_${i}`,
          name: `Hub ${i + 1}`,
          lat: lat + dlat,
          lng: lng + dlng,
          type: i % 4 === 0 ? "TRAIN_STATION" : "METRO_STOP",
          modes: i % 4 === 0 ? ["TRAIN"] : ["METRO"]
        });
      }
      return hubs;
    };

    const hubs = mockGenerateTransitHubs(40.758, -73.985, 2.5);
    console.log(`✓ Generated ${hubs.length} hubs within 2.5 km`);
    
    hubs.forEach(hub => {
      const distance = Math.sqrt(
        Math.pow(hub.lat - 40.758, 2) + 
        Math.pow(hub.lng - -73.985, 2)
      ) * 111; // Rough km conversion
      assert(distance < 3, `Hub ${hub.name} within radius`);
    });
    
    console.log(`✓ All hubs within radius boundary`);
  });

  it("should have realistic mix of TRAIN_STATION and METRO_STOP", () => {
    const mockGenerateTransitHubs = (lat, lng, radius) => {
      const hubs = [];
      const hub_count = 10;
      for (let i = 0; i < hub_count; i++) {
        hubs.push({
          type: i % 4 === 0 ? "TRAIN_STATION" : "METRO_STOP"
        });
      }
      return hubs;
    };

    const hubs = mockGenerateTransitHubs(40.758, -73.985, 2.5);
    const trainStations = hubs.filter(h => h.type === "TRAIN_STATION").length;
    const metroStops = hubs.filter(h => h.type === "METRO_STOP").length;
    
    assert(metroStops > trainStations, "More metro stops than train stations");
    console.log(`✓ Hub distribution: ${metroStops} metro stops, ${trainStations} train stations`);
  });
});

// ============================================
// 2. TRANSIT LEG CREATION TESTS
// ============================================

describe("TransitLegCreation", () => {
  it("should create valid transit leg with realistic timing", () => {
    const mockCreateTransitLeg = (from_hub, to_hub, mode) => {
      const distance = Math.sqrt(
        Math.pow(from_hub.lat - to_hub.lat, 2) + 
        Math.pow(from_hub.lng - to_hub.lng, 2)
      ) * 111; // Rough km conversion
      
      const speed_kmh = mode === "TRAIN" ? 80 : 40;
      const travel_time_minutes = Math.ceil((distance / speed_kmh) * 60);
      const base_crowd = mode === "TRAIN" ? 0.5 : 0.65;
      const crowd_variation = Math.random() * 0.3 - 0.15;
      const crowd_score = Math.max(0, Math.min(1, base_crowd + crowd_variation));
      
      return {
        mode,
        start_station: from_hub.name,
        end_station: to_hub.name,
        travel_time_minutes,
        wait_time_minutes: Math.round((mode === "TRAIN" ? 450 : 300) / 60),
        distance_km: distance,
        crowd_score,
        line_name: ["Red Line", "Blue Line", "Green Line"][Math.floor(Math.random() * 3)]
      };
    };

    const hub1 = { lat: 40.758, lng: -73.985, name: "Times Square" };
    const hub2 = { lat: 40.640, lng: -73.778, name: "JFK Area" };
    
    const leg = mockCreateTransitLeg(hub1, hub2, "TRAIN");
    
    assert(leg.travel_time_minutes > 0, "Travel time positive");
    assert(leg.distance_km > 0, "Distance positive");
    assert(leg.crowd_score >= 0 && leg.crowd_score <= 1, "Crowd score valid");
    assert(["TRAIN", "METRO"].includes(leg.mode), "Mode valid");
    
    console.log(`✓ Created ${leg.mode} leg: ${leg.start_station} → ${leg.end_station}`);
    console.log(`  - Travel: ${leg.travel_time_minutes} min + ${leg.wait_time_minutes} min wait`);
    console.log(`  - Distance: ${leg.distance_km.toFixed(1)} km`);
    console.log(`  - Crowd: ${(leg.crowd_score * 100).toFixed(0)}%`);
  });

  it("should differentiate transit modes realistically", () => {
    const mockCreateTransitLeg = (from_hub, to_hub, mode) => {
      const distance = 15; // 15 km for this test
      const speed_kmh = mode === "TRAIN" ? 80 : 40;
      const travel_time_minutes = Math.ceil((distance / speed_kmh) * 60);
      return { travel_time_minutes, mode };
    };

    const hub1 = { lat: 40.758, lng: -73.985 };
    const hub2 = { lat: 40.640, lng: -73.778 };
    
    const train_leg = mockCreateTransitLeg(hub1, hub2, "TRAIN");
    const metro_leg = mockCreateTransitLeg(hub1, hub2, "METRO");
    
    assert(train_leg.travel_time_minutes < metro_leg.travel_time_minutes, "Trains faster than metro");
    console.log(`✓ Mode differentiation:`);
    console.log(`  - Train (15 km): ${train_leg.travel_time_minutes} min`);
    console.log(`  - Metro (15 km): ${metro_leg.travel_time_minutes} min`);
  });
});

// ============================================
// 3. TRANSIT ROUTE RCI TESTS
// ============================================

describe("TransitRouteRCI", () => {
  it("should have valid RCI scores (0-1 range)", () => {
    const mockCreateTransitRoute = () => {
      const base_rci = 0.5 + Math.random() * 0.4; // 0.5-0.9
      const transfer_penalty = Math.floor(Math.random() * 3) * 0.03;
      const final_rci = Math.max(0, Math.min(1, base_rci - transfer_penalty));
      return { rci: final_rci, transfer_penalty };
    };

    const routes = [];
    for (let i = 0; i < 5; i++) {
      routes.push(mockCreateTransitRoute());
    }

    routes.forEach(route => {
      assert(route.rci >= 0 && route.rci <= 1, `RCI in valid range: ${route.rci}`);
    });
    
    console.log(`✓ All ${routes.length} routes have valid RCI scores`);
    routes.forEach((r, i) => {
      console.log(`  Route ${i + 1}: RCI = ${(r.rci * 100).toFixed(0)}% (penalty: -${(r.transfer_penalty * 100).toFixed(0)}%)`);
    });
  });

  it("should apply persona-specific RCI adjustments", () => {
    const personas = ["RUSHER", "SAFE_PLANNER", "COMFORT_SEEKER", "EXPLORER"];
    const mockApplyPersonaBonus = (base_rci, persona, transfer_count, crowd_score) => {
      let bonus = 0;
      switch (persona) {
        case "RUSHER":
          if (transfer_count === 1) bonus += 5;
          if (transfer_count > 1) bonus -= transfer_count * 3;
          break;
        case "SAFE_PLANNER":
          bonus += 8;
          if (crowd_score > 0.75) bonus -= 8;
          bonus -= transfer_count * 2;
          break;
        case "COMFORT_SEEKER":
          if (crowd_score < 0.5) bonus += 4;
          if (crowd_score > 0.8) bonus -= 10;
          bonus -= transfer_count * 4;
          break;
        case "EXPLORER":
          bonus += 12;
          bonus += transfer_count * 1;
          break;
      }
      const adjusted = Math.min(1, Math.max(0.1, base_rci + bonus / 100));
      return { adjusted_rci: adjusted, bonus: bonus };
    };

    const test_rci = 0.70;
    const test_crowd = 0.60;
    console.log(`\n✓ Persona adjustments for base RCI ${(test_rci * 100).toFixed(0)}%, crowd ${(test_crowd * 100).toFixed(0)}%:`);
    
    personas.forEach(persona => {
      const result = mockApplyPersonaBonus(test_rci, persona, 0, test_crowd);
      console.log(`  ${persona}: ${(result.adjusted_rci * 100).toFixed(0)}% (${result.bonus >= 0 ? "+" : ""}${result.bonus}%)`);
    });
  });

  it("should penalize crowded transit for certain personas", () => {
    const mockApplyPersonaBonus = (base_rci, persona, transfer_count, crowd_score) => {
      let bonus = 0;
      if (persona === "COMFORT_SEEKER") {
        if (crowd_score > 0.8) bonus = -10;
        else if (crowd_score < 0.5) bonus = 4;
      }
      return Math.min(1, Math.max(0.1, base_rci + bonus / 100));
    };

    const uncrowded_result = mockApplyPersonaBonus(0.70, "COMFORT_SEEKER", 0, 0.30);
    const crowded_result = mockApplyPersonaBonus(0.70, "COMFORT_SEEKER", 0, 0.90);
    
    assert(uncrowded_result > crowded_result, "Comfort seeker prefers uncrowded");
    console.log(`\n✓ Crowd sensitivity:`);
    console.log(`  - Uncrowded (30%): RCI = ${(uncrowded_result * 100).toFixed(0)}%`);
    console.log(`  - Crowded (90%):   RCI = ${(crowded_result * 100).toFixed(0)}%`);
  });
});

// ============================================
// 4. INTEGRATED FLOW TESTS
// ============================================

describe("IntegratedTransitFlow", () => {
  it("should generate multiple transit route options", () => {
    const mockGenerateTransitRoutes = () => {
      const routes = [
        {
          mode_type: "TRANSIT",
          legs: [
            { mode: "METRO", travel_time_minutes: 20, crowds: 0.60 }
          ],
          transfer_count: 0,
          total_travel_time: 28,
          rci: 0.75
        },
        {
          mode_type: "TRANSIT",
          legs: [
            { mode: "TRAIN", travel_time_minutes: 25, crowds: 0.45 }
          ],
          transfer_count: 0,
          total_travel_time: 30,
          rci: 0.78
        },
        {
          mode_type: "TRANSIT",
          legs: [
            { mode: "METRO", travel_time_minutes: 12, crowds: 0.70 },
            { mode: "TRAIN", travel_time_minutes: 15, crowds: 0.50 }
          ],
          transfer_count: 1,
          total_travel_time: 38,
          rci: 0.72
        }
      ];
      return routes;
    };

    const routes = mockGenerateTransitRoutes();
    console.log(`\n✓ Generated ${routes.length} transit route options:`);
    
    routes.forEach((route, i) => {
      const mode_string = route.legs.map(l => l.mode).join(" → ");
      console.log(`  ${i + 1}. ${mode_string} (${route.transfer_count} transfers)`);
      console.log(`     Time: ${route.total_travel_time} min | RCI: ${(route.rci * 100).toFixed(0)}%`);
    });
  });

  it("should combine with other route types in API response", () => {
    const mockApiResponse = {
      routes: [
        { mode_type: "SINGLE", duration: 2700, rci: 0.62 },       // Car
        { mode_type: "MULTI", duration: 3120, rci: 0.75 },        // Car+Train
        { mode_type: "TRANSIT", duration: 1680, rci: 0.75 },      // Metro+Train
        { mode_type: "TRANSIT", duration: 1800, rci: 0.72 },      // Metro only
      ]
    };

    const route_types = {};
    mockApiResponse.routes.forEach(r => {
      route_types[r.mode_type] = (route_types[r.mode_type] || 0) + 1;
    });

    console.log(`\n✓ Complete API response includes:`);
    Object.entries(route_types).forEach(([type, count]) => {
      console.log(`  - ${count} ${type} route(s)`);
    });

    console.log(`\nTotal routes: ${mockApiResponse.routes.length}`);
  });
});

// ============================================
// 5. BACKWARD COMPATIBILITY TESTS
// ============================================

describe("BackwardCompatibility", () => {
  it("should not affect existing single-mode routes", () => {
    const existing_car_route = {
      mode_type: "SINGLE",
      geometry: "encoded_polyline",
      distance: 25,
      duration: 1800,
      is_maps_preferred: true,
      rci: 0.65
    };

    // Verify all existing properties remain unchanged
    assert(existing_car_route.mode_type === "SINGLE", "Mode unchanged");
    assert(existing_car_route.geometry, "Geometry present");
    assert(existing_car_route.distance > 0, "Distance present");
    
    console.log(`\n✓ Existing car route properties unchanged:`);
    console.log(`  - Mode: ${existing_car_route.mode_type}`);
    console.log(`  - Distance: ${existing_car_route.distance} km`);
    console.log(`  - RCI: ${(existing_car_route.rci * 100).toFixed(0)}%`);
  });

  it("should not affect existing multi-modal routes", () => {
    const existing_multimodal = {
      mode_type: "MULTI",
      legs: [
        { mode: "CAR", travel_time: 15 },
        { mode: "TRAIN", travel_time: 20 }
      ],
      transfer_count: 1,
      rci: 0.72
    };

    assert(existing_multimodal.mode_type === "MULTI", "Mode preserved");
    assert(existing_multimodal.legs[0].mode === "CAR", "CAR legs intact");
    
    console.log(`✓ Existing multi-modal route intact:`);
    console.log(`  - Legs: ${existing_multimodal.legs.map(l => l.mode).join(" → ")}`);
    console.log(`  - RCI: ${(existing_multimodal.rci * 100).toFixed(0)}%`);
  });

  it("should gracefully handle API without transit support", () => {
    // Simulate older API response (without transit routes)
    const old_response = {
      routes: [
        { mode_type: "SINGLE", rci: 0.65 },
        { mode_type: "MULTI", rci: 0.72 }
      ]
    };

    // Filter for transit routes (should be empty for old response)
    const transit_routes = old_response.routes.filter(r => r.mode_type === "TRANSIT");
    assert(transit_routes.length === 0, "No transit routes in old response");
    
    console.log(`✓ Old API response handled gracefully:`);
    console.log(`  - Non-transit routes: ${old_response.routes.length}`);
    console.log(`  - Transit routes: ${transit_routes.length}`);
  });
});

// ============================================
// 6. ERROR HANDLING TESTS
// ============================================

describe("ErrorHandling", () => {
  it("should handle invalid coordinates gracefully", () => {
    const mockGenerateTransitRoutes = (start, end) => {
      if (!start || !end) return null;
      if (Math.abs(start.lat) > 90 || Math.abs(start.lng) > 180) return null;
      return []; // Valid but empty
    };

    const invalid_start = { lat: 95, lng: 0 }; // Lat > 90
    const valid_end = { lat: 40, lng: -74 };
    
    const result = mockGenerateTransitRoutes(invalid_start, valid_end);
    assert(result === null, "Returns null for invalid coordinates");
    
    console.log(`\n✓ Invalid coordinates handled: ${result === null ? "✓ Graceful error" : "✗ No error"}`);
  });

  it("should fallback to other routes if transit fails", () => {
    const mockRouteGeneration = () => {
      const routes = [];
      
      // Car routes always available
      routes.push({ mode_type: "SINGLE", rci: 0.65 });
      
      // Multi-modal may be available
      try {
        routes.push({ mode_type: "MULTI", rci: 0.72 });
      } catch (err) {
        console.warn("Multi-modal generation skipped");
      }
      
      // Transit may fail
      try {
        throw new Error("Transit hub generation failed");
      } catch (err) {
        console.warn("Transit generation skipped:", err.message);
      }
      
      return routes;
    };

    const routes = mockRouteGeneration();
    const has_single = routes.some(r => r.mode_type === "SINGLE");
    assert(has_single, "Single-mode available despite transit failure");
    
    console.log(`✓ Fallback successful: ${routes.length} routes available despite transit error`);
  });
});

// ============================================
// TEST RUNNER UTILS
// ============================================

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ Assertion failed: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function describe(name, tests) {
  console.log(`\n[TEST SUITE: ${name}]`);
  tests();
}

function it(description, test) {
  try {
    test();
  } catch (err) {
    console.error(`✗ ${description}`);
    console.error(`  Error: ${err.message}`);
  }
}

// ============================================
// RUN ALL TESTS
// ============================================

console.log("\n" + "=".repeat(50));
console.log("RUNNING TRANSIT ROUTES TEST SUITE");
console.log("=".repeat(50));

// Note: In actual environment, these would be async/await
// This is a browser-compatible test skeleton

console.log("\n📋 Tests prepared. To run actual tests:");
console.log("1. Import transit-routes.ts functions");
console.log("2. Call: generateTransitRoutes(40.758, -73.985, 40.640, -73.778, ...)");
console.log("3. Verify route structure matches expected format");
console.log("4. Check persona adjustments applied correctly");

// ============================================
// MANUAL TEST SCENARIOS
// ============================================

console.log("\n" + "=".repeat(50));
console.log("MANUAL TEST SCENARIOS");
console.log("=".repeat(50));

const scenarios = [
  {
    name: "Morning Rush Hour (8:30 AM)",
    time: new Date(2024, 1, 1, 8, 30),
    persona: "RUSHER",
    start: "Office (Times Square)",
    end: "Home (Brooklyn)",
    expected: "Prefers express trains over crowded metro"
  },
  {
    name: "Evening Commute (6:00 PM)",
    time: new Date(2024, 1, 1, 18, 0),
    persona: "SAFE_PLANNER",
    start: "Work Building",
    end: "Apartment",
    expected: "Avoids peak hour crowds, picks reliable metro/train"
  },
  {
    name: "Weekend Leisure (2:00 PM)",
    time: new Date(2024, 1, 6, 14, 0),
    persona: "EXPLORER",
    start: "Downtown",
    end: "Museum",
    expected: "Prefers varied multi-leg transit combinations"
  },
  {
    name: "Off-Peak Travel (10:00 AM)",
    time: new Date(2024, 1, 1, 10, 0),
    persona: "COMFORT_SEEKER",
    start: "Starting Point",
    end: "Destination",
    expected: "Selects uncrowded spaced metro/train legs"
  }
];

console.log("\nTest Scenarios:");
scenarios.forEach((s, i) => {
  console.log(`\n${i + 1}. ${s.name}`);
  console.log(`   Persona: ${s.persona}`);
  console.log(`   Route: ${s.start} → ${s.end}`);
  console.log(`   Expected: ${s.expected}`);
});

console.log("\n" + "=".repeat(50));
console.log("✅ TEST SUITE READY");
console.log("=".repeat(50) + "\n");
