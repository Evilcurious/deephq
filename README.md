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
Visit `/admin` to edit services (name, description, price), home-page stats and the WhatsApp number.
Saving commits `data/site.json` to GitHub, which triggers a Vercel redeploy (~1 min).

Set these **Environment Variables** in Vercel → Project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `ADMIN_PASSWORD` | your admin password |
| `GITHUB_TOKEN` | GitHub fine-grained token with *Contents: Read and write* on this repo |
| `GITHUB_REPO` | `Evilcurious/deephq` |
| `GITHUB_BRANCH` | branch Vercel deploys from (e.g. `main`) |

## Orders
The order form opens WhatsApp (number set in admin) with the order details pre-filled.
