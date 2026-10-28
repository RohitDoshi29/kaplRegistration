# KAPL 3.0 Player Registration & Live Roster Portal

Official tournament player registration and live roster web application for KAPL 3.0 (Premier League 3.0), connected to Supabase for real-time synchronization.

## 🚀 Features

- **Tournament Division Selection**: Support for Men's League, Women's League, and Dual Draft registration.
- **Player Information & Playing Style**: Form inputs for cricket roles (Batter, Bowler, All-Rounder, Wicket-Keeper), batting style, bowling style, preferred jersey number, and contact info.
- **Experience & History**: Track player experience levels, previous franchises, and past achievements.
- **Live Official Player Card**: Interactive preview that dynamically updates in real time as the player fills out the form.
- **Registration Fee & UPI Payment**:
  - Integrated QR scanner with laser scanning animation.
  - One-click UPI ID copy (`idb250700481480@idbi`).
  - Support for UPI QR, Cash on Venue, and Bank Transfer with transaction reference (UTR) and screenshot upload.
- **Live Tournament Roster**:
  - Real-time updates via Supabase Postgres changes subscription.
  - Role filter chips and tournament division filters.
  - Search by player name or jersey number.
  - Switchable Grid and Table views.
  - Export roster to CSV.

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Lucide Icons
- **Backend / Database**: Supabase (PostgreSQL with Row Level Security & Realtime)
- **Effects**: canvas-confetti

## 📦 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_SUPABASE_URL="https://jftwjqprwjeesivzmycy.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_r0U5JThsuKCB5wqX5s9aXQ_wQgamwTs"
```

### 3. Database Setup

Follow the SQL migration instructions in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) to set up the `players` table and Row Level Security (RLS) policies.

### 4. Run Development Server

```bash
npm run dev
```

### 5. Build for Production

```bash
npm run build
npm run preview
```

