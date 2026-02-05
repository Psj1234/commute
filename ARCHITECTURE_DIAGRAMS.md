# Dynamic Routes System Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE (Next.js)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Dashboard (/dashboard)                                               │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  State Management:                                                   │  │
│  │  ├─ startLocation: { lat, lng } | null                             │  │
│  │  ├─ endLocation: { lat, lng } | null                              │  │
│  │  ├─ routes: Route[] = []                                           │  │
│  │  ├─ selectedRoute: Route | null                                    │  │
│  │  └─ loading: boolean                                               │  │
│  │                                                                       │  │
│  │  Effect Hooks:                                                       │  │
│  │  1. useEffect([startLocation, endLocation])                        │  │
│  │     └─ Triggers when BOTH locations set                           │  │
│  │     └─ POST /api/routes/generate                                   │  │
│  │     └─ setRoutes(response.routes)                                  │  │
│  │                                                                       │  │
│  │  Components:                                                         │  │
│  │  ├─ LeafletMap                                                      │  │
│  │  │  ├─ Input: routes, highlightedRouteId, onLocationSelect       │  │
│  │  │  ├─ Renders: Route polylines, location markers                │  │
│  │  │  └─ Callbacks: Location selection                             │  │
│  │  └─ Route List / Comparison Panel                                  │  │
│  │     └─ Displays: Route details, RCI scores                        │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
        ┌──────────────────────┐        ┌──────────────────────┐
        │ POST /api/routes/    │        │ GET /api/routes/get  │
        │     generate         │        │                      │
        └──────────────────────┘        └──────────────────────┘
                    │                                 │
                    │ { start, end }                  │ (loads previous)
                    │                                 │
                    ▼                                 ▼
        ┌──────────────────────────────────────────────────────┐
        │  BACKEND API (app/api/routes/)                       │
        ├──────────────────────────────────────────────────────┤
        │                                                        │
        │  Route Generation Pipeline:                           │
        │  ┌────────────────────────────────────────────────┐  │
        │  │ 1. Validate Coordinates                        │  │
        │  │    - Check: lat [-90, 90], lng [-180, 180]   │  │
        │  │    - Fallback to NYC if invalid               │  │
        │  └────────────────────────────────────────────────┘  │
        │                       ▼                                │
        │  ┌────────────────────────────────────────────────┐  │
        │  │ 2. Fetch Routes from OSRM                      │  │
        │  │    - Call: router.project-osrm.org            │  │
        │  │    - Params: coordinates, alternatives=true   │  │
        │  │    - Timeout: 10 seconds                       │  │
        │  └────────────────────────────────────────────────┘  │
        │                       ▼                                │
        │  ┌────────────────────────────────────────────────┐  │
        │  │ 3. Process Each Route                          │  │
        │  │    - Extract geometry (polyline6)             │  │
        │  │    - Calculate distance & duration            │  │
        │  │    - Store in Route table (Prisma)            │  │
        │  └────────────────────────────────────────────────┘  │
        │                       ▼                                │
        │  ┌────────────────────────────────────────────────┐  │
        │  │ 4. Compute Route Confidence Index (RCI)        │  │
        │  │    ┌──────────────────────────────────────┐   │  │
        │  │    │ RCI = 0.4×(1-delay_risk)            │   │  │
        │  │    │      + 0.3×traffic_stability         │   │  │
        │  │    │      + 0.2×advisory_safety_score     │   │  │
        │  │    │      + 0.1×historical_consistency    │   │  │
        │  │    └──────────────────────────────────────┘   │  │
        │  │    - Store in RouteConfidence table            │  │
        │  └────────────────────────────────────────────────┘  │
        │                       ▼                                │
        │  ┌────────────────────────────────────────────────┐  │
        │  │ 5. Return Response                             │  │
        │  │    {                                           │  │
        │  │      routes: [                                 │  │
        │  │        {                                        │  │
        │  │          route_id, geometry, distance,         │  │
        │  │          duration, rci, explanation            │  │
        │  │        }, ...                                  │  │
        │  │      ],                                         │  │
        │  │      maps_preferred_route_id                   │  │
        │  │    }                                           │  │
        │  └────────────────────────────────────────────────┘  │
        │                                                        │
        └──────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌────────────────────────┐        ┌────────────────────────┐
