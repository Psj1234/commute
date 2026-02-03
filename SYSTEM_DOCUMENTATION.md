# Commute Intelligence Engine

A full-stack, production-quality web application demonstrating confidence-based, failure-aware commute planning using behavioral intelligence and map integration.

## 🎯 Vision

Most routing apps optimize for speed. **We optimize for confidence.**

The Commute Intelligence Engine learns from every journey—detecting delays, predicting risks, and adapting to your commute style. The result? Routes you can actually rely on.

## 🏗️ System Architecture

### Frontend Stack
- **Next.js 16** (App Router) for fast, server-side rendering
- **TypeScript** for type safety
- **Tailwind CSS** for professional, accessible design
- **Lucide React** for icons
- **Recharts** for data visualization (future: journey analytics)

### Backend Stack
- **Next.js API Routes** (Node.js) for serverless backend
- **PostgreSQL** on Neon for reliable data persistence
- **Prisma ORM** for type-safe database access

### Key Assumption
- **Anonymous users** identified by UUID stored in browser localStorage
- **No authentication** required (privacy-first design)
- **Simulated data** allowed during hackathon phase

---

## 📊 Core Intelligence Engine

### 1. Data Collection Layer (Passive)

```
For each journey:
  - Capture GPS location (simulated or real)
  - Record timestamps
  - Track planned vs actual routes
  - Monitor scheduled vs actual arrivals
```

**API Endpoint:** `POST /api/journey/start` and `POST /api/journey/end`

### 2. Event Detection

The system detects three types of journey events:

| Event Type | Definition | Threshold |
|-----------|-----------|-----------|
| **DELAY** | Actual arrival > Expected arrival | 5+ minutes |
| **IDLE** | User stationary at location | 3+ minutes |
| **REROUTE** | User changes planned route | Any |

Events are stored with:
- `location_id`: Where the event occurred
- `event_type`: One of DELAY, IDLE, REROUTE
- `wait_time`: Duration in seconds
- `timestamp`: When it occurred

### 3. Time-Window Bucketing (Critical)

Delays are **NOT permanent labels**. Instead, they're bucketed by time-of-day:

```
Time Window = bucket_time(current_time)
Example: 08:45 → "08:30-08:45" (15-minute interval)
```

**Why this matters:**
- A location might be reliable at 9 AM but a hotspot at 8:30 AM
- Peak-hour issues don't permanently taint a location
- Time-specific patterns guide better decisions

### 4. Historical Pattern Learning

For each `(location_id, time_window)` pair:

```
total_visits = count(all events)
delay_events = count(DELAY events)
reroutes = count(REROUTE events)
avg_wait = average(wait_time)

delay_probability = delay_events / total_visits
failure_score = weighted_sum(delay_events, reroutes, avg_wait)
```

This data is stored in `location_time_stats` table.

### 5. Route Confidence Index (RCI)

RCI is a **0-1 score** predicting on-time arrival probability:

```
RCI = (
    0.35 * on_time_probability      (Historical on-time rate)
  + 0.25 * transfer_success_rate    (Successful transfers)
  + 0.20 * crowd_stability          (Consistent crowd levels)
  + 0.10 * delay_variance           (Low variance in delays)
  + 0.10 * last_mile_availability   (Final leg reliability)
)
```

**Interpretation:**
- RCI > 0.7: Highly reliable, low risk of delay
- RCI 0.5-0.7: Moderately reliable, acceptable risk
- RCI < 0.5: High delay risk, avoid if possible

### 6. Failure Hotspot Detection

```
if failure_score > FAILURE_THRESHOLD (0.4):
    Mark location + time_window as FAILURE_HOTSPOT
```

Hotspots are attached with metadata:
- `time_window`: When they occur (e.g., "08:00-08:15")
- `avg_delay`: Average delay in minutes
- `confidence_drop`: RCI penalty for this location

### 7. Commute Autopilot Decision Engine

For each candidate route:
1. Fetch RCI score
2. Fetch failure risk
3. Fetch crowd level
4. Apply persona-specific rules

**Selection Logic:**
```
selected_route = argmax(
    PERSONA_WEIGHTS[persona] * [RCI, travel_time, crowd_level, risk_factors]
)
```

