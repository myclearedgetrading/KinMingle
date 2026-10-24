export const COOKIE = "papis_session";

export const EMOJIS = ["❤️", "😂", "🥹", "👏", "🔥"] as const;

export const AVATAR_COLORS = [
  "#0057E7",
  "#071B4D",
  "#3d6fd8",
  "#1a4fbf",
  "#4c7fe8",
  "#0e3a8a",
  "#2f6fe0",
  "#163a7a",
];

export function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export const LIMITS = {
  image: 20 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  audio: 30 * 1024 * 1024,
  file: 50 * 1024 * 1024,
  maxFiles: 8,
  body: 4000,
  chat: 500,
  name: 40,
  bio: 160,
  familyName: 48,
  liveTitle: 80,
};
