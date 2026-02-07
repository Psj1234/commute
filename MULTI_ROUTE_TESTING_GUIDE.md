# Multi-Route Feature — Testing Guide

## Setup & Prerequisites

### Requirements
- Node.js 18+
- npm or pnpm
- Workspace: `c:\Users\tatva\Downloads\hackathon\commute`
- Next.js dev server running

### Start Dev Server

```bash
cd c:\Users\tatva\Downloads\hackathon\commute
npm run dev
# OR
pnpm dev
```

**Expected Output:**
```
▲ Next.js 16.0.0
- Local: http://localhost:3000
- Environments: .env.local

✓ ready - started server on 0.0.0.0:3000
```

Open: http://localhost:3000/multi-routes

---

## Test 1: UI Component Rendering

### Objective
Verify MultiRouteViewer component renders without errors

### Steps
1. Navigate to http://localhost:3000/multi-routes
2. Open browser DevTools (F12)
3. Check Console tab for errors
4. Verify page loads ("Comparison View" should be visible)

### Expected Results
✅ No console errors  
✅ Header: "🔁 Multi-Route Output Feature"  
✅ Section: "How It Works"  
✅ Demo section with route cards visible  
✅ Route comparison table displayed  

### Screenshot Checklist
- [ ] Header visible
- [ ] 3 route cards shown (Road, Train, Multi-Modal)
- [ ] Location selectors (Start/End dropdowns)
- [ ] Time picker visible
- [ ] Persona buttons (Rusher, Safe Planner, etc.)
- [ ] Route details expandable

---

## Test 2: Location Selector

### Objective
Verify dropdown selection works and triggers API call

### Steps
1. On multi-routes page, find "Select Start Location" dropdown
2. Click dropdown (should show: Andheri, Bandra, Dadar, CST)
3. Select different location
4. Observe route updates

### Current Limitation
⚠️ Currently hardcoded for Andheri→CST only
Expected: Dropdowns work but routes may not change (demo limitation)

### Expected Results
✅ Dropdowns are clickable  
✅ 4 locations available per dropdown  
✅ No errors in console  
✅ Selection persists visually  

### Test Points
```
Start: Andheri, End: CST → 3 routes displayed
Start: Bandra, End: CST → Currently defaults to Andheri→CST (expected)
Start: Andheri, End: Bandra → Currently defaults to Andheri→CST (expected)
Start: CST, End: Andheri → Currently defaults to Andheri→CST (expected)
```

---

## Test 3: Time Picker

### Objective
Verify time changes affect route scoring and ETA

### Steps
1. Find time picker (should show "09:30" by default)
2. Click time input and change to different hour (e.g., 14:00)
3. Observe route scores changing
4. Change to 22:00 (late night) and observe further changes

### Expected Behavior

| Time | Car Traffic | Train Crowd | Best Route |
|------|------------|------------|-----------|
| 08:30 (rush) | 🟥 Heavy | 🟥 Peak | Train usually #1 |
| 14:00 (mid-day) | 🟩 Light | 🟩 Light | Road improves |
| 18:30 (evening) | 🟥 Heavy | 🟥 Peak | Depends on persona |
| 22:00 (night) | 🟩 Light | 🟩 Light | All scores improve |

### Test Cases
```
09:30 Safe Planner → Train #1 (score 0.88)
14:00 Safe Planner → Train still #1 (score ~ 0.85)
08:00 Rusher → Road likely #1 (score ~ 0.82)
22:00 Rusher → Road score higher (score ~ 0.76)
```

### Expected Results
✅ Time updates without page refresh  
✅ Route scores change visibly  
✅ ETA updates reflect traffic  
✅ No console errors  

---

## Test 4: Persona Button Selection

### Objective
Verify persona selection immediately re-ranks routes

