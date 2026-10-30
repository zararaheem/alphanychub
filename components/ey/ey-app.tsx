"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AFTERSCHOOL_DAYS, AM_CHOICES, BASE_MODES, MODE_LABEL, PM_CHOICES, WEEKDAY, dayLabel, label, modeFor, morningModeFor, nyDate, weekdayOf,
  type DayMode, type Mode, type Part, type Step,
} from "@/lib/ey";
import { setDayMode } from "@/app/ey/actions";

// Early Years arrivals and dismissal on a phone. Everyone sees the same lists:
// taps save straight away and every phone refreshes every few seconds, so a
// change typed into Slack shows up here before dismissal.

type Kid = {
  id: number; first_name: string; last_name: string;
  usual: Mode | null; afterschool_days: number[];
  today: DayMode | null; today_am: DayMode | null; // this dismissal's and this morning's changes
};
type Change = { student_id: number; part: Part; mode: DayMode; note: string | null; updated_by: string | null; updated_at: string };
type Tab = "morning" | "dismissal" | "usual";

const STEPS: Record<string, [Step, string][]> = {
  "am-walker": [["am_maiden", "Maiden Ln"], ["am_here", "William St"]],
  "am-other": [["am_here", "Here"]],
  "pm-walker": [["pm_left", "Left"], ["pm_done", "At Maiden Ln"]],
  "pm-bus": [["pm_done", "On bus"]],
  "pm-parent": [["pm_done", "Picked up"]],
  "pm-early": [["pm_done", "Picked up"]],
  "pm-afterschool": [["pm_left", "In afterschool"], ["pm_done", "Picked up"]],
  "pm-unset": [["pm_done", "Gone home"]],
};

