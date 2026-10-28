import Link from "next/link";
import { redirect } from "next/navigation";
import { currentFamily } from "@/lib/parent-session";
import { PARENT_CONTENT } from "@/lib/parent-content";
import { REQUEST_KINDS, kindById } from "@/lib/requests";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parentSignOut } from "./actions";

const STATUS: Record<string, [string, string]> = {
  new: ["Sent", "pill"],
  "in-progress": ["Being handled", "pill amber"],
  done: ["Done", "pill mint"],
};
const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

export default async function ParentHome({ searchParams }: { searchParams: Promise<{ sent?: string; err?: string }> }) {
  const family = await currentFamily();
  if (!family) redirect("/parents/sign-in");
  const { sent, err } = await searchParams;

  const db = family.preview ? await createClient() : createAdminClient();
  const { data: mine } = db
    ? await db.from("requests").select("id, created_at, kind, student, status, staff_note")
      .eq("from_email", family.email).in("source", family.preview ? ["preview"] : ["parent"])
      .order("created_at", { ascending: false }).limit(10)
    : { data: null };

  const c = PARENT_CONTENT;
  const today = c.info.filter((i) => i.section === "daily");
  const sentKind = sent ? kindById(sent) : null;

  return (
    <>
      {family.preview && <p className="notice warn">Staff preview. Requests you send are marked TEST in Slack and in the Requests inbox.</p>}
      {sentKind && <p className="notice" role="status">Sent ✓ {sentKind.title}. The right person has it and will follow up.</p>}
      {err && <p className="notice error" role="alert">{err}</p>}

      <div className="stack-sm">
        <h1>Hi{family.name && !family.preview ? `, ${family.name.split(" ")[0]}` : ""} 👋</h1>
        {!family.preview && <p className="lede">{family.children.map((ch) => ch.student).join(" · ")}</p>}
      </div>

      <section className="stack">
        <h2 className="ph-h">Send a request</h2>
        <div className="ph-tiles">
          {REQUEST_KINDS.filter((k) => k.audience === "parent").map((k) => (
            <Link key={k.id} href={`/parents/new/${k.id}`} className="card card-link ph-tile">
              <b>{k.title}</b>
              <span className="small muted">{k.blurb}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="ph-h">Today</h2>
        {today.map((i) => <div key={i.title} className="ph-row"><span>{i.title}</span><b>{i.meta}</b></div>)}
        {c.info.filter((i) => i.section === "afterschool").map((i) => <div key={i.title} className="ph-row"><span>{i.title}</span><b>{i.meta}</b></div>)}
      </section>

      {mine && mine.length > 0 && (
        <section className="stack">
          <h2 className="ph-h">Your requests</h2>
          {mine.map((r) => {
            const [label, cls] = STATUS[r.status] ?? STATUS.new;
            return (
              <div key={r.id} className="card ph-req">
                <div className="ph-row"><b>{kindById(r.kind)?.title ?? r.kind}</b><span className={cls}>{label}</span></div>
                <span className="small muted">{r.student} · {when(r.created_at)}</span>
                {r.staff_note && <p className="small">{r.staff_note}</p>}
              </div>
            );
          })}
        </section>
      )}

      <section className="stack">
        <h2 className="ph-h">Who to contact</h2>
        <div className="ph-tiles">
          {c.cards.map((k) => (
            <div key={k.when_to_use} className="card ph-tile">
              <span className="small muted">{k.when_to_use}</span>
              <b>{k.who}</b>
              {k.role && <span className="small">{k.role}</span>}
            </div>
          ))}
        </div>
        <p className="small muted">Emergency? Call 911 first.</p>
      </section>

      {!family.preview && (
        <form action={parentSignOut}><button type="submit" className="btn ghost sm">Sign out</button></form>
      )}
    </>
  );
}