### Steps
1. Note current route order (Safe Planner @ 09:30 = Train #1)
2. Click "⚡ Rusher" button
3. Observe route order changes (Road should move to #1)
4. Click "🧭 Explorer" button
5. Observe Multi-Modal moves up in ranking

### Expected Persona Rankings @ 09:30

**Safe Planner:**
1. 🚆 Train (0.88) ⭐
2. 🔁 Multi-Modal (0.65)
3. 🚗 Road (0.52)

**Rusher:**
1. 🚗 Road (0.82) ⭐
2. 🚆 Train (0.68)
3. 🔁 Multi-Modal (0.61)

**Comfort Seeker:**
1. 🚗 Road (0.85) ⭐
2. 🔁 Multi-Modal (0.72)
3. 🚆 Train (0.35)

**Explorer:**
1. 🔁 Multi-Modal (0.79) ⭐
2. 🚆 Train (0.71)
3. 🚗 Road (0.48)

### Expected Results
✅ Buttons clickable  
✅ Route order changes immediately per persona  
✅ Top route (⭐) changes per selection  
✅ Scores update in real-time  
✅ Explanation text changes  

---

## Test 5: Route Cards Display

### Objective
Verify route information displayed correctly

### Steps
1. With Safe Planner selected @ 09:30
2. Examine Route #1 (Train) card
3. Verify all fields present
4. Click on route to expand (if expandable)

### Information to Verify

**Route Card Should Show:**
- [ ] Rank number (1, 2, 3)
- [ ] Route name (🚗, 🚆, or 🔁 emoji)
- [ ] Persona match score (0-100%)
- [ ] Overall traffic signal (🟥, 🟨, 🟩)
- [ ] Distance (e.g., "16.2 km")
- [ ] ETA (e.g., "52 min")
- [ ] Route explanation text
- [ ] Mode types (Car, Train, Multi-Modal)

**Example Route Card (Train, Rank 1):**
```
═══════════════════════════════════
🚆 Andheri → CST (Train)

Persona Score: 88% ⭐
Overall: 🟥 Red (Crowd Heavy)

Distance: 16.2 km
ETA: 52 min

Why Ranked #1:
"Train most reliable in peak hours
Moderate crowds acceptable"

Segments: 2
Transfers: 1
═══════════════════════════════════
```

### Expected Results
✅ All fields populated  
✅ Scores between 0-1 range  
✅ Signals are emojis (🟥🟨🟩)  
✅ Explanations make sense  
✅ No "undefined" or null values  

---

## Test 6: Route Comparison Table

### Objective
Verify side-by-side route comparison works

### Steps
1. Look for comparison table/section
2. Verify all 3 routes visible with key metrics
3. Check if selected route is highlighted

### Table Should Show

| Route | Type | Distance | ETA | Score | Signal |
|-------|------|----------|-----|-------|--------|
| #1 | 🔁 Multi-Modal | 20.8 km | 58 min | 79% | 🟨 |
| #2 | 🚆 Train | 16.2 km | 52 min | 71% | 🟥 |
| #3 | 🚗 Road | 18.5 km | 45 min | 48% | 🟩 |

### Expected Results
✅ All 3 routes visible  
✅ Metrics align with API response  
✅ Selected route visually distinct  
✅ Table scrolls if needed  

---

## Test 7: API Endpoint Direct Test

### Objective
Verify backend API returns correct multi-route response

### Steps
1. Open Terminal
2. Run curl command (or use Postman/VS Code REST Client)
3. Observe JSON response
4. Verify ranking and scores

### Test Command 1: Safe Planner Morning

```bash
curl "http://localhost:3000/api/routes/personalized?start=Andheri&end=CST&persona=SAFE_PLANNER&time=09:30"
```

**Response Should Include:**
```json
{
  "persona": "SAFE_PLANNER",
  "time": "09:30",
  "start": "Andheri",
  "end": "CST",
  "total_routes": 3,
  "routes": [
    {
      "rank": 1,
      "id": "andheri-cst-train",
      "name": "🚆 Andheri → CST (Train)",
      "persona_score": 0.88,
      "explanation": "Train most reliable..."
    },
    // ... route 2 and 3
  ]
}
```

### Test Command 2: Rusher @ 09:30

```bash
curl "http://localhost:3000/api/routes/personalized?start=Andheri&end=CST&persona=RUSHER&time=09:30"
```

**Expected Change:**
- Route #1 should be 🚗 Road (not Train)
- Road score should be ~0.82 (higher than Safe Planner's ~0.52)

### Test Command 3: Late Night (22:00)

```bash
curl "http://localhost:3000/api/routes/personalized?start=Andheri&end=CST&persona=SAFE_PLANNER&time=22:00"
```

**Expected Changes:**
- All scores should be slightly higher (light traffic, low crowds)
- Train score ~0.90+ (even better off-peak)
- Road score ~0.75+ (light traffic helps)

### API Response Validations

✅ Status: 200 OK  
✅ Content-Type: application/json  
✅ Routes array has 3 items  
✅ Routes sorted by rank (1, 2, 3)  
✅ Persona scores range 0-1  
✅ Explanations are non-empty strings  
✅ Coordinates present (lat, lng)  
✅ Segments have traffic_density and crowd_score  

---

## Test 8: Segment-Level Details

### Objective
Verify route segments display coordinates and metrics

### Steps
1. Expand a route (if expansion feature available)
2. Look for segment breakdown
3. Verify each segment shows start/end coordinates
4. Check traffic and crowd indicators per segment

### Expected Segment Structure (Train Route)

**Segment 1: Andheri → Dadar**
- Mode: 🚆 Train
- Distance: 10.1 km
- ETA: 35 min
- Start: [19.1197, 72.8468]
- End: [19.0176, 72.8562]
- Crowd: 0.72 🟥
- Incident Rate: 0.08

**Segment 2: Dadar → CST**
- Mode: 🚆 Train
- Distance: 6.1 km
- ETA: 17 min
- Start: [19.0176, 72.8562]
- End: [18.9402, 72.8356]
- Crowd: 0.68 🟨
- Incident Rate: 0.06

### Expected Results
✅ Correct segment count (Train: 2, Road: 1, Multi-Modal: 4)  
✅ Valid coordinates (lat/lng in valid range)  
✅ Metrics align with route totals  
✅ All segments have signals  

---

## Test 9: Coordinate Validation

### Objective
Verify all coordinates are geographically accurate

### Coordinates Reference

```json
{
  "ANDHERI": [19.1197, 72.8468],
  "BANDRA": [19.0544, 72.8400],
  "DADAR": [19.0176, 72.8562],
  "CST": [18.9402, 72.8356]
}
```

### Verify in Response
1. Check API response includes these exact coordinates
2. Verify distances are realistic:
   - Andheri to CST: ~18-20 km ✓
   - Bandra to Dadar: ~6-7 km ✓
   - Andheri to Bandra: ~7 km ✓

### Map Visualization Check (if available)
1. If map component present, verify pins placed correctly
2. Routes should show as logical paths between coordinates
3. Mumbai should be visible (coordinates are in Mumbai bounds)

### Expected Results
✅ All coordinates in Mumbai bounds (Lat 19±0.2, Lng 72.8±0.2)  
✅ Coordinates match MUMBAI_STATIONS constant  
✅ Distances realistic for Mumbai transit  

---

## Test 10: Error States & Edge Cases

### Edge Case 1: Missing Parameters

```bash
# No persona provided (should default to SAFE_PLANNER)
curl "http://localhost:3000/api/routes/personalized?start=Andheri&end=CST"

# Expected: Returns routes ranked for SAFE_PLANNER
```

### Edge Case 2: Invalid Persona

```bash
# Typo in persona
curl "http://localhost:3000/api/routes/personalized?start=Andheri&end=CST&persona=INVALID_PERSONA"

# Expected: Either error message OR defaults to SAFE_PLANNER
```

### Edge Case 3: Unsupported Route Pair

```bash
# Locations not in hardcoded demo
curl "http://localhost:3000/api/routes/personalized?start=Delhi&end=Bangalore"

# Expected: Either error OR defaults to Andheri→CST
```

### Edge Case 4: Invalid Time Format

```bash
# Invalid time
curl "http://localhost:3000/api/routes/personalized?start=Andheri&end=CST&time=25:99"

# Expected: Either error OR defaults to 09:30
```

### Expected Results
✅ No 500 errors  
✅ Graceful defaults or clear error messages  
✅ No unhandled exceptions in console  

---

## Test 11: Performance Test

### Objective
Verify API response time is acceptable

### Measurement
```bash
# Time 10 consecutive requests
time curl "http://localhost:3000/api/routes/personalized?start=Andheri&end=CST&persona=SAFE_PLANNER&time=09:30"
```

### Expected Performance
- First request: ~50-100ms
- Subsequent requests: ~10-50ms
- All responses: <200ms

### Load Test (Advanced)
```bash
# Install Apache Bench (if available)
ab -n 100 -c 10 "http://localhost:3000/api/routes/personalized?start=Andheri&end=CST"

# Expected: No failed requests, average <50ms
```

---

## Test 12: Browser Console Check

### Objective
Verify no errors or warnings in browser

### Steps
1. Open DevTools (F12)
2. Clear console
3. Refresh page (`http://localhost:3000/multi-routes`)
4. Check for errors (red 🔴), warnings (yellow ⚠️)

### Expected Results
✅ No red errors  
✅ Minimal warnings (ideally 0)  
✅ All images loaded  
✅ No failed API calls (404, 500)  

### Acceptable Warnings
- Tailwind CSS related (if v4 syntax updates pending)
- Next.js hydration (if minor)
- TypeScript warnings (not critical)

### Unacceptable Errors
- ❌ Undefined variables
- ❌ require() not found
- ❌ Module import failures
- ❌ API endpoint 404
- ❌ Unhandled promise rejections

---

## Test 13: Real-Time Re-Ranking

### Objective
Verify changing persona instantly re-ranks without page reload

### Steps
1. Start @ Safe Planner, 09:30 (Train #1)
2. Click "⚡ Rusher" (Road should move to #1)
3. Click "🧭 Explorer" (Multi-Modal should move to #1)
4. Click back "🛡️ Safe Planner" (Train back to #1)
5. Change time to "14:00" (scores update)
6. Change time back to "09:30" (scores revert)

### Success Criteria
✅ Each change updates instantly (<500ms)  
✅ No page refresh  
✅ No flickering  
✅ Smooth transitions  
✅ Correct ranking each time  

---

## Test 14: Component Integration

### Objective
Verify MultiRouteViewer integrates correctly with page

### Steps
1. Check that MultiRouteViewer renders on /multi-routes page
2. Verify it's not isolated (interacts with full page context)
3. Test selecting different personas updates page state
4. Check time changes affect all visible routes

### Expected Results
✅ Component visible on page  
✅ All buttons functional  
✅ State management working  
✅ Parent page reflects changes  

---

## Test Automation Checklist

### Pre-Test
- [ ] Dev server running (`npm run dev`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Port 3000 available
- [ ] Browser (Chrome/Firefox/Safari) open

### Core Tests
- [ ] Test 1: UI Renders ✓
- [ ] Test 2: Location Selector ✓
- [ ] Test 3: Time Picker ✓
- [ ] Test 4: Persona Buttons ✓
- [ ] Test 5: Route Cards ✓
- [ ] Test 6: Comparison Table ✓
- [ ] Test 7: API Response ✓
- [ ] Test 8: Segment Details ✓
- [ ] Test 9: Coordinates ✓
- [ ] Test 10: Edge Cases ✓
- [ ] Test 11: Performance ✓
- [ ] Test 12: Console ✓
- [ ] Test 13: Re-Ranking ✓
- [ ] Test 14: Integration ✓

### Sign-Off
- [ ] All core tests pass
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] Ready for demo

---

## Troubleshooting

### Issue: Page loads but routes not visible

**Check:**
```bash
# Verify API endpoint exists
curl http://localhost:3000/api/routes/personalized
```

**Fix:**
- Rebuild: `npm run build`
- Restart server: `npm run dev`
- Check `app/api/routes/personalized/route.ts` exists

---

### Issue: Persona buttons don't work

**Check:**
```javascript
// In browser console, test directly:
fetch('/api/routes/personalized?persona=RUSHER')
  .then(r => r.json())
  .then(console.log)
```

**Fix:**
- Clear browser cache (Ctrl+Shift+Delete)
- Reload page (Ctrl+F5)
- Check React hooks in MultiRouteViewer.tsx

---

### Issue: Scores show as 0 or NaN

**Check:**
- API response persona_score field
- Calculation in persona-traffic-ranker.ts
- PERSONA_PROFILES weights sum to 1.0

**Fix:**
- Verify rankRoutesByPersona() calculation
- Check for division by zero
- Validate all weights present

---

### Issue: "localhost refused to connect"

**Fix:**
```bash
# Kill port 3000 if in use
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Restart dev server
npm run dev
```

---

## Sign-Off Template

```
✅ MULTI-ROUTE FEATURE TESTING COMPLETE

Date: _______________
Tester: _______________

Results:
- UI Rendering: ✓ PASS
- Location Selection: ✓ PASS
- Time Picker: ✓ PASS
- Persona Selection: ✓ PASS
- Route Display: ✓ PASS
- API Response: ✓ PASS
- Coordinates: ✓ PASS
- Performance: ✓ PASS
- Console Errors: ✓ NONE

Critical Issues: NONE
Blocking Issues: NONE

Status: 🟩 READY FOR PRODUCTION

Notes:
_____________________________________________________________________

Sign-Off: _______________
```

---

## Next Steps After Testing

✅ All tests pass → **Ready for Demo**  
✅ Minor issues → Fix and re-test  
✅ Critical issues → Escalate  

**Demo Ready Checklist:**
- [ ] Multi-routes page loads without errors
- [ ] All 3 routes display correctly
- [ ] Persona selection works
- [ ] Time picker functional
- [ ] API responds with valid data
- [ ] Explanations clear and accurate
- [ ] No console errors

🚀 **Feature Complete!**
