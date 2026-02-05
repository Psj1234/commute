# RCI-Based Intelligent Routing Implementation

## Overview
This system prioritizes **route reliability over speed** using a Reliability Confidence Index (RCI) that factors in historical failures, time-window patterns, OSINT zones, and user personas. Unlike traditional routing (Google Maps), this system optimizes for the **most reliable journey**, not the fastest ETA.

---

## Core Philosophy

### Traditional Routing (Google Maps)
- Primary metric: **Fastest ETA**
- Secondary: Distance, traffic conditions
- Result: Often suggests routes that are fastest but unreliable

### RCI-Based Routing (This System)
- Primary metric: **Reliability Confidence Index (RCI)**
- Factors: Historical failures, time-window patterns, OSINT zones, user behavior
- Result: Suggests slower routes that are more likely to arrive on time

**Example:**
- Route A: 25 min ETA, 55% RCI (failure-prone during rush hour)
- Route B: 31 min ETA, 82% RCI (consistently reliable)
- **System recommends:** Route B (+6 min, but +27% more reliable)

---

## Implementation Files

### 1. Enhanced RCI Engine (`app/lib/enhanced-rci.ts`)
**New file** containing advanced RCI calculation logic.

#### Key Features:
- **Failure History Tracking**: Stores route failures by time window
  - Format: `route_signature` (lat1_lng1_lat2_lng2) + `time_window` (15-min buckets)
  - Example: Route "19.23_72.86_19.17_72.95" at "08:30-08:45" had 15/50 failures (30% failure rate)
  - Penalty: Up to 30% RCI reduction for high failure rates

- **Time-Window Patterns**: Rush hour vs off-peak reliability
  ```typescript
  // Morning rush (08:30-08:45)
  reliability_multiplier: 0.55  // 45% less reliable
  typical_delay_minutes: 30
  congestion_level: 0.95
  
  // Off-peak (default)
  reliability_multiplier: 0.90  // 10% less reliable
  typical_delay_minutes: 5
  congestion_level: 0.40
  ```

- **Persona-Based Adjustments**:
  - `SAFE_PLANNER`: +15% RCI for reliable routes, +20% penalty on failures
  - `RUSHER`: Willing to take 10% RCI hit for faster routes
  - `COMFORT_SEEKER`: Avoids crowds (+10% penalty)
  - `EXPLORER`: Novelty bonus for alternative routes

- **OSINT Zone Integration**: Applies penalties for routes passing through advisory zones

#### Core Functions:

```typescript
calculateEnhancedRCI(
  startLat, startLng, endLat, endLng,
  baseETA, distance, currentTime,
  userPersona, osintZones
): EnhancedRCIResult

// Returns:
{
  rci: 0.72,                    // Final RCI score
  original_rci: 0.85,           // Before adjustments
  explanation: "⚠️ Moderately reliable...",
  failure_penalty: 0.08,
  time_window_penalty: 0.05,
  osint_penalty: 0.02,
  persona_bonus: 0.02,
  risk_factors: [
    "⚠️ 30% failure rate in 08:30-08:45 time window",
    "🚦 High congestion period (95% congestion level)"
  ],
  confidence_level: "MEDIUM"
}
```

```typescript
compareRoutesForReliability(
  route1RCI, route1ETA,
  route2RCI, route2ETA
): string

// Example output:
"✅ Route 1 recommended: 27% more reliable, despite being 6 min slower. Reliability prioritized."
```

---

### 2. Route Generation API (`app/api/routes/generate/route.ts`)
**Modified** to use enhanced RCI calculation instead of mocked values.

#### Changes:
1. **Import enhanced RCI system**:
   ```typescript
   import { calculateEnhancedRCI, compareRoutesForReliability } from "@/app/lib/enhanced-rci";
   import { bucketTime, inferPersona } from "@/app/lib/intelligence-engine";
   import { getActiveOSINTZones } from "@/app/lib/osint-data";
   ```

