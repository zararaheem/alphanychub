import { requireTracker } from "@/lib/access";
import { AREA_NAME, CYCLE, LEVEL, SUPPORT, mondayOf, nyToday, type Work } from "@/lib/montessori";
import { kidName, weekReport } from "@/lib/montessori-report";
import { createClient } from "@/lib/supabase/server";
import { buildXlsx } from "@/lib/xlsx";

// The weekly report as Excel: a summary per child and every logged work.
export async function GET(req: Request) {
  await requireTracker();
  const sp = new URL(req.url).searchParams;
  const monday = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(sp.get("week") ?? "") ? sp.get("week")! : nyToday());
  const level = sp.get("level") === "PK" || sp.get("level") === "K" ? sp.get("level") : null;
  const supabase = await createClient();
  const r = await weekReport(supabase, monday, level, sp.get("by"));
  const { data: w } = await supabase.from("ey_works").select("*");
  const works = new Map(((w ?? []) as Work[]).map((x) => [x.id, x]));
  const kids = new Map(r.kids.map((k) => [k.id, k]));
  const grade = (g: string | null) => (g === "PK" ? "PreK" : g ?? "");

  const file = buildXlsx([
    {
      name: "Summary",
      widths: [24, 7, 8, 9, 40, 40, 60],
      rows: [
        ["Child", "Grade", "Works", "Lessons", "Areas", "Reached Independent", "Latest note"],
        ...r.lines.map((l) => [kidName(l.kid), grade(l.kid.grade), l.count, l.lessons, l.areas.join(", "), l.independent.join(", "), l.lastNote ?? ""]),
      ],
    },
    {
      name: "All work logged",
      widths: [12, 24, 18, 24, 14, 16, 14, 60, 40, 8, 20],
      rows: [
        ["Date", "Child", "Area", "Work", "Level", "Work cycle", "How it started", "Note", "Writing in the work", "Photos", "Logged by"],
        ...r.obs.map((o) => {
          const k = kids.get(o.student_id);
          const wk = o.work_id ? works.get(o.work_id) : undefined;
          return [
            o.day, k ? kidName(k) : "", wk ? AREA_NAME[wk.area] : "", wk?.name ?? "", o.level ? LEVEL[o.level].label : "",
            o.cycle ? CYCLE[o.cycle] : "", o.support ? SUPPORT[o.support] : "", o.note ?? "", o.ocr_text ?? "", o.photos?.length ?? 0, o.by_name ?? "",
          ];
        }),
      ],
    },
  ]);
  return new Response(new Blob([file as BlobPart]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Wonder Lab work ${monday}${level ? ` ${grade(level)}` : ""}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
