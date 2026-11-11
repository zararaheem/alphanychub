import { Brand } from "@/components/brand";
import { GoogleButton } from "@/app/login/google-button";

// Sign-in for the Wonder Lab Montessori tracker: Google only, for approved guides.
export function TrackerLogin({ next = "/tracker", error, children }: { next?: string; error?: boolean; children?: React.ReactNode }) {
  return (
    <div className="tl">
      <span className="brand tl-brand"><Brand size={44} /></span>
      <div className="tl-card">
        <span className="kicker">Early Years · William St</span>
        <h1>Early Years <em>Tracker</em></h1>
        <p className="muted">Record lessons and standout moments, follow each child&apos;s skills, and share weekly reports with families.</p>
        {error && <p className="notice error" role="alert">Sign-in didn&apos;t finish. Please try again.</p>}
        {children ?? (
          <>
            <GoogleButton next={next} />
            <p className="small muted">Use your @alpha.school Google account. Only guides approved by the Early Years team can sign in.</p>
          </>
        )}
      </div>
      <p className="tl-foot small">Montessori lessons from the PreK Crosswalk · skills from the Wonder Lab Success Indicators</p>
    </div>
  );
}
