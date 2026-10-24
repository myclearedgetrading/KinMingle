import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const points = [
  {
    title: "One page for the whole family",
    body: "Photos, videos, voice notes, and files land in one place. Nobody has to scroll a group chat to find them later.",
  },
  {
    title: "A voice note when typing is too much",
    body: "Record from the phone or computer and leave it on the page. The people who missed the call can still hear you.",
  },
  {
    title: "Live, for the moments that are happening now",
    body: "Sunday lunch, a school play, a walk. Start a stream and the circle can watch it together.",
  },
];

export default function LandingPage() {
  return (
    <main className="home-hero min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="text-sm font-semibold text-ink">
            Sign in
          </Link>
        </div>
      </header>
      <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-20 pt-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-terra">Life happens. Stay close.</p>
          <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[1.05] text-ink sm:text-7xl">
            The family room, without the group-chat noise.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            WhatsApp can stay the place you talk. KinMingle is the place everyone goes to see what life looks like — a photo, a voice note, a school file, a live look at the room.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-full bg-terra px-5 py-3 text-sm font-semibold text-white hover:bg-[#0046ba]">
              Sign in
            </Link>
            <Link href="/join" className="rounded-full border border-line bg-card px-5 py-3 text-sm font-semibold text-ink">
              Start a circle
            </Link>
            <Link href="/join?mode=join" className="rounded-full border border-line bg-card px-5 py-3 text-sm font-semibold text-ink">
              I have an invite
            </Link>
          </div>
        </div>
        <aside className="rounded-[2rem] border border-line bg-card p-6 shadow-card">
          <p className="font-serif text-3xl text-ink">Today in the house</p>
          <ul className="mt-6 space-y-4 text-sm leading-relaxed">
            <li className="rounded-2xl bg-paper px-4 py-3">Elena posted two photos from the garden.</li>
            <li className="rounded-2xl bg-paper px-4 py-3">Jonah left a voice note from the drive.</li>
            <li className="rounded-2xl bg-blush px-4 py-3 text-terra">Sam is live — school play, act two.</li>
          </ul>
          <p className="mt-6 text-xs uppercase tracking-[0.16em] text-muted">Invite only. No ads. No strangers.</p>
        </aside>
      </section>
      <section className="mx-auto grid w-full max-w-6xl gap-4 px-5 pb-24 md:grid-cols-3">
        {points.map((point) => (
          <article key={point.title} className="rounded-[1.75rem] border border-line bg-card/90 p-6 shadow-card backdrop-blur">
            <h2 className="font-serif text-3xl leading-tight text-ink">{point.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{point.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
