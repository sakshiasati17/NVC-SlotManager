import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const PROGRAMS = [
  {
    title: "New Venture Challenge",
    blurb: "Connect campus with the Boulder community. Pitch for up to $50,000 in venture funding.",
  },
  {
    title: "Boulder Venture Club",
    blurb: "Student entrepreneurs with diverse perspectives driving innovation and impact on campus and in the community.",
  },
  {
    title: "Get Seed Funding",
    blurb: "Up to $500 in micro-funding for CU Boulder undergrad and grad students with ideas in the making.",
  },
  {
    title: "Startups2Students (S2S)",
    blurb: "A mini job fair connecting entrepreneurially-minded students and Front Range startups.",
  },
  {
    title: "Colorado Sustainability Challenge",
    blurb: "Collaborative event for making positive change—whether you have an idea or want to help ideas become real.",
  },
  {
    title: "Mentor Network",
    blurb: "CU Boulder's entrepreneurial mentor network supporting innovative activity led by students, faculty and staff.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: createdEvents } = await supabase.from("events").select("id").eq("created_by", user.id).limit(1);
    const { data: roles } = await supabase.from("event_roles").select("event_id").eq("user_id", user.id).limit(1);
    isAdmin = (createdEvents?.length ?? 0) > 0 || (roles?.length ?? 0) > 0;
  }

  // For participants: only events they're part of (have a booking in) — never all events
  let myEvents: { id: string; title: string | null; slug: string }[] = [];
  if (user && !isAdmin) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("event_id")
      .eq("auth_user_id", user.id)
      .eq("status", "confirmed");
    const eventIds = [...new Set((bookings ?? []).map((b) => b.event_id).filter(Boolean))];
    if (eventIds.length > 0) {
      const { data: events } = await supabase
        .from("events")
        .select("id, title, slug")
        .in("id", eventIds);
      myEvents = events ?? [];
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Header — responsive, clear nav */}
      <header className="sticky top-0 z-50 border-b border-[var(--card-border)] bg-[var(--card)]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-baseline gap-2 sm:gap-3 min-h-[44px] items-center">
            <span className="text-lg sm:text-2xl font-bold text-[var(--foreground)] tracking-tight">
              Innovation &amp; Entrepreneurship
            </span>
            <span className="text-sm sm:text-lg font-normal text-[var(--muted)]">CU Boulder</span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6" aria-label="Main navigation">
            {user && (
              <Link
                href="/my-bookings"
                className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors py-2 px-1 min-h-[44px] flex items-center"
              >
                My bookings
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors py-2 px-1 min-h-[44px] flex items-center"
              >
                Admin
              </Link>
            )}
            {!user ? (
              <Link
                href="/login"
                className="text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors py-2 px-1 min-h-[44px] flex items-center"
                title="Sign in or sign up to book slots"
              >
                Sign in / Sign up
              </Link>
            ) : null}
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1" tabIndex={-1}>
        {/* Hero — Calendly-style value prop */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-light)]/30 via-[var(--background)] to-[var(--card)]/50" />
          <div className="absolute top-20 right-0 w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] rounded-full bg-[var(--accent)]/10 blur-3xl -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] rounded-full bg-[var(--card)]/50 blur-3xl translate-y-1/2" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16 sm:pb-28 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)] mb-4">
              CU Boulder
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--foreground)] mb-6 leading-[1.1]">
              Start your innovation journey
            </h1>
            <p className="text-base sm:text-xl text-[var(--muted)] max-w-2xl mx-auto mb-4 leading-relaxed">
              The Innovation &amp; Entrepreneurship Initiative is here to connect you with the resources and programs you need to turn your ideas into impactful ventures.
            </p>
            <p className="text-sm sm:text-base text-[var(--accent)] font-medium max-w-2xl mx-auto mb-6">
              This website is for booking slots for I&amp;E events only. Use the link from your organizer to open an event and reserve your slot.
            </p>
            <p className="text-sm sm:text-lg text-[var(--muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
              At CU Boulder, we believe in driving global change together. We invite students, faculty and staff from all corners of campus to come together and ignite the Buff spirit for solving problems. Whether you&apos;re an artist, scientist, engineer or business person, your unique perspective is invaluable in shaping the future.
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] text-white font-semibold px-6 sm:px-8 py-3.5 min-h-[48px] hover:bg-[var(--accent-hover)] transition-all shadow-[var(--shadow-lg)]"
                >
                  Create an event
                </Link>
              ) : (
                <a
                  href="#book-a-slot"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] text-white font-semibold px-6 sm:px-8 py-3.5 min-h-[48px] hover:bg-[var(--accent-hover)] transition-all shadow-[var(--shadow-lg)]"
                >
                  Book a slot
                </a>
              )}
              <Link
                href="https://www.colorado.edu/innovate/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border-2 border-[var(--card-border)] text-[var(--foreground)] font-semibold px-6 sm:px-8 py-3.5 min-h-[48px] hover:bg-[var(--card)] transition-all"
              >
                Programs &amp; resources
              </Link>
            </div>
          </div>
        </section>

        {/* Programs & opportunities — card grid, responsive */}
        <section className="py-12 sm:py-20 bg-[var(--card)]/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-xl sm:text-3xl font-bold text-[var(--foreground)] mb-2">
                Programs &amp; opportunities
              </h2>
              <p className="text-[var(--muted)] max-w-xl mx-auto text-sm sm:text-base">
                Connect with ventures, funding, mentors and campus events.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {PROGRAMS.map((program, i) => (
                <div
                  key={program.title}
                  className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 sm:p-6 shadow-[var(--shadow)] hover:shadow-[var(--shadow-lg)] transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center font-bold text-sm mb-4 group-hover:opacity-90 transition-opacity">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">{program.title}</h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{program.blurb}</p>
                </div>
              ))}
            </div>
            <p className="text-center mt-6 sm:mt-8">
              <Link
                href="https://www.colorado.edu/innovate/events"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] font-medium hover:underline"
              >
                View more events &amp; deadlines →
              </Link>
            </p>
          </div>
        </section>

        {/* Book a slot — participants see only their event(s), never all events */}
        <section id="book-a-slot" className="py-12 sm:py-20 scroll-mt-20 bg-[var(--background)]">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] mb-2">
              {user && myEvents.length > 0 ? "Your event(s)" : "Book a slot"}
            </h2>
            {user && myEvents.length > 0 ? (
              <>
                <p className="text-[var(--muted)] mb-6 text-sm sm:text-base">
                  You only see the event(s) you’re part of. Open an event to view the schedule, book a slot, cancel, or request a swap.
                </p>
                <ul className="space-y-3">
                  {myEvents.map((ev) => (
                    <li key={ev.id}>
                      <Link
                        href={`/e/${ev.slug}`}
                        className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 sm:px-5 py-4 min-h-[52px] hover:border-[var(--accent)]/50 hover:shadow-[var(--shadow)] transition-all group"
                      >
                        <span className="font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors truncate mr-2">
                          {ev.title ?? "Event"}
                        </span>
                        <span className="text-[var(--muted)] group-hover:text-[var(--accent)] text-sm shrink-0">View schedule →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-[var(--muted)]">
                  <Link href="/my-bookings" className="font-medium text-[var(--accent)] hover:underline">My bookings</Link>
                  {" "}— see your slots and manage bookings.
                </p>
              </>
            ) : user ? (
              <>
                <p className="text-[var(--muted)] mb-4 text-sm sm:text-base">
                  Use the link your organizer shared with you to open an event and book a slot. You’ll only see that event—no other events are listed.
                </p>
                <p className="text-sm text-[var(--muted)]">
                  After you book, that event will appear here under <strong>Your event(s)</strong>. In <Link href="/my-bookings" className="font-medium text-[var(--accent)] hover:underline">My bookings</Link> you’ll see your slots.
                </p>
              </>
            ) : (
              <>
                <p className="text-[var(--muted)] mb-4 text-sm sm:text-base">
                  Your organizer will share a link to their event. Use that link to see the schedule and book your slot—you’ll only see that event and your slots there.
                </p>
                <p className="text-[var(--muted)] mb-6 text-sm sm:text-base">
                  Sign in or sign up to book, cancel, or request a swap. In <strong>My bookings</strong> you’ll see only the events you’ve signed up for and your slots.
                </p>
                <p className="text-sm text-[var(--foreground)] bg-[var(--accent-light)]/50 border border-[var(--accent)]/30 rounded-lg px-4 py-3 inline-block">
                  <Link href="/login" className="font-semibold text-[var(--accent)] underline hover:no-underline">
                    Sign in or sign up
                  </Link>
                  {" "}to book a slot when you have your event link.
                </p>
              </>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[var(--card-border)] bg-[var(--card)]/50 py-8 sm:py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p className="text-sm text-[var(--muted)]">
              Innovation &amp; Entrepreneurship Initiative · CU Boulder
            </p>
            <a
              href="https://www.colorado.edu/innovate/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              colorado.edu/innovate
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
