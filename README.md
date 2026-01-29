# TeamShuffle

A React web app built to simplify picking 5-a-side football teams. The app ensures balanced teams by considering player roles and provides fun, shareable outputs.

![Screenshot](teamshuffle.jpg)

### Features

- Randomly allocate players to two teams
- Players can be tagged as goalkeepers, defenders, or strikers to ensure balanced teams
- Generate multiple team options for voting
- Randomly generated team names, with local options for London and Hampshire (more regions can be added)
- Export saved teams as an image to share with friends
- Optional "Warren Mode" spices up warnings and summaries. When enabled you can set an aggression slider (0-100%) to control how often the tone is nasty (defaults to 20%).
- Dark mode enabled by default with option to switch to light theme
- Input validation with inline error messages
- Rate-limited API calls to prevent accidental spam

### Player Tags

Use tags after a player's name (prefixed with `#`) to assign roles:

| Tag | Meaning |
|-----|---------|
| `#g` | Goalkeeper |
| `#s` | Striker |
| `#d` | Defender |
| `#1` or `#t1` or `#team1` | Force assign to Team 1 |
| `#2` or `#t2` or `#team2` | Force assign to Team 2 |

**Example:**
```
Alice #g
Bob #g
Carol #d
Dave #s
Eve #1
Frank #2
Grace
Heidi
Ivan
Judy
```

### Architecture

```
src/
├── App.tsx                     # Root component — state, layout, composition
├── types.ts                    # Shared TypeScript interfaces
├── components/
│   ├── HeaderBar.tsx           # Settings modal (uses SettingsContext)
│   ├── PlayerInput.tsx         # Player textarea, validation, buttons
│   ├── PitchRenderer.tsx       # SVG pitch with positioned players
│   ├── TeamSetupCard.tsx       # Team card (colour pickers, AI summary)
│   ├── PlaceholderPitch.tsx    # Empty-state pitch display
│   ├── FloatingFooter.tsx      # Export/share buttons with loading state
│   ├── Notification.tsx        # Toast notifications
│   ├── Footer.tsx              # App footer
│   └── PlayerIcon.tsx          # Player SVG icon
├── contexts/
│   └── SettingsContext.tsx      # Location, AI, Warren, dark mode state
├── constants/
│   ├── gameConstants.ts        # Player limits, colours, timeouts
│   ├── aiPrompts.ts            # Gemini API config, prompt templates
│   ├── teamConstants.ts        # UK locations and team suffixes
│   └── positionsConstants.ts   # Pitch position layouts by team size
├── utils/
│   ├── teamGenerator.ts        # Player parsing, team distribution
│   ├── imageExport.ts          # PNG export and share logic
│   ├── validation.ts           # Input validation and sanitisation
│   ├── rateLimiter.ts          # Throttle utility
│   ├── colorUtils.ts           # Colour distance and contrast
│   ├── locationUtils.ts        # Geolocation and place detection
│   └── teamNameGenerator.ts    # Random team name generation
└── lib/
    └── utils.ts                # Class name merging utility
```

### Local Development

Get started hacking on **TeamShuffle** in just a few steps:

1. Install dependencies
   ```bash
   npm install
   ```
2. Launch the hot-reloading dev server and visit `http://localhost:5173`
   ```bash
   npm run dev
   ```
3. Create and preview a production build
   ```bash
   npm run build
   npm run preview
   ```

### Testing

The project uses [Vitest](https://vitest.dev/) for unit tests.

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

Test files live in the `tests/` directory alongside the source they cover:
- `colorUtils.test.ts` — colour utility functions
- `teamGenerator.test.ts` — player parsing, team balancing, shirt numbers
- `teamNameGenerator.test.ts` — name generation and uniqueness
- `validation.test.ts` — input validation and sanitisation
- `rateLimiter.test.ts` — throttle utility behaviour

### Linting

Keep your code tidy with:

```bash
npm run lint
```

### Deployment

The app is available at [TeamShuffle](https://teamshuffle.app).

### Contributing

Contributions are welcome! Feel free to fork the repository and submit a pull request.

### Licence

This project is licensed under the MIT Licence. See the LICENCE file for details.