│   Frontend Renders     │        │  Database Updates      │
├────────────────────────┤        ├────────────────────────┤
│                        │        │                        │
│ setRoutes(data.routes) │        │ Route Table:           │
│        ▼               │        │ ├─ route_id (UUID)    │
│ LeafletMap props       │        │ ├─ geometry           │
│ updated               │        │ ├─ distance           │
│        ▼               │        │ ├─ duration           │
│ Render polylines       │        │ └─ created_at         │
│        ▼               │        │                        │
│ Map shows routes       │        │ RouteConfidence Table: │
│ ✅ Success!            │        │ ├─ route_id (FK)      │
│                        │        │ ├─ rci_score          │
│                        │        │ ├─ on_time_prob       │
│                        │        │ ├─ traffic_stability   │
│                        │        │ └─ created_at         │
│                        │        │                        │
└────────────────────────┘        └────────────────────────┘
```

## Data Flow Diagram

```
╔═════════════════════════════════════════════════════════════════════════╗
║                          COMPLETE DATA FLOW                             ║
╚═════════════════════════════════════════════════════════════════════════╝

START:
User clicks map at position (40.7128, -74.006)
    │
    ▼
┌─────────────────────────────────────────┐
│ LeafletMap.handleClick()                │
│ ├─ Extract e.latlng coordinates        │
│ ├─ Validate (lat ±90, lng ±180)       │
│ └─ Call: onLocationSelect(lat, lng)    │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Dashboard.onLocationSelect()            │
│ ├─ type === "start"                    │
│ └─ setStartLocation({ lat: ..., lng: ...})
└─────────────────────────────────────────┘
    │
    ▼
[User clicks again for END location]
    │
    ▼
┌──────────────────────────────────────────┐
│ useEffect Triggered                     │
│ Dependency: [startLocation, endLocation] │
│ Both are now set → Effect runs          │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ CLEAR STATE                              │
│ ├─ setRoutes([])                        │
│ ├─ setSelectedRoute(null)                │
│ └─ setRouteExplanations({})              │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ FETCH REQUEST                            │
│ POST /api/routes/generate                │
│ Body: {                                  │
│   start: { lat: 40.7128, lng: -74.006 },│
│   end: { lat: 40.6892, lng: -74.0445 }, │
│   userId: "user-123"                     │
│ }                                        │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ BACKEND PROCESSING                       │
│ ├─ Validate coordinates                  │
│ │  └─ Both valid ✓                       │
│ ├─ fetch OSRM                            │
│ │  └─ https://router.project-osrm.org... │
│ ├─ Process each route from OSRM          │
│ │  ├─ Create Route record                │
│ │  ├─ Compute RCI                        │
│ │  └─ Create RouteConfidence record      │
│ └─ Return response                       │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ RESPONSE RECEIVED                        │
│ {                                        │
│   routes: [                              │
│     {                                    │
│       route_id: "abc-123",               │
│       geometry: "[[lat,lng],...",        │
│       distance: 12.5,                    │
│       duration: 1200,                    │
│       rci: 0.75,                         │
│       explanation: "..."                 │
│     }, ...                               │
│   ],                                     │
│   maps_preferred_route_id: "abc-123"     │
│ }                                        │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ UPDATE FRONTEND STATE                    │
│ ├─ setRoutes(data.routes)                │
│ ├─ Auto-select best route                │
│ ├─ setSelectedRoute(bestRoute)           │
│ └─ setRouteExplanations({...})          │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ LEAFLETMAP RECEIVES PROPS                │
│ Dependency: [routes]                     │
│ useEffect Triggered                      │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ RENDER ROUTES ON MAP                     │
│ ├─ Clear previous polylines              │
│ ├─ For each route:                       │
│ │  ├─ Parse geometry                     │
│ │  ├─ L.polyline(coords, {color: ...})   │
│ │  └─ .addTo(map)                        │
│ └─ Route highlighted if selected        │
└──────────────────────────────────────────┘
    │
    ▼
