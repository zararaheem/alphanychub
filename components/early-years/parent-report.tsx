import { LEVEL, SKILL_LEVEL } from "@/lib/montessori";
import type { ParentReport } from "@/lib/parent-report";
import { ReportNote } from "@/components/early-years/report-note";

// One child's week for their family. Prints (or saves as PDF) on one page:
// in print, each day shows its first few lessons and notes are trimmed.
const MAX_DAY = 4;
export function ParentReportView({ r, photoUrls = {}, readOnly = false }: { r: ParentReport; photoUrls?: Record<string, string>; readOnly?: boolean }) {
  const first = r.name.split(" ")[0];
  return (
    <article className="pr">
      {r.sample && <p className="pr-sample no-print">Sample preview: made-up entries to show the layout. Nothing here is a real observation.</p>}
      <header className="pr-head">
        <div>
          <span className="kicker">Alpha NYC · Wonder Lab{r.grade ? ` · ${r.grade}` : ""}</span>
          <h1>{r.name}</h1>
          <p className="pr-sub">Week of {r.label}</p>
        </div>
        <div className="pr-badges">
          <div><b>{r.stats.lessons}</b><span>lessons</span></div>
          <div><b>{r.stats.mastered}</b><span>mastered</span></div>
          <div><b>{r.stats.days}</b><span>days of work</span></div>
        </div>
      </header>

      <section className="pr-sec">
        <h2>A note from {first}&apos;s guide</h2>
        {readOnly ? <p className="pr-note">{r.note || "Your child’s guide hasn’t added a message this week."}</p>
          : <ReportNote studentId={r.kid.id} monday={r.monday} initial={r.note} sample={r.sample} />}
      </section>

      <section className="pr-sec">
        <h2>{first}&apos;s week, day by day</h2>
        <ol className="pr-days">
          {r.days.map((d) => (
            <li key={d.day}>
              <h3>{d.label}</h3>
              {d.items.length === 0 ? <p className="pr-muted">No lessons recorded.</p> : (
                <ul>
                  {d.items.map((x, i) => (
                    <li key={i} className={i >= MAX_DAY ? "pr-extra" : undefined}>
                      <span className="pr-lesson">{x.lesson}</span>
                      {x.level && <span className={`pr-lv pr-lv-${x.level}`}>{LEVEL[x.level].label}</span>}
                      {x.note && <p>{x.note}</p>}
                      {x.photos.length > 0 && (
                        <div className="pr-photos">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {x.photos.map((p) => photoUrls[p] && <img key={p} src={photoUrls[p]} alt={`${first}'s work`} />)}
                        </div>
                      )}
                      {x.ocr && <p className="pr-ocr">“{x.ocr}”</p>}
                    </li>
                  ))}
                  {d.items.length > MAX_DAY && <li className="print-only pr-more">+{d.items.length - MAX_DAY} more</li>}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>

      {r.areas.length > 0 && (
        <section className="pr-sec">
          <h2>Where {first} is in each area</h2>
          <div className="pr-areas">
            {r.areas.map((a) => (
              <div key={a.id} className="pr-area">
                <h3>{a.name}</h3>
                <ul>
                  {(["M", "P", "I"] as const).flatMap((lv) => (lv === "M" ? a.mastered : lv === "P" ? a.practiced : a.introduced).map((name) => (
                    <li key={lv + name}><span className={`pr-dot pr-lv-${lv}`} aria-hidden="true" /><span>{name} <span className="pr-muted">· {LEVEL[lv].label}</span></span></li>
                  )))}
                </ul>
              </div>
            ))}
          </div>
          <p className="pr-key"><span className="pr-dot pr-lv-I" aria-hidden="true" /> <b>Introduced</b>: the lesson was presented. <span className="pr-dot pr-lv-P" aria-hidden="true" /> <b>Practiced</b>: {first} chooses it and repeats it independently. <span className="pr-dot pr-lv-M" aria-hidden="true" /> <b>Mastered</b>: does it correctly on their own, or shows a friend.</p>
        </section>
      )}

      <div className="pr-pair">
      {r.canDo.length > 0 && (
        <section className="pr-sec">
          <h2>What {first} can do</h2>
          <div className="pr-cando">
            {r.canDo.map((d) => (
              <div key={d.domain}>
                <h3>{d.domainName}</h3>
                <ul>{d.items.map((s, i) => <li key={s.name} className={i >= 3 ? "pr-extra" : undefined}>{s.ican} <span className="pr-muted">· {SKILL_LEVEL[s.level].label}</span></li>)}</ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {r.growing.length > 0 && (
        <section className="pr-sec">
          <h2>Growing next, and how you can help at home</h2>
          <div className="pr-home">
            <ul>
              {r.growing.map((s) => <li key={s.name}><b>{s.ican}</b><br />{s.home}</li>)}
            </ul>
          </div>
        </section>
      )}
      </div>

      <footer className="pr-foot">
        Skills follow the Wonder Lab Success Indicators (Head Start ELOF). Lessons follow the Montessori PreK sequence.
        Questions? Talk to {first}&apos;s guide or the Dean of Parents.
      </footer>
    </article>
  );
}