2. **Get context before route calculation**:
   ```typescript
   const currentTime = new Date();
   const timeWindow = bucketTime(currentTime);
   const userPersona = inferPersona(userId || "default_user").persona;
   const osintZones = getActiveOSINTZones(timeWindow);
   ```

3. **Calculate enhanced RCI for each route**:
   ```typescript
   const enhancedRCI = calculateEnhancedRCI(
     start.lat, start.lng, end.lat, end.lng,
     durationMinutes, distance,
     currentTime, userPersona, osintZones
   );
   ```

4. **Store detailed RCI data in database**:
   ```typescript
   await prisma.routeConfidence.create({
     data: {
       route_id, time_window,
       on_time_prob: enhancedRCI.components.on_time_prob,
       transfer_success: enhancedRCI.components.transfer_success,
       crowd_stability: enhancedRCI.components.crowd_stability,
       delay_variance: enhancedRCI.components.delay_variance,
       last_mile_avail: enhancedRCI.components.last_mile_avail,
       rci_score: enhancedRCI.rci,
     },
   });
   ```

5. **Return enhanced data to client**:
   ```typescript
   routes.push({
     route_id, geometry, distance, duration,
     rci: enhancedRCI.rci,
     original_rci: enhancedRCI.original_rci,
     confidence_level: enhancedRCI.confidence_level,
     explanation: enhancedRCI.explanation,
     risk_factors: enhancedRCI.risk_factors,
     failure_penalty: enhancedRCI.failure_penalty,
     time_window_penalty: enhancedRCI.time_window_penalty,
     osint_penalty: enhancedRCI.osint_penalty,
     persona_bonus: enhancedRCI.persona_bonus,
     steps: navigationSteps,
   });
   ```

6. **Sort by RCI (not ETA)**:
   ```typescript
   routes.sort((a, b) => b.rci - a.rci);
   const rciPreferredRouteId = routes[0]?.route_id;
   ```

7. **Add route comparison**:
   ```typescript
   let routeComparison = "";
   if (routeRCIResults.length >= 2) {
     routeComparison = compareRoutesForReliability(
       routeRCIResults[0].enhancedRCI, routeRCIResults[0].duration,
       routeRCIResults[1].enhancedRCI, routeRCIResults[1].duration
     );
   }
   ```

#### API Response:
```json
{
  "routes": [
    {
      "route_id": "uuid",
      "distance": 12.5,
      "duration": 1860,
      "rci": 0.72,
      "original_rci": 0.85,
      "confidence_level": "MEDIUM",
      "explanation": "⚠️ Moderately reliable (RCI: 72%)...",
      "risk_factors": ["⚠️ 30% failure rate...", "🚦 High congestion..."],
      "failure_penalty": 0.08,
      "time_window_penalty": 0.05,
      "osint_penalty": 0.02,
      "persona_bonus": 0.02,
      "steps": [...]
    }
  ],
  "rci_preferred_route_id": "uuid",
  "route_comparison": "✅ Route 1 recommended: 27% more reliable...",
  "time_window": "08:30-08:45",
  "user_persona": "SAFE_PLANNER"
}
```

---

### 3. Dashboard UI (`app/dashboard/page.tsx`)
**Enhanced** to prominently display RCI information and explanations.

#### New Components:

##### A. Intelligence Recommendation Banner
Appears when multiple routes are available:
```tsx
<div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-300">
  <h3>Intelligence Recommendation</h3>
  <p>Route sorted by reliability, not speed. The most reliable route is shown first...</p>
  
  {/* Comparison */}
  <div>
    <div>Most Reliable: Route 1 (72% RCI)</div>
    <div>ETA Difference: 6 min slower</div>
    <div>Reliability Gain: +27% more reliable</div>
  </div>
</div>
```

##### B. Enhanced Route Cards
Each route card now shows:
- **Reliability Score**: Large, color-coded percentage
  - Green: ≥75% (HIGH)
  - Yellow: 55-74% (MEDIUM)
  - Red: <55% (LOW)
