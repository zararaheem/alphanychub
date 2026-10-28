import { emailReady, parentHubReady } from "@/lib/parent-session";
import { checkParentCode, requestParentCode } from "../actions";

const ERRORS: Record<string, string> = {
  code: "That code didn't work or has expired. Check it, or send a new one.",
  wait: "We just sent a code. Check your inbox (and spam) before asking for another.",
  "not-ready": "Parent sign-in isn't switched on yet. Please contact your Campus Coordinator.",
};

export default async function ParentSignIn({ searchParams }: { searchParams: Promise<{ step?: string; email?: string; err?: string }> }) {
  const { step, email, err } = await searchParams;
  const ready = parentHubReady() && emailReady();
  return (
    <div className="stack ph-narrow">
      <h1>Sign in</h1>
      {err && <p className={`notice ${err === "wait" ? "warn" : "error"}`} role="alert">{ERRORS[err] ?? "Something went wrong. Try again."}</p>}
      {!ready && !err && <p className="notice warn">Parent sign-in is being set up. Staff can preview the Parent Hub while signed into the staff hub.</p>}
      {step === "code" && email ? (
        <form action={checkParentCode} className="card">
          <input type="hidden" name="email" value={email} />
          <p>If <b>{email}</b> is on our family list, we&apos;ve emailed it a 6-digit code.</p>
          <div className="field">
            <label htmlFor="code">Code</label>
            <input id="code" name="code" className="input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required style={{ minHeight: 52, fontSize: 20, letterSpacing: ".2em" }} />
          </div>
          <button type="submit" className="btn" style={{ minHeight: 48 }}>Sign in</button>
          <a href="/parents/sign-in" className="small">Use a different email or send a new code</a>
        </form>
      ) : (
        <form action={requestParentCode} className="card">
          <div className="field">
            <label htmlFor="email">Your email</label>
            <input id="email" name="email" type="email" className="input" autoComplete="email" required defaultValue={email} style={{ minHeight: 52, fontSize: 17 }} />
            <span className="small muted">Use the email the school has for you.</span>
          </div>
          <button type="submit" className="btn" style={{ minHeight: 48 }} disabled={!ready}>Email me a code</button>
        </form>
      )}
      <p className="small muted">Emergency? Call 911. Something urgent at school? Contact the Head of School, Tasha Arnold.</p>
    </div>
  );
}