---

## 👤 Commute Personas

The system learns **four distinct commute archetypes** from journey data:

### 1. 🚀 RUSHER
**Profile:** Speed-focused, high risk acceptance

**Behavior Signals:**
- High speed preference (time saved vs safest route)
- High reroute tendency
- Low crowd/transfer concern
- Willing to accept routes with lower RCI

**Routing Rules:**
- Always show fastest route first
- Auto-accept risky routes if ETA significantly lower
- Minimal warnings about crowds
- Recommend alternatives during delays

**Persona Score:**
```
RUSHER_SCORE = (0.4 * speed_pref) + (0.3 * reroute_rate) + (0.3 * risk_acceptance)
```

---

### 2. 🛡️ SAFE_PLANNER
**Profile:** Reliability-focused, risk-averse

**Behavior Signals:**
- Low speed preference (prefers safe over fast)
- Low reroute tendency
- Accepts transfers for reliability
- Chooses high-RCI routes consistently

**Routing Rules:**
- Always show highest-confidence route first
- Avoid routes with elevated failure risk
- Warn before entering hotspots
- Prefer well-established routes

**Persona Score:**
```
SAFE_PLANNER_SCORE = (0.5 * RCI) + (0.3 * (1 - reroute_rate)) + (0.2 * transfer_tolerance)
```

---

### 3. 💜 COMFORT_SEEKER
**Profile:** Comfort-focused, stress-averse

**Behavior Signals:**
- Low crowd tolerance (avoids packed routes)
- Low transfer tolerance
- Willing to take longer routes for less crowding
- Prefers predictable travel

**Routing Rules:**
- Prioritize routes with low crowd levels
- Minimize number of transfers
- Show estimated comfort metrics
- Avoid peak-hour suggestions

**Persona Score:**
```
COMFORT_SEEKER_SCORE = (0.5 * (1 - crowd_tol)) + (0.3 * (1 - transfer_tol)) + (0.2 * (1 - speed_pref))
```

---

### 4. 🧭 EXPLORER
**Profile:** Flexible, adaptable, variety-seeking

**Behavior Signals:**
- High reroute tendency (tries different routes)
- High transfer tolerance
- Balanced speed and safety concerns
- Willing to experiment

**Routing Rules:**
- Show diverse route options
- Balance speed, reliability, and comfort
- Encourage trying new routes
- Highlight interesting alternatives

**Persona Score:**
```
EXPLORER_SCORE = (0.4 * reroute_rate) + (0.3 * transfer_tol) + (0.3 * risk_acceptance)
```

---

## 📱 Pages & Features

### 1. **Landing Page** (`/`)
- Problem statement: "Fastest ≠ Most Reliable"
- Solution overview with feature highlights
- How the system works (7-step process)
- CTA: "View Demo"

**Key Message:** "We optimize for confidence, not just speed."

---

### 2. **Dashboard** (`/dashboard`)

**Main Content:**
- **Map simulation area** (placeholder for Google Maps / Mapbox integration)
  - Shows selected route geometry
  - Displays alert zones
  - Shows traffic layer (simulated)

- **Route selector panel** (right sidebar)
  - Lists all available routes
  - Highlights selected route
  - Shows key metrics: distance, ETA, crowd level

- **Selected route details**
  - RCI score with visual indicator (0-100%)
  - Failure risk level (Low/Medium/High)
  - Confidence breakdown by component
  
- **Demo controls**
  - "Simulate Delay Event" button (increases failure score)
  - "Refresh Routes" button
  - Navigate to comparison, alerts, or persona pages

---

### 3. **Routes Comparison** (`/routes`)

**Features:**
- Side-by-side comparison of 2-3 routes
- For each route:
  - Distance, ETA, crowd level
  - RCI score with detailed breakdown
    - On-time probability (35%)
    - Transfer success rate (25%)
    - Crowd stability (20%)
    - Delay variance (10%)
    - Last-mile availability (10%)
  - Failure risk with historical context
  - When to choose this route (personalized)

**Design:** Judge-friendly, professional, non-flashy

---

### 4. **Alerts & Failure Hotspots** (`/alerts`)