- **Confidence Level Badge**: HIGH/MEDIUM/LOW
- **Penalties/Bonuses**: Shows if significant (>5%)
  - ⚠️ Failure History: -8%
  - ⏰ Time Window: -5%
  - 🔴 Advisory Zones: -2%
  - 👤 Persona Match: +2%
- **Explanation**: Why this RCI score?
- **Risk Factors**: Expandable details list

```tsx
<div className="p-2 rounded bg-zinc-100 border">
  <div className="flex justify-between">
    <span>Reliability Score:</span>
    <span className="font-bold text-lg text-green-600">72%</span>
  </div>
  <div className="flex justify-between">
    <span>Confidence:</span>
    <span className="bg-yellow-200 text-yellow-800">MEDIUM</span>
  </div>
</div>

{/* Penalties */}
<div className="space-y-1 text-xs">
  <div>⚠️ Failure History: -8%</div>
  <div>⏰ Time Window: -5%</div>
  <div>🔴 Advisory Zones: -2%</div>
  <div>👤 Persona Match: +2%</div>
</div>

{/* Explanation */}
<div className="text-xs bg-blue-50 border-blue-200">
  ⚠️ Moderately reliable (RCI: 72%). Route has 8% failure penalty. 
  Congestion expected in 08:30-08:45.
</div>

{/* Risk Factors */}
<details>
  <summary>📋 Risk Factors (2)</summary>
  <div>
    • ⚠️ 30% failure rate in 08:30-08:45 time window (15/50 journeys)
    • 🚦 High congestion period (95% congestion level)
  </div>
</details>
```

##### C. Selected Route Intelligence Analysis
Expandable detailed breakdown:
```tsx
<div className="bg-zinc-50 border rounded-lg p-6">
  <h3>Route Intelligence Analysis</h3>
  
  {/* Main RCI */}
  <div>
    <span>Reliability Confidence Index (RCI)</span>
    <span className="text-2xl text-green-600">72%</span>
  </div>
  <div className="w-full bg-zinc-200 h-3">
    <div className="bg-green-600 h-3" style={{width: "72%"}} />
  </div>
  <span className="badge bg-yellow-100 border-yellow-300">MEDIUM CONFIDENCE</span>
  
  {/* Explanation */}
  <div className="bg-blue-50">
    💡 Why this score?
    ⚠️ Moderately reliable (RCI: 72%). Route has 8% failure penalty...
  </div>
  
  {/* Detailed Breakdown */}
  <details>
    <summary>📊 Detailed Breakdown</summary>
    
    {/* Before/After */}
    <div>
      <div>Base RCI (before adjustments): 85%</div>
      <div>Final RCI (after intelligence): 72%</div>
      <div>Net Change: -13.0%</div>
    </div>
    
    {/* Adjustments */}
    <div>
      <div>⚠️ Failure History Penalty: -8.0%</div>
      <div>⏰ Time Window Penalty: -5.0%</div>
      <div>🔴 OSINT Zone Penalty: -2.0%</div>
      <div>👤 Persona Bonus: +2.0%</div>
    </div>
    
    {/* Risk Factors */}
    <div className="bg-amber-50 border-amber-200">
      🚨 Identified Risk Factors:
      • ⚠️ 30% failure rate in 08:30-08:45 time window (15/50 journeys)
      • 📊 Avg delay: 18 min in past failures
      • 🚦 High congestion period (95% congestion level)
      • ⏱️ Typical delay: +30 min at this time
    </div>
  </details>
</div>
```

---

## How It Works (User Journey)

### 1. User Selects Route
- Start: Mumbai Central (19.23, 72.86)
- End: CSMVS Museum (19.17, 72.95)
- Time: 8:35 AM (rush hour)
- Persona: SAFE_PLANNER

### 2. System Calculates Routes
OSRM returns 2-3 alternative routes:
- Route A: 18 km, 25 min ETA
- Route B: 20 km, 31 min ETA
- Route C: 19 km, 28 min ETA

