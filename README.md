# Manor Casebook · 庄园档案

A survivor recommender for **Identity V (第五人格)**. Players answer an adaptive questionnaire, which can be a Quick 3-minute version or a Full version of about 60 questions across eight "Acts". Optionally they add in-game stats, take four browser mini-tests, and list other games they've played. The app then bills the survivors that fit how they play, the way a Victorian playbill bills its performers. Every pick comes with the answers that put it there.

- **53 survivors, 36 hunters**, data as of 2026-09-30. This includes "Prodigy" (“神童”), released the same day, whose data is marked provisional.
- **Playstyle first, meta second.** By default the score is 75% fit and 25% current meta at your rank, and a slider changes the split.
- **Rank- and queue-aware.** Solo queue (野排) rewards self-sufficient survivors. A voice premade (开黑) unlocks coordination-heavy picks.
- **Results:** a headliner and supporting picks, each with reasons; a ranked pool that covers each other's weaknesses; a learning path (easy start, then a bridge, then a target main, with practice tips); team comps; a full survivor × hunter matchup matrix; a skins panel; and "close, but not billed" near-misses.
- **Three themes** (Gothic, Modern, Playful) and **EN / 中文**.
- **Export** the bill as a PNG.
- **Optional AI**, Muse Spark 1.3 Contributor by default, or any OpenAI-compatible provider (chat completions or Responses API). The AI never decides the ranking. It only interprets free-text answers (within fixed limits) and narrates the result, streamed live.

## How the algorithm works (`src/engine`)

1. **Profile** (`profile.ts`): each answer carries explicit *effects*:
   - **Desires** over 11 playstyle traits (kite, decode, rescue, support, disrupt, info, survivability, self-sufficiency, team dependency, early game, late game).
   - **Style** preferences: how you like to survive a chase, and how you like to help.
   - **Ability observations** over 8 skill demands (mechanics, aim, timing, reaction, map knowledge, game sense, multitasking, comms).

   Ability estimates combine self-ratings, Trials results, Identity V experience and rank, other games, and in-game stats. Each source is confidence-weighted. Skills that only exist in Identity V (map knowledge, game sense) come mostly from Identity V experience, never mainly from other games.
2. **Score** (`score.ts`): each survivor's traits are standardised against the roster. The score combines:
   - desire-weighted fit
   - style match
   - skill fit: gaps beyond what even easy survivors ask cost points, and your strengths being put to use earns a few
   - appetite for mastery vs forgiveness
   - how well the survivor suits your queue type
   - personal evidence: survivors you enjoy or dislike, your win rates, and similarity to your favourites
   - an optional small "vibe" (aesthetic) bonus

   The combined fit then blends with the meta score for your bracket and mode. **Challenge me** turns skill gaps into growth goals instead of penalties.
3. **Plan** (`plan.ts`): a greedy pool builder that rewards role coverage and hunter coverage and discourages near-duplicates; a learning path that compares comfort and challenge rankings; team comps built from synergy links and missing roles; and "why not" explanations.
4. **Matchups** (`matchups.ts`): community-sourced survivor → hunter and hunter → survivor links first. Remaining cells are estimated from hunter mechanic tags against survivor kits and are drawn faded in the UI.

`npm test` runs persona checks (decoder, rescuer, new solo healer, stunner, new FPS player, veteran kiter) plus invariants: disliked survivors stay out of the top 5, meta weight moves meta picks up, Trials results override self-ratings, and plans are well-formed. The personas are sanity checks, not tuning targets.

## Data (`research/` → `src/data`)

- `research/roster.json`, `research/hunters_roster.json`: canonical rosters from wiki.biligame.com/dwrg (CN names, roles, official difficulty, release dates) cross-checked with id5.fandom.com.
- `research/raw/**`: web-search research, one file per batch. Each survivor's scores are based on community consensus from NGA, Bilibili, 贴吧, 网易大神, r/IdentityV, the Fandom wiki, tier lists and IVL/COA pick/ban data. Every survivor keeps its source URLs, a confidence score (1–5) and recent balance changes.
- `python3 scripts/build_data.py` (or `npm run data`) validates, clamps and normalises the raw research into `src/data/*.json`.

To update after a patch, add or replace a batch file in `research/raw/survivors/` using the same JSON shape and rerun the build.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # static site in dist/
```

## Optional AI (default: Muse Spark 1.3 Contributor on OpenCode Go)

Everything works without a key. With one, the app reads your free-text answers and writes a personal explanation of your bill, streamed live. The key is stored only in your browser (localStorage) and is never sent anywhere except through the relay to the provider.

OpenCode Go doesn't accept calls straight from a browser (no CORS), and it wants a custom User-Agent, so requests go through a tiny **relay**. It forwards each request, adds the missing headers, streams the answer back and stores nothing.

### Set up the relay (one time, ~5 minutes, free)

**Option A: Cloudflare dashboard (no installs)**
1. Sign up or log in at **dash.cloudflare.com** (the free plan is enough: 100,000 requests/day).
2. Left menu → **Compute (Workers)** → **Workers & Pages** → **Create** → **Create Worker** (start from "Hello World").
3. Name it `manor-relay` → **Deploy**.
4. Click **Edit code**, delete everything in the editor, paste the whole of [`worker/relay.js`](worker/relay.js) → **Deploy**.
5. (Recommended) Worker → **Settings** → **Variables and Secrets** → **Add**: name `ORIGINS`, value `https://rickg9.github.io,http://localhost:5173` → **Deploy**. Only your site can then use the relay.
6. Copy the Worker URL shown at the top, e.g. `https://manor-relay.<your-subdomain>.workers.dev`.

**Option B: command line**
```bash
cd worker
npx wrangler login      # opens a browser to authorise Cloudflare
npx wrangler deploy     # prints the https://manor-relay.<you>.workers.dev URL
```
(Edit `ORIGINS` in `worker/wrangler.toml` first if you want to lock it to your site.)

### Connect the app
1. Open the site → **Settings & AI**.
2. Provider **OpenCode Go** → paste your OpenCode Go API key.
3. Model `muse-spark-1.3-contributor` (default), reasoning effort **Extra high** (default; pick High/Medium for faster answers).
4. **Relay URL**: paste the Worker URL from step 6 (no trailing path).
5. **Test connection** → you should see `✓ OK`. Then on your bill press **Ask the manor to explain**.

Running locally with `npm run dev`? Skip the Worker and set the Relay URL to `/relay` — Vite proxies the call for you.

Providers with browser CORS (DeepSeek, OpenRouter) work without a relay: choose them in Settings and leave the Relay URL empty. Note that OpenCode says Go is intended for coding-agent traffic; keep usage personal and small.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` tests, builds and publishes on every push to `main`. In the repo settings, set **Pages → Source: GitHub Actions**. On a free GitHub plan, Pages needs the repository to be public.

---

Fan-made tool. Identity V is © NetEase. No game art is hosted here.
