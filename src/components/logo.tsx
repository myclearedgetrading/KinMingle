import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 text-ink">
      <img src="/brand/km.png" alt="" className="h-9 w-9" />
      <span className="font-sans text-[1.65rem] font-semibold leading-none tracking-tight">KinMingle</span>
    </Link>
  );
}