### 3. Enhanced RCI Calculation
For each route, system:

1. **Generates route signature**: `19.23_72.86_19.17_72.95`
2. **Buckets current time**: `08:30-08:45`
3. **Looks up failure history**:
   - Found: 15 failures out of 50 journeys (30% failure rate)
   - Avg delay in failures: 18 minutes
   - Applies: -8% RCI penalty

4. **Checks time-window pattern**:
   - Rush hour period: reliability_multiplier = 0.55
   - Congestion level: 0.95 (very high)
   - Typical delay: +30 minutes
   - Applies: -5% RCI penalty

5. **Queries OSINT zones**:
   - Route passes through congestion zone (severity: 4)
   - Overlap: 15% of route
   - Applies: -2% RCI penalty

6. **Applies persona adjustments**:
   - User is SAFE_PLANNER
   - Prefers reliable routes
   - Adds: +2% RCI bonus (for already reliable routes)

7. **Computes final RCI**:
   ```
   Base RCI: 85%
   - Failure penalty: -8%
   - Time window penalty: -5%
   - OSINT penalty: -2%
   + Persona bonus: +2%
   = Final RCI: 72% (MEDIUM confidence)
   ```

### 4. Route Ranking
System sorts routes by RCI (not ETA):
1. **Route B**: 31 min, 82% RCI (HIGH) ✅ **RECOMMENDED**
2. Route C: 28 min, 75% RCI (HIGH)
3. Route A: 25 min, 55% RCI (MEDIUM) ⚠️

### 5. User Sees Explanation
```
✅ Route B recommended: 27% more reliable, despite being 6 min slower. 
Reliability prioritized.

📊 Intelligence Analysis:
- Route B has HIGH confidence (82% RCI)
- Route A is fastest but has MEDIUM confidence (55% RCI)
- Route A affected by:
  ⚠️ 30% failure rate in 08:30-08:45 window
  🚦 High congestion (95% level)
  ⏱️ Typical delay: +30 min at this time
```

### 6. User Decision
- **Option 1**: Select Route B (recommended, reliable)
- **Option 2**: Select Route A (faster, riskier)
- System respects user choice but provides full transparency

---

## Data Structures

### Failure History Record
```typescript
{
  route_signature: "19.23_72.86_19.17_72.95",
  time_window: "08:30-08:45",
  failure_count: 15,
  total_journeys: 50,
  avg_delay_minutes: 18,
  last_failure_date: "2026-02-04"
}
```

### Time Window Pattern
```typescript
{
  time_window: "08:30-08:45",
  reliability_multiplier: 0.55,  // 45% less reliable
  typical_delay_minutes: 30,
  congestion_level: 0.95
}
```

### Enhanced RCI Result
```typescript
{
  rci: 0.72,
  original_rci: 0.85,
  explanation: "⚠️ Moderately reliable (RCI: 72%)...",
  failure_penalty: 0.08,
  time_window_penalty: 0.05,
  osint_penalty: 0.02,
  persona_bonus: 0.02,
  components: {
    on_time_prob: 0.68,
    transfer_success: 0.75,
    crowd_stability: 0.70,
    delay_variance: 0.72,
    last_mile_avail: 0.85
  },
  risk_factors: [
    "⚠️ 30% failure rate in 08:30-08:45 time window",
    "🚦 High congestion period (95% congestion level)"
  ],
  confidence_level: "MEDIUM"
}
```

---

## Key Benefits

### 1. Transparency
Users see exactly **why** a route is recommended:
- Failure history data
- Time-window patterns
- OSINT zone impacts
- Persona adjustments

### 2. Reliability Over Speed
Unlike Google Maps, system prioritizes:
- On-time arrival probability
- Historical consistency
- Risk mitigation

### 3. Context-Aware
Considers:
- **Time of day**: Different reliability at rush hour vs off-peak
- **User preferences**: SAFE_PLANNER vs RUSHER
- **Real-time alerts**: OSINT zones for disruptions
- **Historical patterns**: Routes that failed before

