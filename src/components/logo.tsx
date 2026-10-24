import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 text-ink">
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-night">
        <span className="relative block h-4 w-4">
          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper" />
          <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-terra" />
          <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-[#e7b089]" />
          <span className="absolute bottom-0 left-0 h-1.5 w-1.5 rounded-full bg-[#8fbfa8]" />
        </span>
      </span>
      <span className="font-serif text-2xl leading-none tracking-tight">Papis</span>
    </Link>
  );
}
