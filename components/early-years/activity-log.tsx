"use client";

import { useEffect, useMemo, useState } from "react";
import { activityLog, type Activity } from "@/app/tracker/actions";
import { MODE_LABEL } from "@/lib/ey";
import { LEVEL, SKILL_LEVEL, goesBy, niceDay, type Level, type SkillLevel, type Skill, type Work } from "@/lib/montessori";

// Owner only: every add, change and removal in the tracker and attendance, newest first.

type Kid = { id: number; first_name: string; last_name: string };
type Person = { email: string; name: string | null };

const MODE = MODE_LABEL as Record<string, string>;
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const s = (v: unknown) => (v === null || v === undefined || v === "" ? "" : String(v));

export function ActivityLog({ kids, works, skills, people }: { kids: Kid[]; works: Work[]; skills: Skill[]; people: Person[] }) {
  const [rows, setRows] = useState<Activity[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [more, setMore] = useState(false);
  const [who, setWho] = useState("");
  const [kid, setKid] = useState("");

  const kidOf = useMemo(() => new Map(kids.map((k) => [k.id, `${goesBy(k)} ${k.last_name}`])), [kids]);
  const workOf = useMemo(() => new Map(works.map((w) => [w.id, w.name])), [works]);
  const skillOf = useMemo(() => new Map(skills.map((x) => [x.id, x.name])), [skills]);
  const nameOf = useMemo(() => new Map(people.map((p) => [p.email.toLowerCase(), p.name ?? p.email])), [people]);

  async function load(before?: number) {
    const r = await activityLog(before);
    if (!r.ok) { setState("error"); return; }
    setRows((x) => (before ? [...x, ...r.rows] : r.rows));
    setMore(r.rows.length === 200);
    setState("ok");
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const child = (r: Activity) => (r.student_id ? kidOf.get(r.student_id) ?? "a child" : "");
  const val = (r: Activity, k: string) => {
    const v = r.details[k];
    return Array.isArray(v) ? v[1] : v; // a change is [before, after]
  };
  const lvl = (v: unknown) => (v && LEVEL[v as Level] ? LEVEL[v as Level].label : "");
  const skl = (v: unknown) => (v && SKILL_LEVEL[v as SkillLevel] ? SKILL_LEVEL[v as SkillLevel].label : "");

  function describe(r: Activity): string {
    const c = child(r);
    const verb = r.action === "added" ? "added" : r.action === "changed" ? "changed" : "removed";
    switch (r.table_name) {
      case "ey_observations": {
        const lesson = val(r, "work_id") ? workOf.get(Number(val(r, "work_id"))) ?? "a lesson" : "a standout moment";
        const day = s(val(r, "day"));
        if (r.action === "added") return `Recorded ${lesson}${lvl(val(r, "level")) ? ` (${lvl(val(r, "level"))})` : ""} for ${c}${day ? `, dated ${niceDay(day)}` : ""}`;
        if (r.action === "removed") return `Deleted ${lesson} for ${c}${day ? ` (${niceDay(day)})` : ""}`;
        return `Edited a record for ${c}: ${Object.keys(r.details).map((k) => k.replace("_", " ")).join(", ")}`;
      }
      case "ey_work_status": return `${c}: ${workOf.get(Number(val(r, "work_id"))) ?? "a lesson"} set to ${lvl(val(r, "level")) || "not set"}`;
      case "ey_skill_status": return `${c}: ${skillOf.get(Number(val(r, "skill_id"))) ?? "a skill"} set to ${skl(val(r, "level")) || "not set"}`;
      case "ey_works": return `Knowledge base: ${verb} lesson “${s(val(r, "name"))}”`;
      case "ey_skills": return `Knowledge base: ${verb} skill “${s(val(r, "name"))}”`;
      case "ey_skill_works": return `Knowledge base: ${r.action === "removed" ? "unlinked" : "linked"} ${workOf.get(Number(val(r, "work_id"))) ?? "a lesson"} and ${skillOf.get(Number(val(r, "skill_id"))) ?? "a skill"}`;
      case "ey_report_notes": return `Guide's message for ${c} (week of ${niceDay(s(val(r, "period_start")))}) ${verb}`;
      case "ey_report_shares": return r.action === "added" ? `Shared ${c}'s weekly report with their family` : `Family report link for ${c} ${verb}`;
      case "ey_travel": return `${c}'s usual travel ${verb}${val(r, "mode") ? `: ${MODE[s(val(r, "mode"))] ?? s(val(r, "mode"))}` : ""}`;
      case "ey_travel_day": return `${c} on ${niceDay(s(val(r, "day")))} ${s(val(r, "part")).toUpperCase()}: ${r.action === "removed" ? "back to usual" : MODE[s(val(r, "mode"))] ?? s(val(r, "mode"))}`;
      case "ey_checks": return `${c} ${r.action === "removed" ? "unchecked" : "checked"}: ${s(val(r, "step"))} (${niceDay(s(val(r, "day")))})`;
      case "allowed_users": {
        const email = r.row_key ?? "";
        const t = r.details.tracker;
        if (Array.isArray(t)) return `${nameOf.get(email) ?? email} ${t[1] ? "given" : "removed from"} tracker access`;
        if (r.action === "added") return `${nameOf.get(email) ?? email} added to the hub`;
        if (r.action === "removed") return `${email} removed from the hub`;
        return `${nameOf.get(email) ?? email}'s access changed: ${Object.keys(r.details).join(", ")}`;
      }
      default: return `${verb} ${r.table_name}`;
    }
  }

  const actor = (a: string) => nameOf.get(a.toLowerCase()) ?? (a === "system" ? "System" : a);
  const actors = [...new Set(rows.map((r) => r.actor))];
  const list = rows.filter((r) => (!who || r.actor === who) && (!kid || String(r.student_id) === kid));

  return (
    <section className="card stack-sm">
      <h2 style={{ fontSize: 17 }}>Activity</h2>
      <p className="small muted">Everything added, changed or removed in the tracker and attendance: who, what and when. Only you can see this, and nobody can edit it.</p>
      <div className="row mw-wrap">
        <select className="input mw-level" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Filter by person">
          <option value="">Everyone</option>
          {actors.map((a) => <option key={a} value={a}>{actor(a)}</option>)}
        </select>
        <select className="input mw-level" value={kid} onChange={(e) => setKid(e.target.value)} aria-label="Filter by child">
          <option value="">All children</option>
          {kids.map((k) => <option key={k.id} value={k.id}>{goesBy(k)} {k.last_name}</option>)}
        </select>
      </div>
      {state === "loading" && <p className="small muted">Loading…</p>}
      {state === "error" && <p className="notice error">The activity log didn&apos;t load.</p>}
      {state === "ok" && list.length === 0 && <p className="small muted">Nothing yet. Changes show up here as people use the tracker.</p>}
      <ul className="mw-activity">
        {list.map((r) => (
          <li key={r.id}>
            <span className="small muted">{when(r.at)}</span>
            <span><b>{actor(r.actor)}</b> · {describe(r)}</span>
          </li>
        ))}
      </ul>
      {more && <button type="button" className="btn ghost sm" onClick={() => load(rows[rows.length - 1]?.id)}>Show older</button>}
    </section>
  );
}
