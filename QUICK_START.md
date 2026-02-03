# Quick Start Guide — Commute Intelligence Engine

## 🚀 Get Running in 2 Minutes

### Step 1: Install Dependencies
```bash
cd c:\Users\tatva\Downloads\hackathon\commute
npm install
```

### Step 2: Set Up Database
The `.env` file already contains your PostgreSQL connection string (Neon).

```bash
# Generate Prisma client
npx prisma generate

# Optionally, sync database schema (if tables don't exist)
npx prisma db push
```

### Step 3: Start Development Server
```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🎯 What You Get

### 5 Fully Functional Pages

1. **Landing Page** (`/`)
   - Explains the problem: "Fastest ≠ Most Reliable"
   - Shows 7-step system overview
   - CTA to view demo

2. **Dashboard** (`/dashboard`)
   - Route selection panel
   - RCI confidence scores
   - Failure risk indicators
   - "Simulate Delay Event" demo button
   - Quick links to other pages

3. **Routes Comparison** (`/routes`)
   - Side-by-side route analysis
   - RCI breakdown (35% on-time + 25% transfers + 20% crowd + 10% variance + 10% last-mile)
   - Failure risk explanation
   - When to choose each route

4. **Alerts & Hotspots** (`/alerts`)
   - Active alert zones (construction, safety, emergency)
   - Failure hotspot explanations
   - Time-window specificity callout
   - Severity levels

5. **Persona** (`/persona`)
   - Your inferred commute style (RUSHER, SAFE_PLANNER, COMFORT_SEEKER, EXPLORER)
   - Confidence score
   - How persona affects routing
   - Explanation of all four types

---

## 🧪 Demo Interactions

### On the Dashboard:

1. **"Simulate Delay Event"** button
   - Increases failure score for downtown zone
   - Simulates what happens when delays occur
   - Recalculates route confidence

2. **Route Selection**
   - Click any route to select it
   - View its RCI and failure risk
   - See key metrics: distance, ETA, crowd level

3. **Navigation**
   - "Compare Routes" link → detailed route analysis
   - "View Your Persona" link → your commute style
   - "Back" links throughout for easy navigation

---

## 🏗️ System Architecture

```
┌─────────────┐
│   Browser   │
│  (Next.js   │
│  Frontend)  │
└──────┬──────┘
       │
       ├──────► /api/journey/start       (Start journey)
       ├──────► /api/journey/end         (End journey)
       ├──────► /api/routes/get          (Fetch routes + RCI)
       ├──────► /api/persona             (Infer user persona)
       └──────► /api/alerts/zones        (Get alert zones)
       │
       ▼
┌─────────────────────────────────┐
│  Backend (Next.js API Routes)   │
│  ├─ Intelligence Engine         │
│  ├─ Persona Inference           │
│  ├─ Simulated Data              │
│  └─ Failure Detection           │
└─────────────┬───────────────────┘
              │
              ▼
      ┌──────────────────┐
      │   PostgreSQL     │
      │  (Neon Hosted)   │
      │                  │
      │ Users            │
      │ Journeys         │
      │ Events           │
      │ Routes           │
      │ Personas         │
      │ Alert Zones      │
      └──────────────────┘
```

---

## 🧠 Intelligence Engine

### Core Concepts

1. **Event Detection**
   - DELAY: Arrival > Expected by 5+ minutes
   - IDLE: User stationary 3+ minutes
   - REROUTE: User changes planned route

2. **Time-Window Bucketing**
   - Divides day into 15-minute intervals
   - Example: 08:45 → "08:30-08:45"
   - Prevents permanent location labeling

3. **Failure Scoring**
   - Combines delay probability, reroute rate, wait time
   - Threshold: 0.4 = hotspot
   - Formula: `0.4×delay_prob + 0.3×reroute_rate + 0.3×normalized_wait`

4. **Route Confidence Index (RCI)**
   - 0-1 score predicting on-time arrival
   - Formula: `0.35×on_time + 0.25×transfers + 0.20×crowd + 0.10×variance + 0.10×last_mile`
   - Higher = more reliable

5. **Persona Inference**
   - Learns from journey history
   - Four types: RUSHER, SAFE_PLANNER, COMFORT_SEEKER, EXPLORER
   - Guides route recommendations

---

## 📊 Simulated Data

The demo uses **realistic simulated data**:

- **3 sample routes:** Express, Scenic, Local
- **3 alert zones:** Construction, Safety Advisory, Traffic Hotspot
- **RCI varies by time:** Lower at rush hour (7-9 AM, 5-7 PM)
- **Crowd levels change:** Peak during rush hours
- **Failure scores update:** Based on time-window and route

**Why simulated?**
- Hackathon constraint
- Real journey data would need weeks to accumulate
- Simulated patterns reflect real urban dynamics

---

## 🎨 UI/UX Highlights

- **Grayscale & professional** – Trust-building design
- **Explain "why"** – Every decision has reasoning
- **No false confidence** – Uncertainty ranges shown
- **Calm, no urgency** – No flashy animations
- **Time-specific framing** – "Unreliable at 8:30 AM" not "always unreliable"
- **Privacy first** – Anonymous, no tracking

---

## 🔄 Learning Loop

```
Journey Complete
       ↓
