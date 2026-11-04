# Reel 2 Real: website

Marketing site and interactive prototypes for **Reel 2 Real** ("Send a Reel. Get a trip."). Plain HTML, CSS and JS: no build step, no dependencies. Each page is self-contained.

| Path | What it is |
|---|---|
| `/` (`index.html`) | Main site: a Reels-style flow. Scroll through a Reel, the share sheet, saved lists, the map, pricing and the final ticket. Includes About, Pricing (draft), FAQ and waitlist. |
| `/darkroom/` | Second prototype, a different concept: the story is a roll of film that scrolls sideways. Develop a Reel by holding a button, price it, circle what fits your budget, then make your own print from a local photo. |
| `/classic/` | The previous site, kept unchanged in function. |
| `/demo.html` | Embedded Reel to Trip demo. |

## What is simulated

Instagram and TikTok are drawn mock-ups, not integrations. Destination detection is chosen by the visitor; there is no AI on these pages. Prices are US-dollar estimates from a placeholder table, not live prices. Tickets are samples and nothing is booked. Pricing plans and team bios are placeholders. Illustrations are drawn, not photos. There is no login and no XP.

Photos added in the Darkroom print maker stay in the browser. Google Fonts need an internet connection; offline the site falls back to system fonts.

## Run locally

`python3 -m http.server 8000` in this folder, then open http://localhost:8000 (`/darkroom/` and `/classic/` are subfolders).

## Hosting

GitHub Pages: Settings, Pages, Deploy from a branch, `main` / root. After a deploy, hard-refresh (Ctrl/Cmd+Shift+R) to bypass the cache.

## Waitlist

Sign-ups are saved in the visitor's browser only. To collect them, set `WAITLIST_ENDPOINT` (a constant in each page's script) to a URL that accepts a JSON POST `{email, from}`.
