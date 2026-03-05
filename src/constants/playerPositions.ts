export const PLAYER_POSITIONS = [
  { emoji: '🥅', label: 'Goalkeeper' },
  { emoji: '🛡️', label: 'Defender' },
  { emoji: '⚙️', label: 'Midfielder' },
  { emoji: '⚡', label: 'Attacker' },
  { emoji: '🔄', label: 'No Preference' },
] as const;

export type PlayerPosition = typeof PLAYER_POSITIONS[number]['label'];
