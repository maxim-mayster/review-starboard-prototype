# Review Starboard Deployment Guide

## Important first
The current prototype is a **static HTML mockup**.

That means:
- employee names are stored in the browser's `localStorage`
- stars are stored in the browser's `localStorage`
- TV background/logo settings are stored in the browser's `localStorage`
- data does **not** sync between devices
- there is **no login/security layer yet**

So if you upload this version to Vercel or GitHub Pages, it will work as a website, but it will **not** be a secure shared app yet.

## If you just want to publish the prototype

### Option A — Vercel
1. Create a GitHub repo.
2. Push this folder to GitHub.
3. Sign into Vercel.
4. Import the GitHub repo.
5. Framework preset: **Other**.
6. Root directory: repo root.
7. Build command: leave blank.
8. Output directory: leave blank.
9. Deploy.

Suggested routes after deploy:
- `/` → gallery
- `/sketches/001-shop-admin-board/index.html` → admin board
- `/sketches/002-tv-first-board/index.html` → TV board

### Option B — GitHub Pages
1. Create a GitHub repo.
2. Push this folder to GitHub.
3. In GitHub repo settings, open **Pages**.
4. Source: deploy from `main` branch.
5. Folder: `/ (root)`.
6. Save.

Then use:
- `/index.html`
- `/sketches/001-shop-admin-board/index.html`
- `/sketches/002-tv-first-board/index.html`

## If you want it to be real, shared, and secure
Build the next version with:
- **Frontend:** Next.js
- **Hosting:** Vercel
- **Database:** Supabase Postgres
- **Auth:** Supabase Auth or simple password-protected admin login
- **Storage:** Supabase Storage for TV background/logo uploads

## Recommended real architecture

### Data tables
- `employees`
  - `id`
  - `name`
  - `active`
  - `created_at`

- `reviews`
  - `id`
  - `employee_id`
  - `platform`
  - `created_at`
  - `stars_awarded`

- `settings`
  - `tv_background_url`
  - `tv_logo_url`
  - `blur_amount`
  - `overlay_amount`

### App behavior
- admin board requires login
- TV board can be public or protected with a private URL
- data persists in database
- uploads persist in cloud storage
- all devices see the same leaderboard

## Bonus-star rule to preserve
- reviews 1–5 for an employee = `1` star each
- review 6+ for that employee = `2` stars each

## Best next move
If you want something people can actually use at work:
1. keep this prototype as the design reference
2. rebuild it as a real app with database + auth
3. deploy to Vercel
4. store assets and data in Supabase
