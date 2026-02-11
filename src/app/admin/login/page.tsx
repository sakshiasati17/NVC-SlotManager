import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "./admin-login-form";

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/admin");

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-lg)]">
        <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">Admin login</h1>
        <p className="text-sm text-[var(--muted)] mb-6">Sign in to create and manage events.</p>
        <AdminLoginForm />
        <p className="mt-4 text-center">
          <Link href="/" className="text-sm text-[var(--accent)] hover:underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
