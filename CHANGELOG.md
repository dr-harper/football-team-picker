# Team Shuffle Changelog

## v1.1.0 - 4th March 2026

### Features:
- 🏠 **Home banner** — context-aware banner below the header on the team generator page: unauthenticated users see sign-in/create-account CTAs; logged-in users see their next upcoming game (league, title, date/time) or a league count summary, with a quick link to the Dashboard

---

## v1.0.0 - 4th March 2026

### Features:
- 🔐 **Auth & Leagues** — sign up with email or Google, create a league, invite others with a shareable join code
- 📅 **Game management** — schedule games within a league, set location, track player availability (in / maybe / out)
- 🔀 **3-step wizard** — game page guides admins through Availability → Teams → Match with a progress bar
- ⚽ **Goal scorers & assists** — tally goals and assists per player during or after a game
- 🏅 **Man of the Match** — award MOTM from participating players
- 📊 **League stats** — top scorers, win rate leaderboard, attendance table, MOTM podium with All-time / This Year / Last Month filter
- 👤 **My Stats** — personal highlight card (Games / Goals / Assists / Win Rate / MOTM) on the league lobby
- 👥 **Guest players** — add non-member guests to games with their own availability tracking
- 📸 **Image export** — share team sheets as images with game context header and weather
- 🌤️ **Weather** — automatic forecast for scheduled game locations
- 📍 **Location map** — Leaflet map preview on game pages
- 🔗 **Short game codes** — 6-character shareable codes in URLs; falls back to Firestore IDs for older games

### Fixes:
- Firestore security rules tightened — game writes restricted to creator; availability writes to the owning user
- SPA rewrites configured in `firebase.json` so direct navigation to any route works correctly

---

## v0.3.0 - Feb 2026

### Features:
- 🌍 **Locales** — 9 UK and Irish locales with locale-specific team name suffixes (~90 options)
- 🎨 **UI refresh** — modernised 2025 styling with coherent button colour scheme

---

## v0.2.0 - Jan 2026

### Features:
- 🤖 **AI team summaries** — Gemini-powered team name and summary generation
- 🔄 **Player swap** — click any two players on the pitch to swap positions and teams
- 🃏 **Warren mode** — commentary mode with custom phrases

### Refactored:
- Broke monolithic `App.tsx` into focused components — `PlayerInput`, `PitchRenderer`, `TeamSetupCard`, `teamGenerator.ts`, `imageExport.ts`
- Extracted shared types to `src/types.ts` and constants to `src/constants/`
- Replaced 19-prop `HeaderBar` with `SettingsContext`

---

## v0.1.0 - Dec 2025

### Features:
- ⚽ **Team generator** — paste player names, generate balanced teams with shirt numbers
- 🖼️ **Image export** — download or share team sheets as PNG
- ✅ **Input validation** — player name sanitisation with inline error display
- 🧪 **Tests** — 41 Vitest tests across team generation, validation, colour utils, and rate limiting
