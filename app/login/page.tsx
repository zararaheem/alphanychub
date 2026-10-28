import { Brand } from "@/components/brand";
import { GoogleButton } from "./google-button";
import { signInWithCode } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const codeEnabled = !!process.env.STAFF_ACCESS_CODE;
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === "on";

  return (
    <div className="auth">
      <div className="auth-hero">
        <span className="brand"><Brand size={48} /></span>
        <span className="kicker" style={{ color: "#fff", opacity: 0.85, marginTop: 24 }}>Alpha Anywhere Learning Center</span>
        <h1>Staff <em>hub</em></h1>
        <p>Emergency contacts and procedures, workshops, and program tools for Maiden Ln and Early Years, all in one place.</p>
      </div>
      <div className="auth-panel">
        <div>
          <h2 style={{ fontFamily: "var(--display)", fontSize: 30, fontWeight: 800 }}>Staff sign in</h2>
          {error === "code" && <p className="notice error" role="alert">That code didn&apos;t work. Check it and try again.</p>}
          {error && error !== "code" && <p className="notice error" role="alert">Sign-in didn&apos;t finish. Please try again.</p>}

          {codeEnabled && (
            <form action={signInWithCode} className="stack">
              {next && <input type="hidden" name="next" value={next} />}
              <div className="field">
                <label htmlFor="code">Staff access code</label>
                <input id="code" name="code" className="input" autoComplete="off" autoCapitalize="none" spellCheck={false} required style={{ minHeight: 52, fontSize: 17 }} />
              </div>
              <button type="submit" className="btn" style={{ minHeight: 52, fontSize: 17 }}>Enter hub</button>
            </form>
          )}

          {googleEnabled ? (
            <GoogleButton next={next} />
          ) : (
            <button type="button" className="btn secondary" disabled aria-disabled="true" style={{ minHeight: 48, opacity: 0.6, cursor: "not-allowed" }}>
              Sign in with Google · coming soon
            </button>
          )}

          <p className="muted small">
            Access is limited to Alpha NYC guides and staff. Ask a hub admin for the staff access code.
          </p>
          <a href="/parents" className="btn outline" style={{ minHeight: 48 }}>I&apos;m a parent: go to the Parent Hub</a>
        </div>
      </div>
    </div>
  );
}