**Features:**
- List of active alert zones (construction, safety, emergency)
- Failure hotspot explanations
- Severity levels (1-5)
- How failures are detected (5+ min delay threshold)
- Time-window specificity explanation
- Failure score calculation formula
- What to expect when approaching a zone

**Key Message:** "These aren't permanent labels—they're time-specific patterns."

---

### 5. **Persona** (`/persona`)

**Features:**
- Primary persona card with icon
- Confidence score (0-100%)
- Persona description and impact
- All four persona scores (sorted by rank)
- How persona affects routing rules
- Explanation of each persona type
- "Your persona evolves" callout

---

## 🗄️ Database Schema

### **Users Table**
```sql
id (UUID, PK) – Anonymous user identifier
created_at (DateTime) – Account creation
updated_at (DateTime) – Last update
```

### **Journeys Table**
```sql
id (UUID, PK)
user_id (FK) – Links to users
start_time (DateTime)
end_time (DateTime) – NULL if ongoing
planned_route_id (String)
final_route_id (String)
completed (Boolean)
```

### **GPS Logs** (Time-Series)
```sql
id (PK)
journey_id (FK)
user_id (FK)
latitude (Float)
longitude (Float)
timestamp (DateTime)
```

### **Route Legs**
```sql
id (PK)
journey_id (FK)
location_id (String)
expected_arrival (DateTime)
actual_arrival (DateTime) – NULL if not yet arrived
```

### **Events** (Detected Failures)
```sql
id (PK)
journey_id (FK)
location_id (String)
event_type (Enum: DELAY, IDLE, REROUTE)
wait_time (Int) – Seconds
timestamp (DateTime)
```

### **Location Time Stats** (Aggregated Intelligence)
```sql
location_id (String)
time_window (String) – e.g., "08:30-08:45"
avg_wait_time (Float) – Minutes
delay_probability (Float) – 0-1
reroute_rate (Float) – 0-1
failure_score (Float) – 0-1
total_visits (Int)
last_updated (DateTime)
```

### **Routes**
```sql
id (UUID, PK)
name (String) – e.g., "Express Highway (I-405)"
start_lat/lng, end_lat/lng (Float)
distance (Float) – Kilometers
base_eta (Int) – Minutes
geometry (JSON String) – Route coordinates
```

### **Route Confidence** (RCI Scores)
```sql
route_id (FK)
time_window (String)
on_time_prob, transfer_success, crowd_stability, delay_variance, last_mile_avail (Float)
rci_score (Float) – 0-1, weighted average
```

### **User Personas**
```sql
user_id (FK, unique)
persona_type (Enum: RUSHER, SAFE_PLANNER, COMFORT_SEEKER, EXPLORER)
confidence (Float) – 0-1
rusher_score, safe_planner_score, comfort_seeker_score, explorer_score (Float)
last_updated (DateTime)
```

### **Alert Zones** (Mocked Data)
```sql
id (UUID, PK)
name (String) – e.g., "Downtown Construction Zone"
zone_type (Enum: SAFETY_ADVISORY, EMERGENCY, TRAFFIC_HOTSPOT, INFRASTRUCTURE_ISSUE)
center_lat/lng (Float)
radius_km (Float)
severity (Int) – 1-5
description (String)
time_window_start/end (DateTime) – Optional, for temporary zones
active (Boolean)
```

---

## 🔄 API Endpoints

### Journey Management
- `POST /api/journey/start` – Start a new journey
- `POST /api/journey/end` – Mark journey complete

### Route Intelligence
- `GET /api/routes/get` – Get available routes with RCI scores
  - Returns: Routes sorted by RCI, time_window, recommended route

### Persona
- `GET /api/persona?userId={id}` – Get/infer user's commute persona
  - Returns: Persona type, confidence, all four scores

### Alert Zones
- `GET /api/alerts/zones` – Get all alert zones
  - Params: `?lat={lat}&lng={lng}` for nearby filtering
  - Returns: All zones + nearby zones

---

## ⚡ Self-Improving System Loop

### After Journey Completion:

1. **Store outcomes**
   - Actual arrival times
   - Reroute counts
   - Success/failure

2. **Update historical models**
   - Recalculate `location_time_stats`
   - Update failure scores
   - Recompute hotspots

