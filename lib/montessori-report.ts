import type { SupabaseClient } from "@supabase/supabase-js";
import { AREAS, LEVEL, addDays, goesBy, niceDay, weekLabel, type AreaId, type Observation, type Work } from "@/lib/montessori";

// One week of Montessori work for the weekly one-pager: headline numbers,
// work by area, highlights, a line per child, and who wasn't observed.

type Kid = { id: number; first_name: string; last_name: string; grade: string | null };
export type KidLine = {
  kid: Kid; count: number; areas: string[]; introduced: string[]; practiced: string[]; mastered: string[]; lessons: number; lastNote: string | null;
};
export type WeekReport = {
  monday: string; label: string; level: string | null; by: string | null;
  guides: { email: string; name: string }[];
  kids: Kid[]; obs: Observation[];
  stats: { logged: number; observed: number; total: number; lessons: number; fullCycles: number; chose: number; introduced: number; practiced: number; mastered: number; photos: number };
  byArea: { id: AreaId; name: string; count: number }[];
  highlights: { kid: Kid; work: string; level: string | null; note: string; day: string; by: string | null }[];
  lines: KidLine[];
  notSeen: Kid[];
};

export async function weekReport(supabase: SupabaseClient, monday: string, level: string | null, by: string | null): Promise<WeekReport> {
  const friday = addDays(monday, 6); // include a weekend entry if one was logged
  const [s, w, o] = await Promise.all([
    supabase.from("students").select("id, first_name, last_name, grade").eq("campus", "early-years").order("last_name"),
    supabase.from("ey_works").select("*"),
    supabase.from("ey_observations").select("*").gte("day", monday).lte("day", friday).order("day").order("created_at"),
  ]);
  // PreK before K, each by last name.
  const kids = ((s.data ?? []) as Kid[]).filter((k) => !level || k.grade === level)
    .sort((a, b) => ((a.grade === "PK" ? 0 : 1) - (b.grade === "PK" ? 0 : 1)) || a.last_name.localeCompare(b.last_name));
  const ids = new Set(kids.map((k) => k.id));
  const works = new Map(((w.data ?? []) as Work[]).map((x) => [x.id, x]));
  const all = ((o.data ?? []) as Observation[]).filter((x) => ids.has(x.student_id));
  const guides = [...new Map(all.filter((x) => x.by_email).map((x) => [x.by_email!, { email: x.by_email!, name: x.by_name ?? x.by_email! }])).values()];
  const obs = by ? all.filter((x) => x.by_email === by) : all;
  const kidOf = new Map(kids.map((k) => [k.id, k]));
  const workName = (id: number | null) => (id ? works.get(id)?.name ?? "Lesson" : "Standout moment");
  const areaOf = (id: number | null) => (id ? works.get(id)?.area : undefined);

  // Distinct child + lesson pairs at each level this week.
  const pairs = (lv: string) => new Set(obs.filter((x) => x.level === lv).map((x) => `${x.student_id}:${x.work_id}`)).size;
  const lines: KidLine[] = kids.map((kid) => {
    const mine = obs.filter((x) => x.student_id === kid.id);
    const areas = AREAS.filter((a) => mine.some((x) => areaOf(x.work_id) === a.id)).map((a) => a.name);
    const at = (lv: string) => [...new Set(mine.filter((x) => x.level === lv).map((x) => workName(x.work_id)))];
    const lastNote = [...mine].reverse().find((x) => x.note)?.note ?? null;
    return { kid, count: mine.length, areas, introduced: at("I"), practiced: at("P"), mastered: at("M"), lessons: mine.filter((x) => x.support === "lesson").length, lastNote };
  });

  const flagged = obs.filter((x) => x.highlight && x.note);
  const picks = (flagged.length ? flagged : [...obs].filter((x) => x.note).reverse().slice(0, 6));
  return {
    monday, label: weekLabel(monday), level, by,
    guides, kids, obs,
    stats: {
      logged: obs.length,
      observed: new Set(obs.map((x) => x.student_id)).size,
      total: kids.length,
      lessons: obs.filter((x) => x.support === "lesson").length,
      fullCycles: obs.filter((x) => x.cycle === "complete").length,
      chose: obs.filter((x) => x.support === "self").length,
      introduced: pairs("I"), practiced: pairs("P"), mastered: pairs("M"),
      photos: obs.reduce((n, x) => n + (x.photos?.length ?? 0), 0),
    },
    byArea: AREAS.map((a) => ({ id: a.id, name: a.name, count: obs.filter((x) => areaOf(x.work_id) === a.id).length })),
    highlights: picks.slice(0, 8).flatMap((x) => {
      const kid = kidOf.get(x.student_id);
      return kid ? [{ kid, work: workName(x.work_id), level: x.level ? LEVEL[x.level].label : null, note: x.note!, day: niceDay(x.day), by: x.by_name }] : [];
    }),
    lines,
    notSeen: lines.filter((l) => l.count === 0).map((l) => l.kid),
  };
}

const shown = (k: Kid) => `${goesBy(k)} ${k.last_name}`;
export const kidName = shown;

// Plain text for pasting into Slack or an email.
export function reportText(r: WeekReport): string {
  const top = r.byArea.filter((a) => a.count).sort((a, b) => b.count - a.count);
  return [
    `Wonder Lab · week of ${r.label}${r.level ? ` · ${r.level === "PK" ? "PreK" : r.level}` : ""}`,
    `${r.stats.logged} lessons recorded · ${r.stats.observed} of ${r.stats.total} children observed · ${r.stats.lessons} lessons given`,
    `Introduced ${r.stats.introduced} · Practiced ${r.stats.practiced} · Mastered ${r.stats.mastered}`,
    top.length ? `Most work: ${top.map((a) => `${a.name} (${a.count})`).join(", ")}` : "",
    r.highlights.length ? `\nHighlights:\n${r.highlights.map((h) => `• ${shown(h.kid)}, ${h.work}${h.level ? ` (${h.level})` : ""}: ${h.note}`).join("\n")}` : "",
    r.notSeen.length ? `\nNot observed yet this week: ${r.notSeen.map(shown).join(", ")}` : "\nEvery child was observed this week.",
  ].filter(Boolean).join("\n");
}
