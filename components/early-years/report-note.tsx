"use client";

import { useState } from "react";
import { saveReportNote } from "@/app/tracker/actions";

// The guide's message to the family; edited on screen, printed as text.
export function ReportNote({ studentId, monday, initial, sample }: { studentId: number; monday: string; initial: string | null; sample: boolean }) {
  const [note, setNote] = useState(initial ?? "");
  const [state, setState] = useState<"" | "saving" | "saved" | "error">("");
  return (
    <>
      <div className="no-print stack-sm">
        <textarea className="input" rows={4} value={note} placeholder="A short message to the family about this week" onChange={(e) => { setNote(e.target.value); setState(""); }} />
        {!sample && (
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn sm" disabled={state === "saving"} onClick={async () => {
              setState("saving");
              setState((await saveReportNote(studentId, monday, note)).ok ? "saved" : "error");
            }}>Save message</button>
            <span className="small muted" role="status">{state === "saved" ? "Saved" : state === "error" ? "Didn't save. Try again." : ""}</span>
          </div>
        )}
      </div>
      <p className="pr-note-print print-only">{note || " "}</p>
    </>
  );
}
