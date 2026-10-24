import { initials } from "@/lib/format";

export function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
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
