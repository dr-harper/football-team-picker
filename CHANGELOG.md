# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Removed
- Deleted unused `App.css` and `react.svg` template files
- Removed unused `d3` dependency and `@types/node` devDependency
- Removed `Math.floor(2)` dead code in team count

### Refactored
- **Shared types**: Extracted `Player`, `Team`, `TeamSetup`, and `PositionedPlayer` interfaces to `src/types.ts` for reuse across all modules
- **Constants**: Extracted magic numbers (player limits, shirt number range, colours, timeout durations) to `src/constants/gameConstants.ts` and AI prompt strings / Warren phrases to `src/constants/aiPrompts.ts`
- **Component decomposition**: Broke monolithic `App.tsx` (1043 lines) into focused modules:
  - `PlayerInput` — textarea, player count, buttons, error display
  - `PitchRenderer` — SVG pitch with positioned players
  - `TeamSetupCard` — team card with colour pickers, AI summary, pitch
  - `PlaceholderPitch` — empty state pitch display
  - `teamGenerator.ts` — player parsing, shuffling, distribution, shirt numbers
  - `imageExport.ts` — image generation, download, and share logic
  - App.tsx reduced to ~250 lines of state and composition
- **React Context**: Replaced 19-prop `HeaderBar` interface with `SettingsContext` (`SettingsProvider` + `useSettings` hook), moving location, AI, Warren mode, and dark mode state out of App.tsx

### Added
- **Input validation**: `validatePlayerInput()` and `sanitisePlayerName()` utilities. Validates name length (max 30 characters), character pattern (letters, spaces, hyphens, apostrophes), and tag recognition. Inline errors shown in `PlayerInput`; Generate buttons disabled when validation errors are present
- **Export UX improvements**: `isExporting` loading state with spinner animation in `FloatingFooter`. Export and share functions now return `{ success, error? }` and trigger notifications on failure
- **Rate limiting**: `createThrottle()` utility. Geolocation throttled to 10s, Gemini key validation to 5s, AI summary generation to 10s
- **Vitest test suite**: Replaced `node:test` runner with Vitest. 41 tests across 5 files:
  - `colorUtils.test.ts` — colour similarity and palette selection
  - `teamGenerator.test.ts` — parsing, validation, balancing, goalkeeper distribution, shirt numbers
  - `teamNameGenerator.test.ts` — name generation, uniqueness, fallback
  - `validation.test.ts` — name sanitisation, character validation, tag recognition
  - `rateLimiter.test.ts` — throttle behaviour with fake timers
