import { redirect } from "next/navigation";
import { GoogleButton } from "@/app/login/google-button";
import { currentFamily, signedInEmail } from "@/lib/parent-session";
import { parentSignOut } from "../actions";

export default async function ParentSignIn({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  if (await currentFamily()) redirect("/parents");
  const email = await signedInEmail();
  const { err } = await searchParams;
  return (
    <div className="stack ph-narrow">
      <h1>Sign in</h1>
      {err && <p className="notice error" role="alert">Sign-in didn&apos;t finish. Please try again.</p>}
      {email ? (
        <div className="card">
          <p><b>{email}</b> isn&apos;t on our family list.</p>
          <p className="small muted">Sign in with the Google account for the email the school has for you. If that&apos;s not a Google account, contact your Campus Coordinator.</p>
          <form action={parentSignOut}><button type="submit" className="btn outline">Use a different account</button></form>
        </div>
      ) : (
        <div className="card">
          <p>Sign in with the Google account for the email the school has for you.</p>
          <GoogleButton next="/parents" />
        </div>
      )}
      <p className="small muted">Emergency? Call 911. Something urgent at school? Contact the Head of School, Tasha Arnold.</p>
    </div>
  );
}
