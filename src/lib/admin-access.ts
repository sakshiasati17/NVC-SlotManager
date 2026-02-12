import { createClient } from "@/lib/supabase/server";

/**
 * Check if the current user is allowed to use admin (create/manage events).
 * Allowed if: (1) their email is in allowed_admins, OR (2) they already created an event or have an event_roles entry.
 */
export async function isAllowedAdmin(): Promise<{ allowed: boolean; email: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { allowed: false, email: null };

  const email = user.email.trim().toLowerCase();

  // Already an admin by virtue of having created an event or having a role
  const { data: createdEvents } = await supabase.from("events").select("id").eq("created_by", user.id).limit(1);
  const { data: roles } = await supabase.from("event_roles").select("event_id").eq("user_id", user.id).limit(1);
  if ((createdEvents?.length ?? 0) > 0 || (roles?.length ?? 0) > 0) {
    return { allowed: true, email: user.email };
  }

  // Check allowed_admins (I&E staff list), case-insensitive
  const { data: allowedList } = await supabase.from("allowed_admins").select("email");
  const allowed = (allowedList ?? []).some((r) => (r.email ?? "").trim().toLowerCase() === email);
  if (allowed) return { allowed: true, email: user.email };

  return { allowed: false, email: user.email };
}
