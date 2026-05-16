# COD Command Center

A **private cash-on-delivery e-commerce command center** built with Next.js, TypeScript, Tailwind CSS, and Supabase.

Replaces Google Sheets as the order collection backend for COD landing pages.

---

## Features (Phase 1)

- 🔐 **Authentication** — Supabase Auth, protected dashboard routes
- 📦 **Products** — CRUD with status (Testing / Scaling / Winner / Killed / Paused)
- 🌐 **Landing Pages** — CRUD with auto-generated API keys per page
- 🛒 **Orders** — List with filters, detail view, status updates, internal notes
- 📡 **Public Order API** — `POST /api/orders` secured by API key
- 📊 **Dashboard** — Today's stats cards + latest orders table
- 📋 **Analytics** — Placeholder for Phase 2 (Recharts)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase Postgres |
| Auth | Supabase Auth |
| Deployment | Vercel |

---

## Local Setup

### 1. Install dependencies

```bash
cd cod-command-center
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your real Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TELEGRAM_BOT_TOKEN=    # optional
TELEGRAM_CHAT_ID=      # optional
```

> Both old (`ANON_KEY` / `SERVICE_ROLE_KEY`) and new Supabase key names
> (`PUBLISHABLE_KEY` / `SECRET_KEY`) are supported.

### 3. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the full contents of `supabase/migrations/001_init.sql`
3. Go to **Authentication → Users** and create your admin user
4. Copy your project URL and keys from **Settings → API**

### 4. Run locally

```bash
npm run dev        # development server at http://localhost:3000
npm run build      # production build check
npm run start      # run production build locally
```

---

## Deploying to Vercel

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "COD Command Center Phase 1"
git remote add origin https://github.com/YOUR_USERNAME/cod-command-center.git
git push -u origin main
```

### Step 2 — Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: leave as-is (project root contains `package.json`)

### Step 3 — Add Environment Variables

In Vercel → Project → **Settings → Environment Variables**, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Required — server only |
| `TELEGRAM_BOT_TOKEN` | your token | Optional |
| `TELEGRAM_CHAT_ID` | your chat id | Optional |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` is **never sent to the browser**. It is only used
> in `src/lib/supabase/admin.ts` (server-side) and `src/app/api/orders/route.ts`.

### Step 4 — Deploy

Click **Deploy**. Vercel runs `npm run build` automatically. Build time ~30s.

### Step 5 — Test production order API

```bash
curl -X POST https://your-vercel-domain.vercel.app/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "landing_page_api_key": "YOUR_API_KEY_FROM_DASHBOARD",
    "customer_name": "Test Customer",
    "phone": "0612345678",
    "city": "Budapest",
    "address": "Test Street 1",
    "package_name": "TRIO Bundle",
    "quantity": 1,
    "order_value": 24990,
    "currency": "HUF",
    "utm_source": "tiktok",
    "utm_campaign": "test"
  }'
```

Expected success response:
```json
{
  "success": true,
  "order_id": "uuid-here",
  "order_number": "COD-000001"
}
```

---

## Environment Variables Reference

| Variable | Required | Used in | Exposed to browser? |
|----------|----------|---------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | All Supabase clients | Yes (safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Browser + server client | Yes (safe, RLS protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | API route only | **No — server only** |
| `TELEGRAM_BOT_TOKEN` | Optional | API route only | No |
| `TELEGRAM_CHAT_ID` | Optional | API route only | No |

> Alternative key names also supported:
> - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` instead of `NEXT_PUBLIC_SUPABASE_ANON_KEY`
> - `SUPABASE_SECRET_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`

---

## How External Landing Pages Submit Orders

### Endpoint

```
POST https://your-vercel-domain.vercel.app/api/orders
Content-Type: application/json
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `landing_page_api_key` | string | API key from the Landing Pages dashboard |
| `customer_name` | string | Customer full name |
| `phone` | string | Phone number |
| `city` | string | City |
| `address` | string | Delivery address |
| `quantity` | number | Number of items (integer ≥ 1) |
| `order_value` | number | Total order value (> 0) |
| `currency` | string | e.g. `HUF`, `MAD`, `USD` |

### Optional Fields

`package_name`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`,
`utm_term`, `campaign_id`, `adset_id`, `ad_id`, `platform`, `device`,
`browser`, `user_agent`

### JavaScript / fetch Example

```javascript
fetch("https://your-vercel-domain.vercel.app/api/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    landing_page_api_key: "your-api-key-from-dashboard",
    customer_name: "Ahmed Benali",
    phone: "0612345678",
    city: "Budapest",
    address: "Test Street 1",
    package_name: "TRIO Bundle",
    quantity: 1,
    order_value: 24990,
    currency: "HUF",
    utm_source: "tiktok",
    utm_medium: "paid",
    utm_campaign: "snap_hu_launch",
    platform: "TikTok",
    device: "mobile",
    browser: "Chrome"
  })
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    console.log("Order saved:", data.order_number);
    // Redirect to thank-you page
  } else {
    console.error("Order failed:", data.error);
  }
});
```

### Responses

**Success:**
```json
{ "success": true, "order_id": "uuid", "order_number": "COD-000001" }
```

**Error — invalid API key:**
```json
{ "success": false, "error": "Invalid API key. Order not saved." }
```

**Error — missing field:**
```json
{ "success": false, "error": "Missing required field: phone" }
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `products` | Products with cost structure and status |
| `landing_pages` | Landing pages with unique per-page API keys |
| `orders` | All received orders with UTM tracking |
| `order_events` | Future Phase 2: pageviews, add-to-carts, funnels |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/orders` | API Key (header-free) | Submit order from landing page |

---

## Security Notes

- All dashboard routes are protected by Supabase Auth via `src/proxy.ts`
- The `SUPABASE_SERVICE_ROLE_KEY` is only used server-side in API routes
- RLS (Row Level Security) is enabled on all database tables
- Each landing page has a unique UUID API key — compromise of one key doesn't affect others

---

## Roadmap

### Phase 2 (planned)
- Recharts analytics (revenue, conversion rate, UTM attribution)
- Supabase Realtime live order feed
- Telegram bot notifications (detailed)
- Order export (CSV)
- Advanced settings panel