3. **Recompute RCI**
   - Fetch latest stats
   - Apply weighted formula
   - Store new RCI

4. **Update persona**
   - Analyze last N journeys
   - Recalculate persona scores
   - Update `user_personas` if confident enough

5. **Learn silently**
   - No user feedback required
   - System improves on its own
   - Becomes better with scale

**Optional:** Thumbs up/down slightly adjust weights (low-friction signal)

---

## 🎨 Design Philosophy

- **Grayscale & Professional:** Trust-building, judge-friendly
- **Explain "Why":** Every recommendation includes reasoning
- **No False Confidence:** Show uncertainty ranges
- **Privacy First:** Anonymous, no tracking, no auth
- **Calm:** No flashy animations or urgency
- **Time-Specific:** Avoid permanent labels on locations

---

## 🔒 Safety & Privacy

- **Anonymous:** UUID-based identification, no names/emails
- **Local Storage:** User ID persisted only in browser
- **No Tracking:** No real GPS tracking in demo
- **Simulated Data:** Demo uses realistic but synthetic journey data
- **Audit Trail:** All decisions include timestamp and time_window for review

---

## 🚀 Getting Started

### Prerequisites
```bash
Node.js 18+
PostgreSQL (Neon hosted)
npm or yarn
```

### Setup

1. **Clone and install**
```bash
cd commute
npm install
```

2. **Configure environment**
```bash
# .env
DATABASE_URL=postgresql://user:pass@host/dbname
```

3. **Initialize database**
```bash
npx prisma generate
npx prisma db push  # or: npx prisma migrate dev --name init
```

4. **Run development server**
```bash
npm run dev
```

Visit `http://localhost:3000`

---

## 📖 Key Concepts

### Confidence vs. Speed
- **Confidence:** Probability of on-time arrival
- **Speed:** Travel time in minutes
- **Trade-off:** Faster routes often have lower confidence due to congestion risk

### Time-Window Specificity
- **Not static:** A location's reliability changes by time of day
- **15-minute buckets:** Fine-grained enough to capture rush hour patterns
- **Prevents over-penalizing:** Location not marked "always bad," just "bad at 8:30 AM"

### Persona as Decision Filter
- **Probabilistic:** Not a rigid classification, but a probability distribution
- **Evolves:** Changes as behavior patterns emerge
- **Guides routing:** Different personas get different route recommendations

### Failure ≠ Permanent
- **Event-based:** Triggered by observed delays/reroutes
- **Time-bound:** Expires or updates as conditions change
- **Historical:** Reflects past patterns, not predictions of future events

---

## 🎯 Hackathon Scope

This project **demonstrates** a production-quality system for:
- Confidence-based routing
- Behavioral persona inference
- Failure-aware decision making
- Time-window aggregation

**Out of Scope:**
- Real GPS tracking
- Live traffic integration
- Real-time prediction
- User authentication
- Payment/monetization

**What's Included:**
- Simulated journey data (realistic patterns)
- Backend intelligence engine
- Database schema (real Postgres)
- Full frontend
- All core concepts

---

## 📚 Further Reading

- [Route Confidence Index Deep Dive](./docs/RCI.md) – Detailed RCI computation
- [Persona Inference Algorithm](./docs/PERSONAS.md) – How personas are calculated
- [Time-Window Bucketing](./docs/TIME_WINDOWS.md) – Why time-specificity matters
- [API Documentation](./docs/API.md) – Full API reference
- [Database Schema](./docs/SCHEMA.md) – Detailed schema with indices

---

## 🔗 Deployment

### Environment Variables Required
```
DATABASE_URL – PostgreSQL connection string (Neon recommended)
```

### Deploy to Vercel
```bash
vercel --prod
```

### Deploy to Other Platforms
Works with any Node.js hosting (AWS Lambda, Google Cloud Run, Railway, etc.)

---

## 📞 Support

For questions or issues, refer to:
1. **In-app explanations** – Every page has callouts explaining decisions
2. **Documentation** – See `/docs` folder for deep dives
3. **Code comments** – Functions have detailed docstrings

---

## 📄 License

Hackathon project. Created for demonstration purposes.

---

**Last Updated:** February 3, 2026  
**System Version:** 1.0 (Hackathon Release)
