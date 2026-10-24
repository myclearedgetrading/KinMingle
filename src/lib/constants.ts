export const COOKIE = "papis_session";

export const EMOJIS = ["❤️", "😂", "🥹", "👏", "🔥"] as const;

export const AVATAR_COLORS = [
  "#c4552a",
  "#2f5d50",
  "#3d4f7c",
  "#8a5a44",
  "#6b4c7a",
  "#3f6b4a",
  "#a33b3b",
  "#3e5f73",
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