export function EyApp({ me }: { me: string }) {
  const supabase = useMemo(() => createClient(), []);
  const day = nyDate();
  const [tab, setTab] = useState<Tab>(() => (new Date().getHours() < 12 ? "morning" : "dismissal"));
  const [kids, setKids] = useState<Kid[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [checks, setChecks] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const [s, t, d, c] = await Promise.all([
      supabase.from("students").select("id, first_name, last_name").eq("campus", "early-years").order("first_name"),
      supabase.from("ey_travel").select("student_id, mode, afterschool_days"),
      supabase.from("ey_travel_day").select("student_id, part, mode, note, updated_by, updated_at").eq("day", day),
      supabase.from("ey_checks").select("student_id, step").eq("day", day),
    ]);
    if (s.error) { setToast("Couldn't load. Check your signal."); return; }
    const travel = new Map((t.data ?? []).map((r) => [r.student_id, r]));
    const rows = (d.data ?? []) as Change[];
    const pmOf = new Map(rows.filter((r) => r.part === "pm").map((r) => [r.student_id, r.mode]));
    const amOf = new Map(rows.filter((r) => r.part === "am").map((r) => [r.student_id, r.mode]));
    setKids((s.data ?? []).map((k) => {
      const tr = travel.get(k.id);
      return {
        ...k, usual: tr?.mode ?? null, afterschool_days: tr?.afterschool_days ?? [],
        today: pmOf.get(k.id) ?? null, today_am: amOf.get(k.id) ?? null,
      };
    }));
    setChanges(rows);
    setChecks(new Set((c.data ?? []).map((r) => `${r.student_id}:${r.step}`)));
    setLoaded(true);
  }, [supabase, day]);

  useEffect(() => {
    load();
    const tick = setInterval(() => { if (document.visibilityState === "visible") load(); }, 5000);
    const wake = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", wake);
    return () => { clearInterval(tick); document.removeEventListener("visibilitychange", wake); };
  }, [load]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  async function toggle(id: number, step: Step) {
    const key = `${id}:${step}`;
    const had = checks.has(key);
    setChecks((c) => { const n = new Set(c); if (had) n.delete(key); else n.add(key); return n; });
    const res = had
      ? await supabase.from("ey_checks").delete().eq("student_id", id).eq("day", day).eq("step", step)
      : await supabase.from("ey_checks").upsert({ student_id: id, day, step, by_email: me });
    if (res.error) { flash("That didn't save. Tap again."); load(); }
  }

  async function change(id: number, part: Part, mode: DayMode | "usual") {
    const v = mode === "usual" ? null : mode;
    setKids((ks) => ks.map((k) => {
      if (k.id !== id) return k;
      if (mode === "absent" || (mode === "usual" && (k.today === "absent" || k.today_am === "absent"))) return { ...k, today: v, today_am: v };
      return part === "am" ? { ...k, today_am: v } : { ...k, today: v };
    }));
    setOpen(null);
    const r = await setDayMode(id, part, mode, note);
    setNote("");
    if (!r.ok) flash("That didn't save. Try again."); else flash("Saved and posted to Slack");
    load();
  }

  async function setUsual(k: Kid, patch: Partial<Pick<Kid, "usual" | "afterschool_days">>) {
    const next = { ...k, ...patch };
    setKids((ks) => ks.map((x) => (x.id === k.id ? next : x)));
    const res = await supabase.from("ey_travel").upsert({
      student_id: k.id, mode: next.usual, afterschool_days: next.afterschool_days, updated_by: me, updated_at: new Date().toISOString(),
    });
    if (res.error) { flash("That didn't save."); load(); }
  }

  const name = (k: Kid) => <><b>{k.first_name}</b> {k.last_name}</>;
  const done = (k: Kid, step: Step) => checks.has(`${k.id}:${step}`);

  const part: Part = tab === "morning" ? "am" : "pm";
  const noteOf = (k: Kid) => changes.find((c) => c.student_id === k.id && c.part === part)?.note;
  const row = (k: Kid, steps: [Step, string][], tag?: string) => {
    const mine = part === "am" ? k.today_am : k.today;
    const choices = part === "am" ? AM_CHOICES : PM_CHOICES;
    return (
      <li className={`ey-row${mine ? " changed" : ""}`}>
        <div className="ey-who">
          <span className="ey-name">{name(k)}</span>
          {tag && <span className="small muted">{tag}</span>}
          {mine && <span className="small ey-change">Changed today{noteOf(k) ? `: ${noteOf(k)}` : ""}</span>}
        </div>
        <div className="ey-steps">
          {steps.map(([s, label]) => (
            <button key={s} type="button" className="ey-step" aria-pressed={done(k, s)} onClick={() => toggle(k.id, s)}>
              {done(k, s) ? "✓ " : ""}{label}
            </button>
          ))}
          <button type="button" className="ey-more" aria-expanded={open === k.id} aria-label={`Change ${k.first_name} for ${part === "am" ? "this morning" : "dismissal today"}`} onClick={() => { setOpen(open === k.id ? null : k.id); setNote(""); }}>⋯</button>
        </div>
        {open === k.id && (
          <div className="ey-chooser">
            <span className="small muted">{k.first_name} {part === "am" ? "this morning" : "at dismissal today"}:</span>
            <input className="input" placeholder={part === "am" ? "Note (optional), e.g. arriving 9:30" : "Note (optional), e.g. aunt Maria picking up"} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {choices.map((m) => (
                <button key={m} type="button" className="chip" aria-pressed={mine === m} onClick={() => change(k.id, part, m)}>
                  {label(m, part)}
                </button>
              ))}
              <button type="button" className="chip" aria-pressed={!mine} onClick={() => change(k.id, part, "usual")}>Usual</button>
            </div>
          </div>
        )}
      </li>
    );
  };

  const section = (title: string, list: Kid[], steps: (k: Kid) => [Step, string][], sub?: string, tag?: (k: Kid) => string | undefined) => {
    if (!list.length) return null;
    return (
      <section className="ey-sec">
        <h2>{title} <span className="muted">· {list.length}</span></h2>
        {sub && <p className="small muted">{sub}</p>}
        <ul className="ey-list">{list.map((k) => <Fragment key={k.id}>{row(k, steps(k), tag?.(k))}</Fragment>)}</ul>
      </section>
    );
  };

  // Today's changes, newest first; an absence shows once.
  const shown = changes
    .filter((c) => !(c.mode === "absent" && c.part === "am"))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const kidOf = new Map(kids.map((k) => [k.id, k]));
  const recent = (c: Change) => Date.now() - new Date(c.updated_at).getTime() < 60 * 60 * 1000;
  const changesCard = shown.length ? (
    <section className="ey-changes" aria-label="Changes today">
      <h2>Changes today · {shown.length}</h2>
      <ul>
        {shown.map((c) => {
          const k = kidOf.get(c.student_id);
          if (!k) return null;
          return (
            <li key={`${c.student_id}-${c.part}`} className={recent(c) ? "new" : undefined}>
              <b>{k.first_name} {k.last_name}</b>: {label(c.mode, c.part)}{c.mode === "absent" ? " all day" : c.part === "am" ? " (morning)" : " (dismissal)"}
              {c.note && <span className="muted"> · {c.note}</span>}
              <span className="small muted"> · {c.updated_by}, {new Date(c.updated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
            </li>
          );
        })}
      </ul>
    </section>
  ) : null;

  const wd = weekdayOf(day);
  const am = (m: DayMode | null) => kids.filter((k) => morningModeFor(k) === m);
  const pm = (m: DayMode | null) => kids.filter((k) => modeFor(k, day) === m);
  const present = kids.filter((k) => morningModeFor(k) !== "absent");
  const amHere = present.filter((k) => done(k, "am_here")).length;
  const pmGone = kids.filter((k) => modeFor(k, day) !== "absent").filter((k) => done(k, "pm_done")).length;
  const pmTotal = kids.filter((k) => modeFor(k, day) !== "absent").length;

  return (
    <main className="wrap stack ey">
      <div className="ey-top">
        <div>
          <span className="kicker">Early Years · William St</span>
          <h1>{tab === "usual" ? "Usual travel" : tab === "morning" ? "Morning arrival" : "Dismissal"}</h1>
          <p className="small muted">{dayLabel(day)[0].toUpperCase() + dayLabel(day).slice(1)}</p>
        </div>
        <nav className="seg-links" aria-label="Part of the day">
          {(["morning", "dismissal", "usual"] as Tab[]).map((t) => (
            <a key={t} href={`#${t}`} aria-current={tab === t ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab(t); }}>
              {t === "morning" ? "Morning" : t === "dismissal" ? "Dismissal" : "Usual"}
            </a>
          ))}
        </nav>
      </div>

      {!loaded ? <p className="muted">Loading…</p> : tab === "morning" ? (
        <>
          <div className={`roll-bar${amHere === present.length ? " done" : ""}`} role="status">
            <span><b>{amHere}</b> of {present.length} at William St{am("absent").length ? ` · ${am("absent").length} absent` : ""}</span>
          </div>
          {changesCard}
          {section("Walkers", am("walker"), () => STEPS["am-walker"], "At Maiden Ln by 8:30, then walk over to William St.")}
          {section("Bus", am("bus"), () => STEPS["am-other"])}
          {section("Parent drop-off", am("parent"), () => STEPS["am-other"])}
          {section("Arriving late", am("late"), () => STEPS["am-other"])}
          {section("Not set yet", am(null), () => STEPS["am-other"], "Set how they travel in Usual.")}
          {section("Absent", am("absent"), () => [])}
        </>
      ) : tab === "dismissal" ? (
        <>
          <div className={`roll-bar${pmGone === pmTotal ? " done" : ""}`} role="status">
            <span><b>{pmGone}</b> of {pmTotal} gone home safely</span>
          </div>
          {changesCard}
          {section("Walkers", pm("walker"), () => STEPS["pm-walker"], "Leave William St at 3:15 for Maiden Ln.")}
          {section("Bus", pm("bus"), () => STEPS["pm-bus"])}
          {section("Parent pickup", pm("parent"), () => STEPS["pm-parent"], "Dismissal 3:30.")}
          {section("Early pickup", pm("early"), () => STEPS["pm-early"])}
          {section("Afterschool", pm("afterschool"), () => STEPS["pm-afterschool"], "3:45–4:45 PM, Mon–Thu.", (k) => (k.usual ? `Then ${MODE_LABEL[k.usual].toLowerCase()}` : undefined))}
          {section("Not set yet", pm(null), () => STEPS["pm-unset"], "Set how they travel in Usual.")}
          {section("Absent", pm("absent"), () => [])}
        </>
      ) : (
        <section className="ey-sec">
          <p className="small muted">How each child usually travels, and which days they stay for afterschool. Changes for one day go in Morning or Dismissal (⋯), or in Slack with <code>/ey</code>.</p>
          <ul className="ey-list">
            {kids.map((k) => (
              <li key={k.id} className="ey-row usual">
                <span className="ey-name">{name(k)}</span>
                <div className="seg" role="group" aria-label={`${k.first_name}: usual way to and from school`}>
                  {BASE_MODES.map((m) => (
                    <button key={m} type="button" aria-pressed={k.usual === m} onClick={() => setUsual(k, { usual: m })}>{MODE_LABEL[m]}</button>
                  ))}
                </div>
                <div className="row ey-days" role="group" aria-label={`${k.first_name}: afterschool days`}>
                  <span className="small muted">Afterschool</span>
                  {AFTERSCHOOL_DAYS.map((d) => (
                    <button key={d} type="button" className="chip" aria-pressed={k.afterschool_days.includes(d)}
                      onClick={() => setUsual(k, { afterschool_days: k.afterschool_days.includes(d) ? k.afterschool_days.filter((x) => x !== d) : [...k.afterschool_days, d].sort() })}>
                      {WEEKDAY[d]}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {wd === 5 && tab === "dismissal" && pm("afterschool").length === 0 && <p className="small muted">No afterschool on Fridays.</p>}
      <p className="small muted">Updates every few seconds. In Slack, type <code>/ey help</code>.</p>
      {toast && <div className="ey-toast" role="status">{toast}</div>}
    </main>
  );
}
