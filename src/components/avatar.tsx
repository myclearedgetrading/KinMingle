import { initials } from "@/lib/format";

export function Avatar({ name, color, size = 40, userId, photo = false }: { name: string; color: string; size?: number; userId?: string; photo?: boolean }) {
  if (userId && photo) {
    return (
      <img
        src={`/api/users/${userId}/avatar`}
        alt=""
        className="inline-block shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ backgroundColor: color, width: size, height: size, fontSize: Math.max(12, size * 0.36) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
