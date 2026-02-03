# 🚀 Commute Intelligence Engine

A **production-quality full-stack web application** demonstrating confidence-based, failure-aware commute planning using behavioral intelligence and time-window aggregation.

Built for a hackathon in **February 2026** to showcase serious urban routing technology.

---

## 📱 What This Does

Instead of showing just the **fastest route**, we show the **most reliable route**. 

The system learns from journeys, detects delays, predicts failure hotspots, and adapts routing to your commute style.

---

## 🚀 Get Started (2 Minutes)

```bash
cd commute
npm install
npm run dev
# Open http://localhost:3000
```

---

## 🎯 Demo Flow (5 Minutes)

1. **Landing Page** – Understand the problem
2. **Dashboard** – See route selection with confidence scores
3. **Simulate Delay** – Watch system adapt in real-time
4. **Routes Comparison** – Detailed RCI breakdown
5. **View Persona** – See your commute style

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [QUICK_START.md](./QUICK_START.md) | Setup & demo interactions |
| [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md) | Complete architecture |
| [BUILD_SUMMARY.md](./BUILD_SUMMARY.md) | What was delivered |
| [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md) | Technical deep dives |
| [FILE_MANIFEST.md](./FILE_MANIFEST.md) | Complete file listing |

---

## 🏗️ Architecture

```
User → Next.js Frontend (5 pages)
      → Next.js API Routes (5 endpoints)
      → Intelligence Engine (7 algorithms)
      → PostgreSQL Database (10+ tables)
```

---

## 🧠 Core Concepts

### Route Confidence Index (RCI)
0-1 score predicting on-time arrival:
```
RCI = 0.35×on_time + 0.25×transfers + 0.20×crowd + 0.10×variance + 0.10×last_mile
```

### Time-Window Bucketing
Delays are time-specific (e.g., "08:30-08:45"), not permanent labels

### Failure Scoring
Predicts likelihood of delays at a location + time

### Persona Inference
Learns if you're: RUSHER | SAFE_PLANNER | COMFORT_SEEKER | EXPLORER

### Self-Improving Loop
System gets better with every journey, no feedback needed

---

## 📦 What's Included

✅ **5 Frontend Pages**
- Landing, Dashboard, Routes, Alerts, Persona

✅ **5 API Endpoints**
- Journey tracking, Route intelligence, Persona inference, Alert zones

✅ **Core Intelligence Engine**
- 7 algorithms, 4 personas, time-window aggregation

✅ **Full Database Schema**
- 10+ tables, real PostgreSQL

✅ **Professional Design**
- Grayscale UI, responsive, privacy-first

---

## 🎓 Key Learnings

1. **Confidence ≠ Speed** – Balance trade-offs with weighted scoring
2. **Time Matters** – 8:30 AM ≠ 10:00 AM, use 15-minute buckets
3. **Personas Guide Decisions** – Different users want different things
4. **Learn Without Feedback** – Observe outcomes, improve automatically
5. **Privacy First** – Anonymous UUID, no tracking, transparent logic

---

## ✨ Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS, Lucide React
- **Backend:** Next.js API Routes, Node.js
- **Database:** PostgreSQL (Neon), Prisma ORM
- **Design:** Grayscale, professional, judge-friendly

---

## 🚦 Status

✅ **Complete** – All pages, APIs, algorithms implemented  
✅ **Documented** – 4 comprehensive guides  
✅ **Production-Ready** – Type-safe, scalable, extensible  
✅ **Ready to Demo** – Run `npm run dev`

---

## 📖 For Reviewers

1. **Quick Overview** → Read [BUILD_SUMMARY.md](./BUILD_SUMMARY.md) (10 min)
2. **See It Running** → `npm run dev` (2 min)
3. **Deep Dive** → Read [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md) (30 min)

---

**Ready?** Start the dev server and explore! 🎉

```bash
npm run dev
# Open http://localhost:3000
```
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
