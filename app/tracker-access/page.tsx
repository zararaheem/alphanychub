import { requireMember } from "@/lib/access";
import { GoogleButton } from "@/app/login/google-button";
import { TrackerLogin } from "@/components/early-years/tracker-login";

// Why someone can't open the Montessori tracker, and what to do about it.
export default async function TrackerAccess({ searchParams }: { searchParams: Promise<{ why?: string }> }) {
  const me = await requireMember();
  const { why } = await searchParams;
  const google = why === "google" || !me.google;
  return (
    <TrackerLogin>
      {google ? (
        <>
          <p>The tracker holds children&apos;s work and photos, so it needs your own Google sign-in, not the shared staff code.</p>
          <GoogleButton next="/tracker" />
        </>
      ) : (
        <p><b>{me.email}</b> isn&apos;t approved for the tracker yet. Ask Zara Raheem (Chief of Staff) to give you access.</p>
      )}
    </TrackerLogin>
  );
}