### 4. Actionable Insights
Users can make informed decisions:
- "Route A is faster but risky" → Choose based on urgency
- "Route B is slower but reliable" → Choose for important meetings
- Risk factors listed explicitly → Know what to expect

---

## Future Enhancements

### 1. Real Failure Tracking
Replace simulated data with actual journey outcomes:
```typescript
// After journey completion
recordJourneyOutcome({
  route_signature,
  time_window,
  planned_eta: 25,
  actual_eta: 43,
  delay: 18,
  failed: true,  // Delay > 10 min threshold
  failure_reason: "Accident on bridge"
});
```

### 2. Machine Learning
Train models on historical data:
- Predict failure probability by time/route
- Identify failure patterns (e.g., "Fridays at 5 PM")
- Personalize RCI weights per user

### 3. Community Feedback
Allow users to report:
- "Route was unreliable"
- "Congestion worse than predicted"
- Updates to OSINT zones

### 4. Dynamic RCI Updates
Recalculate RCI during journey:
- New OSINT alert → Suggest reroute
- Delay detected → Update ETA and RCI
- Traffic cleared → Upgrade RCI

### 5. Multi-Modal RCI
Extend to trains/flights:
- Train reliability by time window
- Flight delay probability
- Transfer success rates

---

## Testing

### Test Case 1: Rush Hour Route
```
Start: 19.23, 72.86
End: 19.17, 72.95
Time: 08:35 AM

Expected:
- Route A: 25 min, 55% RCI (MEDIUM) - ⚠️ Risky
- Route B: 31 min, 82% RCI (HIGH) - ✅ Recommended

System should recommend Route B despite +6 min ETA
```

### Test Case 2: Off-Peak Route
```
Start: Same
End: Same
Time: 11:00 AM

Expected:
- Route A: 22 min, 88% RCI (HIGH)
- Route B: 28 min, 90% RCI (HIGH)

System may recommend Route A (faster, still reliable)
```

### Test Case 3: OSINT Zone Impact
```
Route passes through protest zone (severity: 5)

Expected:
- RCI drops by 10-15%
- Risk factor: "🔴 Route affected by 1 OSINT zone"
- Explanation mentions advisory zone
```

---

## Summary

This implementation transforms routing from **fastest-path** to **most-reliable-path** optimization:

- **Traditional**: "Fastest route is 25 min"
- **RCI-Based**: "Most reliable route is 31 min (82% RCI), 6 min slower but 27% more likely to arrive on time"

The system provides **full transparency** through:
- Detailed RCI breakdowns
- Risk factor explanations
- Penalty/bonus visibility
- Route comparison insights

Users make **informed decisions** based on their priorities:
- Need speed? Accept lower RCI
- Need reliability? Choose higher RCI
- Always know the tradeoffs

---

## Files Changed

| File | Type | Changes |
|------|------|---------|
| `app/lib/enhanced-rci.ts` | NEW | Enhanced RCI calculation with failure history, time windows, personas |
| `app/api/routes/generate/route.ts` | MODIFIED | Integrated enhanced RCI, sorted by reliability, added comparisons |
| `app/dashboard/page.tsx` | MODIFIED | Enhanced UI with RCI displays, explanations, risk factors, breakdowns |

---

## Screenshots Reference

### Route Cards
- Large RCI percentage (72%) with color coding
- Confidence badge (HIGH/MEDIUM/LOW)
- Penalties breakdown (-8%, -5%, -2%)
- Explanation text
- Expandable risk factors

### Intelligence Banner
- "Route sorted by reliability, not speed"
- Comparison: Most reliable vs ETA difference
- Reliability gain calculation

### Selected Route Panel
- Main RCI display with progress bar
- Confidence badge
- Explanation box
- Detailed breakdown (collapsible):
  - Base RCI vs Final RCI
  - All adjustments listed
  - Risk factors with icons

---

**Implementation Status**: ✅ Complete
**Next Steps**: Test with real users, gather feedback, refine explanations
