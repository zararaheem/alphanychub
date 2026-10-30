"use client";

import { useState } from "react";
import type { ParentDemoData } from "@/lib/parent-demo";

type Screen = { tab: "home" } | { tab: "section"; slug: string } | { tab: "contacts" } | { tab: "change" };

const tidy = (v: string | null) => (v ?? "").replace(/^PLACEHOLDER\s*[—-]?\s*/i, "").trim();
const isPlaceholder = (v: string | null) => /placeholder/i.test(v ?? "");

// Phone-sized click-through of the Parent Hub. Demo only: nothing is sent.
export function ParentDemo({ data }: { data: ParentDemoData }) {
  const [screen, setScreen] = useState<Screen>({ tab: "home" });
  const [sent, setSent] = useState(false);
  const today = data.info.filter((i) => i.section === "daily");

  return (
    <div className="pv-phone" role="region" aria-label="Parent Hub demo">
      <header className="pv-top">
        {screen.tab === "section" ? (
          <button type="button" className="pv-back" onClick={() => setScreen({ tab: "home" })}>← Back</button>
        ) : <span className="pv-brand">Alpha NYC · Parent Hub</span>}
        <span className="pv-demo">Demo</span>
      </header>

      <div className="pv-body">
        {screen.tab === "home" && (
          <>
            <p className="pv-hi">Hi, demo family 👋</p>
            {today.length > 0 && (
              <div className="pv-card">
                <b>Today</b>
                {today.map((i) => <div key={i.title} className="pv-row"><span>{i.title}</span><span>{i.meta}</span></div>)}
              </div>
            )}
            <div className="pv-list">
              {data.sections.map((s) => (
                <button key={s.slug} type="button" className="pv-item" onClick={() => setScreen({ tab: "section", slug: s.slug })}>
                  <b>{s.title}</b>
                  {s.summary && <span>{s.summary}</span>}
                </button>
              ))}
            </div>
          </>
        )}

        {screen.tab === "section" && (() => {
          const s = data.sections.find((x) => x.slug === screen.slug);
          const info = data.info.filter((i) => i.section === screen.slug || (screen.slug === "arrival" && i.section === "daily"));
          const rows = data.rows.filter((r) => r.section_slug === screen.slug);
          return (
            <>
              <h3 className="pv-h">{s?.title}</h3>
              {s?.summary && <p className="pv-sub">{s.summary}</p>}
              {info.map((i) => (
                <div key={i.title} className="pv-card">
                  <div className="pv-row"><b>{i.title}</b>{i.meta && <span>{i.meta}</span>}</div>
                  {i.body && <p className="pv-sub">{i.body}</p>}
                </div>
              ))}
              {rows.length > 0 && (
                <div className="pv-card">
                  {rows.map((r) => (
                    <div key={r.label} className="pv-row"><span>{r.label}</span><span className={isPlaceholder(r.value) ? "pv-ph" : ""}>{isPlaceholder(r.value) ? "To be added" : tidy(r.value)}</span></div>
                  ))}
                </div>
              )}
              {info.length === 0 && rows.length === 0 && <p className="pv-sub">Nothing here yet.</p>}
            </>
          );
        })()}

        {screen.tab === "contacts" && (
          <>
            <h3 className="pv-h">Who to contact</h3>
            {data.cards.map((c) => (
              <div key={`${c.who}-${c.when_to_use}`} className="pv-card">
                <span className="pv-sub">{c.when_to_use}</span>
                <b>{tidy(c.who) || "To be added"}</b>
                {c.role && <span className="pv-sub">{c.role}</span>}
              </div>
            ))}
          </>
        )}

        {screen.tab === "change" && (
          <>
            <h3 className="pv-h">Change today&apos;s pickup</h3>
            <p className="pv-sub">Families tell the school about a different pickup or bus here (before 11:00 AM for buses).</p>
            {sent ? (
              <div className="pv-card"><b>Sent ✓</b><span className="pv-sub">In the real Parent Hub the Campus Coordinator would get this right away. This demo didn&apos;t send anything.</span></div>
            ) : (
              <form className="pv-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                <label>Who&apos;s picking up?<input className="input" placeholder="e.g. Grandma, Ms. Lee" /></label>
                <label>Change<select className="input"><option>Different person picking up</option><option>Early pickup</option><option>Riding a different bus</option></select></label>
                <button type="submit" className="btn">Send (demo)</button>
              </form>
            )}
          </>
        )}
      </div>

      <nav className="pv-tabs" aria-label="Demo app tabs">
        {([["home", "Home"], ["contacts", "Contacts"], ["change", "Pickup change"]] as const).map(([t, label]) => (
          <button key={t} type="button" aria-current={screen.tab === t ? "page" : undefined} onClick={() => { setSent(false); setScreen({ tab: t } as Screen); }}>{label}</button>
        ))}
      </nav>
    </div>
  );
}
