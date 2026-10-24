import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-terra">Papis</p>
      <h1 className="mt-3 font-serif text-5xl text-ink">That page isn't in the house.</h1>
      <Link href="/home" className="mt-8 text-sm font-semibold text-pine underline decoration-pine/30 underline-offset-4">
        Back to the room
      </Link>
    </main>
  );
}
