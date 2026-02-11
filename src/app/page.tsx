import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-[var(--foreground)]">
            Slot Time
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)] mb-4">
            One link. Everyone signs up.
          </h1>
          <p className="text-lg text-[var(--muted)] mb-10">
            Create events and time slots in seconds. Participants pick a slot, see who’s in each, swap with others, or join the waitlist. No spreadsheets, no chasing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] text-white font-medium px-6 py-3 hover:bg-[var(--accent-hover)] transition-colors shadow-[var(--shadow)]"
            >
              Create an event
            </Link>
            <span className="text-[var(--muted)] self-center">or share your event link with participants</span>
          </div>
        </div>

        <section className="max-w-4xl mx-auto mt-24 grid sm:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-[var(--radius)] bg-[var(--card)] border border-[var(--card-border)] shadow-[var(--shadow)]">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center font-semibold mb-4">1</div>
            <h2 className="font-semibold text-[var(--foreground)] mb-2">Create & share</h2>
            <p className="text-sm text-[var(--muted)]">Set up your event and generate slots in bulk. Share one link—everyone sees open and taken slots.</p>
          </div>
          <div className="p-6 rounded-[var(--radius)] bg-[var(--card)] border border-[var(--card-border)] shadow-[var(--shadow)]">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center font-semibold mb-4">2</div>
            <h2 className="font-semibold text-[var(--foreground)] mb-2">Sign up & swap</h2>
            <p className="text-sm text-[var(--muted)]">Participants claim a slot (no double-booking). See who’s in each slot. Request swaps or join the waitlist.</p>
          </div>
          <div className="p-6 rounded-[var(--radius)] bg-[var(--card)] border border-[var(--card-border)] shadow-[var(--shadow)]">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center font-semibold mb-4">3</div>
            <h2 className="font-semibold text-[var(--foreground)] mb-2">Export & remind</h2>
            <p className="text-sm text-[var(--muted)]">Export CSV, send reminders, and keep an audit log. The group self-manages—you just set it up.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--card-border)] py-6 text-center text-sm text-[var(--muted)]">
        Slot Time — better than spreadsheets
      </footer>
    </div>
  );
}
