# 🧭 Persona-Based Traffic-Aware Routing — Quick Start

## 5-Minute Demo

### 1. Start the App
```bash
npm run dev
# Open http://localhost:3000
```

### 2. Navigate to Persona Routes
Click **"Explore Personas"** on homepage OR go directly to: **http://localhost:3000/persona/routes**

### 3. Interact with the Demo
- **Select Persona**: Click one of 4 personas (Rusher ⚡, Safe Planner 🛡️, Comfort Seeker 🛋️, Explorer 🧭)
- **Choose Time**: Adjust departure time to see traffic variations
  - 7-10 AM = Morning rush (high traffic & crowds)
  - 10 AM-4 PM = Mid-day (light traffic)
  - 4-8 PM = Evening rush (moderate traffic)
  - 8 PM+ = Late night (light traffic)
- **Expand Segments**: Click each route segment to see detailed breakdown
- **View Signals**: 
  - 🟥 Red = Heavy congestion/crowd
  - 🟨 Yellow = Moderate flow
  - 🟩 Green = Free flow

---

## 4 Personas Explained

### ⚡ Rusher
**"Fastest route with acceptable confidence"**
- Prefers: 🚗 Car, 🚕 Cab
- Tolerates: High traffic, low crowd
- Best for: Business meetings, time-critical commutes
- Avoids: 🚌 Buses (too slow)

### 🛡️ Safe Planner (Default)
**"Most reliable route"**
- Prefers: 🚇 Metro, 🚆 Train
- Tolerates: Low traffic preference, high crowd tolerance
- Best for: Daily commutes, predictable schedules
- Reason: Transit more reliable than roads in rush hours

### 🛋️ Comfort Seeker
**"Least crowded, fewer transfers"**
- Prefers: 🚗 Car, 🚕 Cab (alone or small groups)
- Avoids: 🚆 Train, 🚇 Metro (too crowded at peak)
- Best for: Premium experience, stress-free commutes
- Trade-off: May take longer if traffic exists

### 🧭 Explorer
**"Balanced & non-obvious routes"**
- Prefers: 🚴 Bike, 🚶 Walk, 🚌 Bus
- Tolerates: High traffic, high crowds (novel experience)
- Best for: Discovery, local experience, flexible timing
- Vibe: Adventurous commuting

---

## 📊 How Route Scoring Works

For **each route** and **selected persona**, the system calculates:

```
PersonaScore = (Mode Preference × weight1)
             + (Traffic Alignment × weight2)
             + (Crowd Alignment × weight3)
             + (Reliability Score × weight4)
```

**Weight distribution by persona:**

| Aspect | RUSHER | SAFE_PLANNER | COMFORT_SEEKER | EXPLORER |
|--------|--------|--------------|----------------|----------|
| **Mode** | 40% | 30% | 35% | 35% |
| **Traffic** | 30% | 20% | 15% | 20% |
| **Crowd** | 10% | 15% | 40% | 25% |
| **Reliability** | 20% | 35% | 10% | 20% |

---

## 🚦 Traffic Signal Logic

### Red 🟥 (Heavy)
```
Triggered when:
- Traffic density > 0.7 (road congestion)
OR
- Crowd score > 0.7 (train/bus very full)

Impact:
- Rusher accepts it (tolerates high traffic)
- Safe Planner avoids it (prefers reliability)
- Comfort Seeker avoids it (prefers emptiness)
- Explorer embraces it (observation opportunity)
```

### Yellow 🟨 (Moderate)
```
Triggered when:
- Traffic density 0.4-0.7
OR
- Crowd score 0.4-0.7

Impact:
- All personas accept (reasonable compromise)
- Good for balanced routes
```

### Green 🟩 (Free)
```
Triggered when:
- Both traffic density < 0.4
AND
- Crowd score < 0.4

Impact:
- Everyone happy
- Fastest travel times
- Low stress
```

---

## 📍 Mumbai Demo Route Segments

**Complete Route: Bandra → CST (9:30 AM)**

1. **🚗 Bandra → Andheri (Car)**
   - 8.2 km, 18 min (base)
   - Traffic: 0.91 🟥 (Western Express Road morning rush)
   - Crowd: 0.15 🟩 (cars empty)
   - **~27 min adjusted** (due to traffic)

2. **🚶 Andheri Station Entry (Walk)**
   - 0.15 km, ~3 min
   - Crowd: 0.65 🟨 (station entrance)

