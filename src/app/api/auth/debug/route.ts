import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Temporary debug endpoint – shows why admin check passes/fails.
 *  DELETE THIS FILE after debugging is done. */
export async function GET() {
    try {
        const supabase = await createClient();

        // 1. Get the current user from cookies
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({
                step: "getUser",
                error: userError?.message ?? "No user in session",
                hint: "Server-side Supabase client cannot read session cookies. The code exchange may not have set cookies properly.",
            });
        }

        const email = user.email?.trim().toLowerCase() ?? "";

        // 2. Query allowed_admins
        const { data: allowedList, error: allowedError } = await supabase
            .from("allowed_admins")
            .select("email");

        if (allowedError) {
            return NextResponse.json({
                step: "allowed_admins_query",
                userEmail: email,
                error: allowedError.message,
                code: allowedError.code,
                hint: "RLS or table issue",
            });
        }

        const match = (allowedList ?? []).find(
            (r) => (r.email ?? "").trim().toLowerCase() === email
        );

        // 3. Check events/roles
        const { data: createdEvents } = await supabase
            .from("events")
            .select("id")
            .eq("created_by", user.id)
            .limit(1);
        const { data: roles } = await supabase
            .from("event_roles")
            .select("event_id")
            .eq("user_id", user.id)
            .limit(1);

        return NextResponse.json({
            userEmail: email,
            userId: user.id,
            provider: user.app_metadata?.provider,
            allowedAdminsCount: allowedList?.length ?? 0,
            allowedEmails: (allowedList ?? []).map((r) => r.email),
            matchFound: !!match,
            matchedRow: match ?? null,
            hasCreatedEvents: (createdEvents?.length ?? 0) > 0,
            hasRoles: (roles?.length ?? 0) > 0,
            isAdmin: !!match || (createdEvents?.length ?? 0) > 0 || (roles?.length ?? 0) > 0,
        });
    } catch (err) {
        return NextResponse.json({
            step: "unexpected",
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
