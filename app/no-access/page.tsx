import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOut } from "@/components/sign-out";
import { HUB_NAME } from "@/lib/campus";

export default async function NoAccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="auth">
      <div className="auth-hero">
        <h1>{HUB_NAME}</h1>
        <p>This hub is for guides and staff on the access list.</p>
      </div>
      <div className="auth-panel">
        <div>
          <h2 style={{ fontFamily: "var(--display)", fontSize: 30 }}>You&apos;re not on the list yet</h2>
          <p>
            You&apos;re signed in as <strong>{user.email}</strong>, but that email hasn&apos;t been given access. Ask a hub admin to add
            you, then sign in again.
          </p>
          <SignOut className="btn secondary" />
        </div>
      </div>
    </div>
  );
}
