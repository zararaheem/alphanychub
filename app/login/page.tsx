import { HUB_NAME } from "@/lib/campus";
import { GoogleButton } from "./google-button";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="auth">
      <div className="auth-hero">
        <span className="brand-mark" style={{ width: 52, height: 52, fontSize: 20 }}>NYC</span>
        <h1>{HUB_NAME}</h1>
        <p>Emergency contacts, off-campus trips, workshops and program tools for Maiden Ln and Early Years, all in one place.</p>
      </div>
      <div className="auth-panel">
        <div>
          <h2 style={{ fontFamily: "var(--display)", fontSize: 30 }}>Staff sign in</h2>
          {error && <p className="notice error">Sign-in didn&apos;t finish. Please try again.</p>}
          <GoogleButton next={next} />
          <p className="muted small">
            Access is limited to guides and staff on the hub&apos;s access list. If you can&apos;t get in, ask a hub admin to add your school email.
          </p>
        </div>
      </div>
    </div>
  );
}
