import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: createdEvents } = await supabase.from("events").select("id").eq("created_by", user.id).limit(1);
    const { data: roles } = await supabase.from("event_roles").select("event_id").eq("user_id", user.id).limit(1);
    isAdmin = (createdEvents?.length ?? 0) > 0 || (roles?.length ?? 0) > 0;
  }

  const { data: events } = await supabase
    .from("events")
    .select("id, title, slug")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-[var(--foreground)]">
            Slot Time
          </Link>
          <nav className="flex items-center gap-4">
            {user && (
              <Link href="/my-bookings" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                My bookings
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Admin
              </Link>
            )}
            {!user && (
              <Link href="/login" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                Sign in
              </Link>
            )}
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
          {isAdmin ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] text-white font-medium px-6 py-3 hover:bg-[var(--accent-hover)] transition-colors shadow-[var(--shadow)]"
              >
                Create an event
              </Link>
              <span className="text-[var(--muted)] self-center">or share your event link with participants</span>
            </div>
          ) : (
            <p className="text-[var(--muted)]">Use a shared event link to sign up for a slot, or see open events below.</p>
          )}
        </div>

        {!isAdmin && events && events.length > 0 && (
          <section className="max-w-2xl mx-auto mt-12 w-full px-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Open events</h2>
            <ul className="space-y-2 rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-4">
              {events.map((ev) => (
                <li key={ev.id}>
                  <Link href={`/e/${ev.slug}`} className="font-medium text-[var(--accent)] hover:underline">
                    {ev.title ?? "Event"}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

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