Detect Events (DELAY, IDLE, REROUTE)
       ↓
Store in location_time_stats (time-windowed)
       ↓
Recalculate failure_score
       ↓
Update route_confidence (RCI)
       ↓
Infer persona from journey history
       ↓
Next journey uses improved recommendations
```

**Key insight:** System improves even without user feedback.

---

## 📱 Pages Overview

| Page | Route | Purpose |
|------|-------|---------|
| Landing | `/` | Problem & solution overview |
| Dashboard | `/dashboard` | Main route selection UI |
| Routes | `/routes` | Detailed route comparison |
| Alerts | `/alerts` | Failure hotspots & zones |
| Persona | `/persona` | Your commute style |

---

## 🔧 Troubleshooting

### Database connection issues?
```bash
# Check .env has DATABASE_URL
# Verify Neon connection is active
npx prisma db push
```

### Routes not loading?
```bash
# Clear browser cache
# Check browser console for errors
# Verify /api/routes/get endpoint responds
```

### Persona not showing?
```bash
# Persona is auto-generated on first visit
# Check browser localStorage has user ID
# Verify /api/persona endpoint returns data
```

### Map area showing placeholder?
```
This is expected in demo. In production, integrate:
- Google Maps API
- Mapbox
- Leaflet + OpenStreetMap
```

---

## 🎯 Next Steps

1. **Explore the system**
   - Visit all 5 pages
   - Read explanations on each page
   - Understand the intelligence engine

2. **Simulate interactions**
   - Use "Simulate Delay Event" on dashboard
   - Notice failure score changes
   - See how it affects route recommendations

3. **Review code**
   - Intelligence engine: `/app/lib/intelligence-engine.ts`
   - Simulated data: `/app/lib/simulated-data.ts`
   - API routes: `/app/api/`
   - Pages: `/app/dashboard`, `/app/routes`, `/app/alerts`, `/app/persona`

4. **Customize**
   - Add more routes in `SAMPLE_ROUTES`
   - Adjust thresholds in `types.ts`
   - Change persona weights in `PERSONA_WEIGHTS`
   - Modify RCI formula in `RCI_WEIGHTS`

---

## 📚 Deep Dives

See `/SYSTEM_DOCUMENTATION.md` for:
- Full RCI calculation
- Persona inference algorithm
- Time-window bucketing rationale
- Complete API documentation
- Database schema details

---

## 🎓 Key Learnings

1. **Confidence ≠ Speed**
   - Routes can be faster but less reliable
   - RCI helps balance the trade-off

2. **Time matters**
   - 8:30 AM ≠ 10:00 AM
   - 15-minute windows capture patterns without over-fitting

3. **Personas guide decisions**
   - Different users have different priorities
   - RUSHER wants speed, SAFE_PLANNER wants reliability
   - System adapts routing rules per persona

4. **Learn without feedback**
   - System improves by observing outcomes
   - Thumbs up/down are optional optimizations

5. **Privacy-first**
   - No login needed
   - No tracking
   - Anonymous UUID identifies users
   - Trust is built through transparency

---

## 🚀 Deployment

### To Vercel (Recommended)
```bash
git push
# Auto-deploys from Git
```

### Manual Deploy
```bash
npm run build
npm start
```

**Environment:** Only needs `DATABASE_URL` set.

---

**Ready? Start the dev server and explore!**
```bash
npm run dev
```

Open http://localhost:3000 🎉
