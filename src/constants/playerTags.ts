export const PLAYER_TAGS = [
  // Positional / serious
  { emoji: '🥅', label: 'Avoid Goalkeeper' },
  { emoji: '🛡️', label: 'Prefer at the Back' },
  { emoji: '⚡', label: 'Like to Run' },
  { emoji: '🎯', label: 'Backs Themselves to Score' },
  { emoji: '🤝', label: 'Team Player' },
  { emoji: '🧠', label: 'Reads the Game Well' },
  { emoji: '🦶', label: 'Technical on the Ball' },
  { emoji: '💪', label: 'Physical Presence' },
  { emoji: '🏃', label: 'Fitter Than I Look' },
  { emoji: '🗣️', label: 'Loudest on the Pitch' },
  // Fun / self-deprecating
  { emoji: '⚽', label: 'Mainly Just Involved' },
  { emoji: '🦵', label: 'More Effort Than Elegance' },
  { emoji: '💨', label: 'Slower Than I Think' },
  { emoji: '🎭', label: 'Dramatic Faller' },
  { emoji: '📱', label: 'Best on the Bench' },
  { emoji: '🍺', label: 'Here for the Pub Afterwards' },
  { emoji: '🔥', label: 'Always Blaming the Surface' },
  { emoji: '🤦', label: 'Scores Own Goals' },
  { emoji: '👀', label: 'Watches More Than Plays' },
  { emoji: '🎲', label: 'Unpredictable' },
] as const;

export type PlayerTag = typeof PLAYER_TAGS[number]['label'];
