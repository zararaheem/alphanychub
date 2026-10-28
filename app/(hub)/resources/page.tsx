import { canManageStaff, requireMember } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { deleteResource, saveResource } from "@/lib/actions";
import { CampusSelect, Field, TextArea } from "@/components/fields";
import { Flash } from "@/components/flash";
import { CAMPUS_LABEL } from "@/lib/campus";
import type { CampusScope } from "@/lib/campus";

type SP = Promise<{ msg?: string; err?: string }>;
type Resource = { id: number; title: string; category: string | null; campus: CampusScope; body: string; updated_at: string };

export default async function ResourcesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const me = await requireMember();
  const manager = canManageStaff(me.role);
  const supabase = await createClient();
  const { data } = await supabase.from("hub_resources").select("*").order("category").order("title");
  const rows = (data ?? []) as Resource[];
  const groups = [...new Set(rows.map((r) => r.category ?? "General"))];

  return (
    <main className="page" style={{ maxWidth: 960 }}>
      <div className="stack-sm">
        <h1>Resources</h1>
        <p className="lede">
          The library the Ask assistant answers from, alongside procedures, one-pagers and workshops.
          {manager ? " Paste in policies, security notes and how-tos; the assistant uses them right away." : ""}
        </p>
      </div>
      <Flash msg={sp.msg} err={sp.err} />

      {manager && (
        <section className="card">
          <ResourceEditor />
        </section>
      )}

      {rows.length === 0 ? (
        <section className="card"><p className="empty">No resources yet.{manager ? " Add the first one above." : ""}</p></section>
      ) : (
        groups.map((g) => (
          <section key={g} className="stack-sm" aria-label={g}>
            <h2 className="label-caps">{g}</h2>
            {rows.filter((r) => (r.category ?? "General") === g).map((r) => (
              <details key={r.id} className="card" style={{ gap: 8 }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                  {r.title}
                  {r.campus !== "all" && <span className="tag">{CAMPUS_LABEL[r.campus]}</span>}
                </summary>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "var(--ink-2)" }}>{r.body}</div>
                {manager && <ResourceEditor resource={r} />}
              </details>
            ))}
          </section>
        ))
      )}
    </main>
  );
}

function ResourceEditor({ resource }: { resource?: Resource }) {
  const k = resource?.id ?? "new";
  return (
    <details className={resource ? "editor quiet" : "editor"}>
      <summary>{resource ? "Edit" : "+ Add a resource"}</summary>
      <form action={saveResource} className="form-grid" style={{ paddingBottom: 12 }}>
        {resource && <input type="hidden" name="id" value={resource.id} />}
        <Field id={`r-title-${k}`} label="Title" name="title" defaultValue={resource?.title} required placeholder="e.g. Door security & visitor check-in" />
        <Field id={`r-cat-${k}`} label="Category" name="category" defaultValue={resource?.category ?? ""} placeholder="e.g. Security, Operations, Trips" />
        <CampusSelect id={`r-campus-${k}`} defaultValue={resource?.campus} />
        <TextArea id={`r-body-${k}`} label="Content" name="body" defaultValue={resource?.body ?? ""} rows={10} />
        <button type="submit" className="btn">{resource ? "Save" : "Add resource"}</button>
      </form>
      {resource && (
        <form action={deleteResource}>
          <input type="hidden" name="id" value={resource.id} />
          <button type="submit" className="btn danger sm">Remove</button>
        </form>
      )}
    </details>
  );
}
