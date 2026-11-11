import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTracker } from "@/lib/access";
import { PrintButton } from "@/components/print-button";
import { ParentReportView } from "@/components/early-years/parent-report";
import { ShareButton } from "@/components/early-years/share-button";
import { addDays, mondayOf, nyToday } from "@/lib/montessori";
import { parentReport, sampleReport } from "@/lib/parent-report";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ week?: string; sample?: string }> };

// One child's weekly report for their family; print or save as PDF.
export default async function ChildParentReport({ params, searchParams }: Props) {
  await requireTracker();
  const { id } = await params;
  const sp = await searchParams;
  const monday = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(sp.week ?? "") ? sp.week! : nyToday());
  const supabase = await createClient();
  const sample = sp.sample === "1";
  const r = sample ? await sampleReport(supabase, Number(id), monday) : await parentReport(supabase, Number(id), monday);
  if (!r) notFound();
  const paths = r.days.flatMap((d) => d.items.flatMap((x) => x.photos));
  let urls: Record<string, string> = {};
  if (paths.length) {
    const { data } = await supabase.storage.from("ey-work").createSignedUrls(paths, 3600);
    urls = Object.fromEntries((data ?? []).flatMap((x) => (x.path && x.signedUrl ? [[x.path, x.signedUrl]] : [])));
  }
  const q = (patch: Record<string, string>) => `/tracker/parent/${id}?${new URLSearchParams({ week: monday, ...(sample ? { sample: "1" } : {}), ...patch })}`;
  return (
    <main className="wrap stack mw-report">
      <div className="row mw-wrap no-print" style={{ justifyContent: "space-between" }}>
        <Link href="/tracker/parent" className="small">← All children</Link>
        <div className="row mw-wrap">
          <Link className="chip" href={q({ week: addDays(monday, -7) })}>← Previous week</Link>
          {monday !== mondayOf(nyToday()) && <Link className="chip" href={q({ week: addDays(monday, 7) })}>Next week →</Link>}
          {sample ? <Link className="chip" href={`/tracker/parent/${id}?week=${monday}`}>Real entries</Link> : <Link className="chip" href={q({ sample: "1" })}>Sample preview</Link>}
          <PrintButton label="Print or save PDF" />
        </div>
      </div>
      {!sample && <ShareButton studentId={r.kid.id} monday={monday} name={r.name.split(" ")[0]} />}
      <ParentReportView r={r} photoUrls={urls} />
    </main>
  );
}
