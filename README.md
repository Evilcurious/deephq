# DEEP.HQ — Website

Static 3-page website (Home, Services, Order) for DEEP.HQ — AI digital marketing, social media management & Meta Ads.

## Deploy on Vercel
1. Go to https://vercel.com/new and import this GitHub repository.
2. Framework preset: **Other** (no build step). Leave build command and output directory empty.
3. Click **Deploy**.

`vercel.json` enables clean URLs (`/services`, `/order`) and long-term caching for assets.

## Local preview
```
python3 -m http.server 8000
```

## Admin panel
Visit `/admin` — password **evil123** (override with the `ADMIN_PASSWORD` env var if you want to change it).
Edit services (name, description, price), home-page stats, WhatsApp number, and delete reviews.

Saved data is stored in **Vercel Blob**. One-time setup: Vercel project → **Storage** → **Create Database** → **Blob** → **Connect** → Redeploy.
No tokens or database to manage. Until connected, the site serves the defaults in `data/*.json`.

## Orders
The order form opens WhatsApp (number set in admin) with the order details pre-filled.

## Reviews
`/reviews` — public page where anyone can post a review (stored in Vercel Blob via `/api/reviews`).
Admins can delete reviews from `/admin`.

## Services → Order
Clicking a service card on Home/Services opens `/order?service=<id>` with that service pre-selected.