╔════════════════════════════════════════╗
║ ✅ ROUTES VISIBLE ON MAP               ║
║ User sees:                             ║
║ - Route polylines (colored)            ║
║ - Multiple alternatives                ║
║ - RCI scores in sidebar                ║
║ - Best route highlighted               ║
╚════════════════════════════════════════╝


SUBSEQUENT FLOW (When User Changes Location):

User clicks to update START location
    │
    ▼
[Dashboard updates startLocation state]
    │
    ▼
[useEffect dependency [startLocation] triggers]
    │
    ▼
[Same flow as above repeats]
    │
    ▼
[Old routes cleared, new routes fetched]
    │
    ▼
[Map updates with new routes]
```

## Component Communication

```
┌──────────────────────────────────────────────────────────────┐
│                        DASHBOARD                             │
│                                                               │
│  State:                                                       │
│  • startLocation                                              │
│  • endLocation                                                │
│  • routes []                                                  │
│  • selectedRoute                                              │
│  • osintZones                                                │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              LEAFLET MAP COMPONENT                      │ │
│  │                                                         │ │
│  │  Props In:                                              │ │
│  │  • routes: Route[]                                      │ │
│  │  • osintZones: Zone[]                                   │ │
│  │  • highlightedRouteId: string                          │ │
│  │  • onLocationSelect: callback                          │ │
│  │                                                         │ │
│  │  State:                                                 │ │
│  │  • localStart, localEnd                                │ │
│  │  • Marker & Polyline refs                             │ │
│  │  • Route polyline layers                              │ │
│  │                                                         │ │
│  │  Effects:                                               │ │
│  │  • [routes] → Render/Update route polylines          │ │
│  │  • [localStart/End] → Update location markers         │ │
│  │  • [osintZones] → Update zone circles                 │ │
│  │                                                         │ │
│  │  Callbacks:                                             │ │
│  │  • Map click → onLocationSelect(lat, lng, type)       │ │
│  └────────────────────────────────────────────────────────┘ │
│         ▲                                                    │
│         │ Routes prop (from state)                           │
│         │                                                    │
│  ┌─────────────────────────┬───────────────────────────┐   │
│  │   Route List Panel      │  OSINT Overlay Panel      │   │
│  │                         │                           │   │
│  │  • Displays route cards │  • Shows alert zones      │   │
│  │  • Shows RCI scores     │  • Severity indicators    │   │
│  │  • onClick → select     │  • Time window info       │   │
│  └─────────────────────────┴───────────────────────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## State Management Timeline

```
┌─────────────────────────────────────────────────────────────┐
│ Timeline of State Changes During Route Generation            │
└─────────────────────────────────────────────────────────────┘

T=0ms: User clicks to set START
  └─ startLocation = { lat: 40.7128, lng: -74.006, label: "..." }
  └─ useEffect NOT triggered (endLocation still null)
  └─ routes = [] (still empty)

T=500ms: User clicks to set END
  └─ endLocation = { lat: 40.6892, lng: -74.0445, label: "..." }
  └─ useEffect TRIGGERED (both locations now set)
  └─ routes = [] (cleared immediately)
  └─ setLoading(true)
  └─ setSelectedRoute(null)

T=505ms: POST /api/routes/generate sent
  └─ Backend processing...

T=2000ms: Backend responds with routes
  └─ routes = [{route_id: "...", geometry: "...", rci: 0.75}, ...]
  └─ selectedRoute = best or maps-preferred route
  └─ setLoading(false)
  └─ LeafletMap re-renders with new routes prop

T=2050ms: LeafletMap useEffect [routes] triggered
  └─ Clear old polylines
  └─ Render new route geometries
  └─ Routes now visible on map ✅

T=2100ms: User sees result on screen
  └─ Routes displayed
  └─ Best route highlighted
  └─ RCI scores shown
```
