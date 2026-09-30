# Manor Casebook · 庄园档案

A survivor recommender for **Identity V (第五人格)**. Players answer an adaptive questionnaire, which can be a Quick 3-minute version or a Full version of about 60 questions across eight "Acts". Optionally they add in-game stats, take four browser mini-tests, and list other games they've played. The app then bills the survivors that fit how they play, the way a Victorian playbill bills its performers. Every pick comes with the answers that put it there.

- **53 survivors, 36 hunters**, data as of 2026-09-30. This includes "Prodigy" (“神童”), released the same day, whose data is marked provisional.
- **Playstyle first, meta second.** By default the score is 75% fit and 25% current meta at your rank, and a slider changes the split.
- **Rank- and queue-aware.** Solo queue (野排) rewards self-sufficient survivors. A voice premade (开黑) unlocks coordination-heavy picks.
- **Results:** a headliner and supporting picks, each with reasons; a ranked pool that covers each other's weaknesses; a learning path (easy start, then a bridge, then a target main, with practice tips); team comps; a full survivor × hunter matchup matrix; a skins panel; and "close, but not billed" near-misses.
- **Three themes** (Gothic, Modern, Playful) and **EN / 中文**.
- **Export** the bill as a PNG.
- **Optional AI** through any OpenAI-compatible provider. The AI never decides the ranking. It only interprets free-text answers (within fixed limits) and narrates the result.

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

## Optional AI

Everything works without a key. To enable the AI features: **Settings & AI**, pick a provider, and paste your key. The key is stored only in your browser's localStorage and is never saved to this repo.

- **OpenCode Go** blocks direct browser calls (no CORS) and requires an `x-opencode-session` header and a custom User-Agent. Requests therefore go through a relay:
  - **Locally:** set *Relay URL* to `/relay` while running `npm run dev`. Vite proxies the call.
  - **Hosted:** deploy the free Cloudflare Worker in `worker/` (`cd worker && npx wrangler deploy`) and paste its `*.workers.dev` URL as the *Relay URL*. The relay only forwards to an allowlist of providers and stores nothing.
- Note that OpenCode says Go is intended for coding-agent traffic. Keep usage personal and small.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` tests, builds and publishes on every push to `main`. In the repo settings, set **Pages → Source: GitHub Actions**. On a free GitHub plan, Pages needs the repository to be public.

---

Fan-made tool. Identity V is © NetEase. No game art is hosted here.
