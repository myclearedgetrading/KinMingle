import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    title: "Photos",
    body: "The garden, the birthday, the ordinary Tuesday. Pictures stay on the family page instead of sinking in a chat.",
    icon: "photo",
  },
  {
    title: "Video",
    body: "A clip from the game or the kitchen. Post it once, and anyone in the circle can watch it when they have a minute.",
    icon: "video",
  },
  {
    title: "Voice notes",
    body: "Record from the phone or the computer when typing is too much. The people who missed the call can still hear you.",
    icon: "voice",
  },
  {
    title: "Files",
    body: "School forms, a recipe, a boarding pass. Drop the file on the page so the right people can find it later.",
    icon: "file",
  },
  {
    title: "Live, together",
    body: "Start a live for Sunday lunch or the school play. Anyone in the circle can watch, turn on a camera, talk, or share a screen.",
    icon: "live",
  },
  {
    title: "One family page",
    body: "Everything lands in one feed. Filter down to photos, video, voice, or files when you are looking for a specific thing.",
    icon: "page",
  },
  {
    title: "Comments and reactions",
    body: "Answer on the post itself. The reply stays with the photo, not in a side conversation that disappears by morning.",
    icon: "comment",
  },
  {
    title: "A private circle",
    body: "You start the circle and send one invite code. Only the people you let in can see the page. No ads. No strangers.",
    icon: "lock",
  },
];

const steps = [
  {
    n: "01",
    title: "Start a circle",
    body: "Name it for your family or the friends who already share a life. The circle is the whole product: one private page.",
  },
  {
    n: "02",
    title: "Invite the people who belong",
    body: "Send the code. They make an account, join, and they are in. Nobody else can wander onto the page.",
  },
  {
    n: "03",
    title: "Leave the day where they can find it",
    body: "A photo, a voice note, a file, or a live look at the room. Talk in the chat you already use. Keep life here.",
  },
];

const compare = [
  ["What it is for", "Seeing what life looks like", "Talking in the moment"],
  ["Photos and files", "They stay on the family page", "They scroll away"],
  ["Voice", "A note you can come back to", "Another message in the pile"],
  ["Live", "A room the circle can watch, speak in, and share a screen", "A call you join or miss"],
  ["Who can see it", "Only the people you invite", "Whoever is in that chat"],
];

const questions = [
  {
    q: "Who can see what we post?",
    a: "Only the people in your circle. KinMingle is invite-only. There is no public profile and no feed of strangers.",
  },
  {
    q: "How does someone join?",
    a: "You start a circle and share the invite code. They create an account, enter the code, and they are in.",
  },
  {
    q: "Is this another group chat?",
    a: "No. Keep WhatsApp, or whatever you already use, for the back-and-forth. KinMingle is the page you open when you want to see the day.",
  },
  {
    q: "Can more than one person be on a live?",
    a: "Yes. The person who starts it is hosting, and anyone who joins can turn on a camera, talk, or share their screen.",
  },
  {
    q: "What can we share?",
    a: "A written note, photos, video, a voice note recorded in the browser, and files. People can comment and react on the post.",
  },
];

