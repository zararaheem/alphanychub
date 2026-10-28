"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn sm no-print" onClick={() => window.print()}>
      Print
    </button>
  );
}
