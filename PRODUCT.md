# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + TypeScript, static build deployed to GitHub Pages (user choice). Optional AI calls go through a small pass-through relay (Cloudflare Worker) because the OpenCode Go API blocks browser CORS; each user supplies their own key, stored only in their browser.

## Users

Identity V (第五人格) players — primarily the owner and a small group of friends, spanning brand-new players to knowledgeable mid-rank players. They play on the Global/Asia server (CN server data also supported). They use it on phones and on PC equally (same server, different controls). The job: "tell me which survivor(s) I should play, and why," either to pick a first main, build a ranked pool, or find a next character to learn.

## Product Purpose

An extremely thorough survivor recommender. Players answer an adaptive questionnaire (quick ~15 questions or deep 60–100+), optionally enter in-game stats, take browser mini-tests (reaction, timing window, aim/flick, multitask), and list other games they have played. A deterministic, explainable algorithm ranks survivors by playstyle fit (primary), adjusted by meta viability for their rank and mode (secondary, default ~25%). Success = players recognise themselves in the explanation and the recommended survivors feel right when played.

## Positioning

Recommendations are grounded in heavily sourced community player feedback (CN: NGA, Bilibili, Tieba, 网易大神; Global: Reddit, Fandom wiki, Discord/YouTube; competitive IVL/COA pick-ban) rather than a single tier list, and every recommendation explains which answers drove it. Queue type (solo 野排 vs premade 开黑) and rank change the weighting.

## Operating Context

- The test first asks what the player wants to see (main pick, ranked pool, learning path, team comp, hunter matchups) and how they queue.
- Modes covered: Ranked 1v4 and Quick/Custom 1v4.
- Results: ranked top picks with reasons and "why not X", ranked character pool, learning path (beginner-friendly now → target main later, with a "challenge me" toggle), team comp suggestions, full survivor × hunter matchup matrix.
- Skins are shown in a separate panel only and never affect ranking; tier/price is not treated as quality — community reception is recorded independently.
- Optional small "vibe" module (aesthetic/lore/personality) as a light tiebreaker, off by default.
- Export: a PNG image card of results (for Discord/WeChat).
- Bilingual EN + 中文 toggle.
- Three visual themes selectable by the user: IDV gothic-Victorian, clean modern dark, playful/cute.

## Capabilities and Constraints

- Static site; no accounts, no server-side storage. Algorithm is static (no feedback-driven retuning).
- Works fully without AI. AI (OpenAI-compatible; OpenCode Go needs `x-opencode-session` and a custom User-Agent) only interprets free text (e.g. other games) and writes narrative explanations.
- Data files carry patch/date stamps; roster = 53 survivors and 36 hunters as of 2026-09-30 (newest: "Prodigy"/“神童”, released 2026-09-30, low-confidence data).
- The owner's personal gaming background is a test persona only; it must not tune the algorithm.

## Brand Commitments

Name: **Manor Casebook · 庄园档案** — the questionnaire is framed as a case file that deduces your survivor, matching Identity V's detective/deduction framing.

## Evidence on Hand

Scraped official data (Fandom + wiki.biligame.com/dwrg), community research outputs with source URLs. No character art is rehosted; skin/character images, if shown, are linked from wikis. No invented statistics — unknown values are marked as such.

## Product Principles

1. Playstyle fit first; meta is a modifier, never the driver.
2. Every recommendation is explainable in terms the player answered.
3. Community consensus with sources beats any single opinion.
4. Respect the player's context: rank, queue type, and whether they want a challenge.
5. Useful in three minutes, exhaustive for those who want it.