3. **🚆 Andheri → Dadar (Central Line Train)**
   - 12.8 km, 35 min
   - Crowd: 0.68 🟨 (morning peak hour)
   - **~38 min adjusted**

4. **🚇 Dadar → CST (Metro)**
   - 2.1 km, 12 min
   - Crowd: 0.72 🟥 (peak hour metropolitan)
   - **~13 min adjusted**

5. **🚶 CST Exit (Walk)**
   - 0.2 km, ~4 min
   - Crowd: 0.45 🟨

**Total: ~24.5 km, ~95-105 min (adjusted)**

---

## 🔗 API Endpoints

### GET `/api/routes/personalized`

Fetch personalized routes programmatically.

**Query Parameters:**
- `persona` – RUSHER | SAFE_PLANNER | COMFORT_SEEKER | EXPLORER
- `time` – HH:MM (e.g., "14:30")
- `routeId` – Optional, filter to specific route

**Examples:**

```bash
# Default (Safe Planner at 9:30 AM)
curl http://localhost:3000/api/routes/personalized

# Rusher at morning rush
curl http://localhost:3000/api/routes/personalized?persona=RUSHER&time=09:30

# Comfort Seeker at evening rush
curl http://localhost:3000/api/routes/personalized?persona=COMFORT_SEEKER&time=18:30

# Explorer at night
curl http://localhost:3000/api/routes/personalized?persona=EXPLORER&time=22:00
```

**Returns:**
```json
{
  "persona": "SAFE_PLANNER",
  "time": "09:30",
  "routes": [
    {
      "id": "mumbai-bandra-cst-0930",
      "name": "Bandra → CST",
      "persona_score": 0.78,
      "explanation": "High reliability in peak hours • Preferred modes included",
      "segments": [ { /* detailed segment data */ } ]
    }
  ]
}
```

---

## 💡 Use Cases

### Use Case 1: Business Meeting (9:00 AM)
```
Persona: RUSHER
Time: 08:45
→ System suggests car even with traffic
→ Score: 0.82 (speed prioritized)
→ ETA: 27 min (faster than train)
```

### Use Case 2: Daily Commute (Rush Hour)
```
Persona: SAFE_PLANNER (default)
Time: 09:30
→ System suggests train despite crowds
→ Score: 0.88 (reliability prioritized)
→ Reasoning: "Metro most reliable in peak hour"
```

### Use Case 3: Premium Experience (Any time)
```
Persona: COMFORT_SEEKER
Time: 17:45
→ System suggests car (private space)
→ Score: 0.85 (comfort prioritized)
→ Trade-off: "Accepts moderate traffic for space"
```

### Use Case 4: Flexible Commute (Off-peak)
```
Persona: EXPLORER
Time: 14:00
→ System suggests mixed-mode (walk + bus + metro)
→ Score: 0.79 (balanced, novel experience)
→ Reason: "Local experience with reasonable timing"
```

---

## 🧪 Testing Checklist

- [ ] Can select all 4 personas
- [ ] Persona change instantly re-ranks route
- [ ] Persona score updates (0-1 range)
- [ ] Time picker shows traffic variations
- [ ] Segment expansion shows all details
- [ ] Coordinates are valid (Mumbai-area)
- [ ] Signals match traffic/crowd levels
- [ ] Explanations make sense for persona
- [ ] API endpoint returns valid JSON
- [ ] API scores match UI scores

---

## 🚀 Next Steps

### For Demo
1. Run app: `npm run dev`
2. Go to `/persona/routes`
3. Try each persona with different times
4. Take screenshots for presentations

### For Integration
1. Call `/api/routes/personalized` with user's persona
2. Display ranked routes in your app
3. Show persona explanations for transparency
4. Allow persona switching for exploration

### For Enhancement
1. Add real traffic APIs (Google Maps, HERE)
2. Integrate actual GTFS transit data
3. Implement ML persona detection
4. Add more cities/routes
5. Enable sharing with friends

---

## 🎯 Key Takeaways

✅ **Non-Breaking**: Existing routes untouched, persona is additive layer
✅ **Transparent**: Clear explanations for every ranking decision
✅ **Realistic**: Mock data based on real Mumbai commute patterns
✅ **Interactive**: Instant demo with time/persona changes
✅ **Scalable**: Easy to add APIs, ML, multi-city support

🎬 **demo.commute.local/persona/routes** ← Start here!
