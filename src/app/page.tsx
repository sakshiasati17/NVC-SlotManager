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
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Header — Calendly-style clean nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-2 sm:gap-3">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Innovation &amp; Entrepreneurship
            </span>
            <span className="text-base sm:text-lg font-normal text-slate-500">CU Boulder</span>
          </Link>
          <nav className="flex items-center gap-6">
            {user && (
              <Link
                href="/my-bookings"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                My bookings
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Admin
              </Link>
            )}
            {!user ? (
              <Link
                href="/login"
                className="text-sm font-semibold text-amber-700 hover:text-amber-800 transition-colors"
                title="Sign in or sign up to book slots"
              >
                Sign in / Sign up
              </Link>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — Calendly-style value prop */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/90 via-white to-slate-50/80" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full bg-amber-100/40 blur-3xl -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-slate-100/50 blur-3xl translate-y-1/2" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-20 sm:pb-28 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-700 mb-4">
              CU Boulder
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
              Start your innovation journey
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-6 leading-relaxed">
              The Innovation &amp; Entrepreneurship Initiative is here to connect you with the resources and programs you need to turn your ideas into impactful ventures.
            </p>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              At CU Boulder, we believe in driving global change together. We invite students, faculty and staff from all corners of campus to come together and ignite the Buff spirit for solving problems. Whether you&apos;re an artist, scientist, engineer or business person, your unique perspective is invaluable in shaping the future.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-full bg-amber-600 text-white font-semibold px-8 py-3.5 hover:bg-amber-700 transition-all shadow-lg shadow-amber-900/10"
                >
                  Create an event
                </Link>
              ) : (
                <a
                  href="#book-a-slot"
                  className="inline-flex items-center justify-center rounded-full bg-amber-600 text-white font-semibold px-8 py-3.5 hover:bg-amber-700 transition-all shadow-lg shadow-amber-900/10"
                >
                  Book a slot
                </a>
              )}
              <Link
                href="https://www.colorado.edu/innovate/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border-2 border-slate-300 text-slate-700 font-semibold px-8 py-3.5 hover:border-slate-400 hover:bg-slate-50 transition-all"
              >
                Programs &amp; resources
              </Link>
            </div>
          </div>
        </section>

        {/* Programs & opportunities — card grid */}
        <section className="py-16 sm:py-20 bg-slate-50/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                Programs &amp; opportunities
              </h2>
              <p className="text-slate-600 max-w-xl mx-auto">
                Connect with ventures, funding, mentors and campus events.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {PROGRAMS.map((program, i) => (
                <div
                  key={program.title}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-amber-200/60 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm mb-4 group-hover:bg-amber-200/80 transition-colors">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{program.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{program.blurb}</p>
                </div>
              ))}
            </div>
            <p className="text-center mt-8">
              <Link
                href="https://www.colorado.edu/innovate/events"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 font-medium hover:underline"
              >
                View more events &amp; deadlines →
              </Link>
            </p>
          </div>
        </section>

        {/* Book a slot — participants see only their event(s), never all events */}
        <section id="book-a-slot" className="py-16 sm:py-20 scroll-mt-20 bg-white">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {user && myEvents.length > 0 ? "Your event(s)" : "Book a slot"}
            </h2>
            {user && myEvents.length > 0 ? (
              <>
                <p className="text-slate-600 mb-6">
                  You only see the event(s) you’re part of. Open an event to view the schedule, book a slot, cancel, or request a swap.
                </p>
                <ul className="space-y-3">
                  {myEvents.map((ev) => (
                    <li key={ev.id}>
                      <Link
                        href={`/e/${ev.slug}`}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-amber-300 hover:shadow-md transition-all group"
                      >
                        <span className="font-medium text-slate-900 group-hover:text-amber-700 transition-colors">
                          {ev.title ?? "Event"}
                        </span>
                        <span className="text-slate-400 group-hover:text-amber-600 text-sm">View schedule →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-slate-600">
                  <Link href="/my-bookings" className="font-medium text-amber-700 hover:underline">My bookings</Link>
                  {" "}— see your slots and manage bookings.
                </p>
              </>
            ) : user ? (
              <>
                <p className="text-slate-600 mb-4">
                  Use the link your organizer shared with you to open an event and book a slot. You’ll only see that event—no other events are listed.
                </p>
                <p className="text-sm text-slate-600">
                  After you book, that event will appear here under <strong>Your event(s)</strong>. In <Link href="/my-bookings" className="font-medium text-amber-700 hover:underline">My bookings</Link> you’ll see your slots.
                </p>
              </>
            ) : (
              <>
                <p className="text-slate-600 mb-4">
                  Your organizer will share a link to their event. Use that link to see the schedule and book your slot—you’ll only see that event and your slots there.
                </p>
                <p className="text-slate-600 mb-6">
                  Sign in or sign up to book, cancel, or request a swap. In <strong>My bookings</strong> you’ll see only the events you’ve signed up for and your slots.
                </p>
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 inline-block">
                  <Link href="/login" className="font-semibold underline hover:no-underline">
                    Sign in or sign up
                  </Link>
                  {" "}to book a slot when you have your event link.
                </p>
              </>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-slate-50/40 py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
<p className="text-sm text-slate-600">
            Innovation &amp; Entrepreneurship Initiative · CU Boulder
          </p>
          <a
              href="https://www.colorado.edu/innovate/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-amber-700 hover:underline"
            >
              colorado.edu/innovate
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