export default function LandingPage() {
  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Logo />
          <nav aria-label="Page" className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#compare" className="hover:text-ink">Why here</a>
            <a href="#questions" className="hover:text-ink">Questions</a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-semibold text-ink">
              Sign in
            </Link>
            <Link href="/join" className="hidden rounded-full bg-terra px-4 py-2 text-sm font-semibold text-white hover:bg-[#0046ba] sm:inline-flex">
              Start a circle
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="home-hero">
          <div className="mx-auto flex min-h-[34rem] w-full max-w-6xl items-end px-5 pb-20 pt-14">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-terra">Life happens. Stay close.</p>
              <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[1.05] text-ink sm:text-7xl">
                The family room, without the group-chat noise.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                WhatsApp can stay the place you talk. KinMingle is the place everyone goes to see what life looks like — a photo, a voice note, a school file, a live look at the room.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/join" className="rounded-full bg-terra px-5 py-3 text-sm font-semibold text-white hover:bg-[#0046ba]">
                  Start a circle
                </Link>
                <Link href="/join?mode=join" className="rounded-full border border-line bg-card px-5 py-3 text-sm font-semibold text-ink">
                  I have an invite
                </Link>
                <Link href="/login" className="rounded-full border border-line bg-card px-5 py-3 text-sm font-semibold text-ink">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="The promise" className="border-b border-line">
          <ul className="mx-auto grid w-full max-w-6xl gap-3 px-5 py-6 text-sm font-medium text-muted sm:grid-cols-2 lg:grid-cols-4">
            {["Invite only", "One private page", "No ads", "No public feed"].map((item) => (
              <li key={item} className="rounded-full border border-line bg-card px-4 py-3 text-center text-ink">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-5 py-20">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-terra">Features</p>
          <h2 className="mt-3 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Everything the group chat was never built to hold.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            One page for the people who already know each other. Post the day, find it later, and be in the room when it is happening now.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-[1.75rem] border border-line bg-card p-6 shadow-card">
                <FeatureIcon name={feature.icon} />
                <h3 className="mt-5 font-serif text-3xl leading-tight text-ink">{feature.title}</h3>
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="border-y border-line bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-5 py-20">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-terra">How it works</p>
            <h2 className="mt-3 max-w-xl font-serif text-4xl leading-tight text-ink sm:text-5xl">Three steps, then it is just the family page.</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <li key={step.n} className="rounded-[1.75rem] border border-line bg-card p-6 shadow-card">
                  <p className="font-serif text-2xl text-terra">{step.n}</p>
                  <h3 className="mt-4 font-serif text-3xl leading-tight text-ink">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="compare" className="mx-auto w-full max-w-6xl px-5 py-20">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-terra">Why here</p>
          <h2 className="mt-3 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">Keep the chat. Give the day a home.</h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            The group chat is good at “are you coming.” It is a poor place to keep a photo, a school file, or the look of a Sunday.
          </p>
          <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-line bg-card shadow-card">
            <div className="grid grid-cols-1 gap-2 border-b border-line px-5 py-4 text-sm font-semibold sm:grid-cols-[1.1fr_1fr_1fr] sm:gap-4">
              <span className="hidden text-muted sm:block"> </span>
              <span>KinMingle</span>
              <span className="text-muted">Group chat</span>
            </div>
            {compare.map(([label, here, chat]) => (
              <div key={label} className="grid grid-cols-1 gap-1 border-b border-line px-5 py-4 text-sm leading-relaxed last:border-b-0 sm:grid-cols-[1.1fr_1fr_1fr] sm:gap-4">
                <p className="font-semibold text-ink">{label}</p>
                <p className="text-ink">{here}</p>
                <p className="text-muted">{chat}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="questions" className="border-t border-line bg-card/40">
          <div className="mx-auto w-full max-w-3xl px-5 py-20">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-terra">Questions</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-ink sm:text-5xl">Before you send the invite.</h2>
            <div className="mt-8 divide-y divide-line rounded-[1.75rem] border border-line bg-card px-6 shadow-card">
              {questions.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="cursor-pointer list-none font-serif text-2xl leading-tight text-ink [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start justify-between gap-4">
                      {item.q}
                      <span aria-hidden className="mt-1 text-terra transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-20">
          <div className="rounded-[2rem] border border-line bg-card px-6 py-12 text-center shadow-card sm:px-12">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-terra">Life happens. Stay close.</p>
            <h2 className="mx-auto mt-4 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-6xl">
              Open the room. Invite the people who belong there.
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/join" className="rounded-full bg-terra px-5 py-3 text-sm font-semibold text-white hover:bg-[#0046ba]">
                Start a circle
              </Link>
              <Link href="/join?mode=join" className="rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink">
                I have an invite
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted">Life happens. Stay close.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted">
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#questions" className="hover:text-ink">Questions</a>
            <Link href="/login" className="hover:text-ink">Sign in</Link>
            <Link href="/join" className="hover:text-ink">Start a circle</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function FeatureIcon({ name }: { name: string }) {
  return (
    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blush text-terra">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        {name === "photo" && (
          <>
            <rect x="3.5" y="5" width="17" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.4" />
            <path d="M4 16.5 8.5 12l3 3 2.2-2.2L20 17" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {name === "video" && (
          <>
            <rect x="3" y="6" width="13" height="12" rx="2" />
            <path d="M16 10.5 21 8v8l-5-2.5z" strokeLinejoin="round" />
          </>
        )}
        {name === "voice" && (
          <>
            <rect x="9" y="3.5" width="6" height="10" rx="3" />
            <path d="M7 11a5 5 0 0 0 10 0M12 16v4.5" strokeLinecap="round" />
          </>
        )}
        {name === "file" && (
          <>
            <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z" strokeLinejoin="round" />
            <path d="M14 3.5V8h4.5M8.5 12.5h7M8.5 16h5" strokeLinecap="round" />
          </>
        )}
        {name === "live" && (
          <>
            <circle cx="12" cy="12" r="2.2" />
            <path d="M7.2 7.2a6.8 6.8 0 0 0 0 9.6M16.8 7.2a6.8 6.8 0 0 1 0 9.6" strokeLinecap="round" />
          </>
        )}
        {name === "page" && (
          <>
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M4 9h16M9 9v11" strokeLinecap="round" />
          </>
        )}
        {name === "comment" && (
          <path d="M6 6.5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H11l-4.5 3v-3H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" strokeLinejoin="round" />
        )}
        {name === "lock" && (
          <>
            <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
            <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" strokeLinecap="round" />
          </>
        )}
      </svg>
    </span>
  );
}
