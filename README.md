# Ultimate Project 3000: website

Two prototypes live here: the classic scrolling site (`index.html`) and a Reels-style one where the demo advances with every swipe (`reels/index.html`, served at `/reels/`).

Interactive marketing site for The Ultimate Project 3000 ("Send a reel. Get a trip."). Plain HTML, CSS and JS: no build step, no dependencies. Try the reel stack, the budget map, the price-guessing game, the holiday matcher and the REEL 2 REAL poster maker, and read the About, Pricing, FAQ and waitlist sections. Every "try" action opens the demo.

- `index.html`: the landing page, fully self-contained (styles and scripts are inline, so it renders the same wherever it is opened)
- `demo.html`: the interactive Reel to Trip demo that every "try" action opens

All prices are in US dollars and are illustrative estimates from example data, not live prices or availability. Illustrations are drawn, not photos. REEL 2 REAL posters are made in your browser; photos never leave the device, and visits are not verified. Wall entries are fictional demos. The Google Fonts need an internet connection; offline it falls back to system fonts.

## Run locally

Open `index.html` in a browser, or run `python3 -m http.server 8000` in this folder and go to http://localhost:8000.

## Hosting

Served with GitHub Pages: Settings, Pages, Deploy from a branch, `main` / root.

## Waitlist

The form saves sign-ups in the visitor's browser only. To collect them for real, set `WAITLIST_ENDPOINT` (near the top of the waitlist code in each page) to a URL that accepts a JSON POST `{email, origin, at}`.
