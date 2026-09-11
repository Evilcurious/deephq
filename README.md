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
