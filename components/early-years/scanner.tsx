"use client";

import { useEffect, useRef, useState } from "react";

// Turn a phone photo of a worksheet into a flat, clean scan:
// find the page, let the guide nudge the corners, straighten it, whiten the paper.
// Everything happens on the phone; only the finished scan is uploaded.

type Pt = { x: number; y: number };
type Quad = [Pt, Pt, Pt, Pt]; // top-left, top-right, bottom-right, bottom-left
const MAX_SRC = 2000;
const MAX_OUT = 1600;

function toCanvas(src: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(src, 0, 0, w, h);
  return c;
}

function rotate(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.height; c.height = src.width;
  const g = c.getContext("2d")!;
  g.translate(c.width, 0);
  g.rotate(Math.PI / 2);
  g.drawImage(src, 0, 0);
  return c;
}

const inset = (w: number, h: number): Quad => {
  const dx = w * 0.06, dy = h * 0.06;
  return [{ x: dx, y: dy }, { x: w - dx, y: dy }, { x: w - dx, y: h - dy }, { x: dx, y: h - dy }];
};

// Paper is usually the brightest large shape in the photo: threshold a small copy,
// keep the biggest bright region, and take its four outermost corners.
function findPage(src: HTMLCanvasElement): Quad {
  const W = src.width, H = src.height;
  const s = 220 / Math.max(W, H);
  const w = Math.max(8, Math.round(W * s)), h = Math.max(8, Math.round(H * s));
  const px = toCanvas(src, w, h).getContext("2d")!.getImageData(0, 0, w, h).data;
  const gray = new Uint8Array(w * h);
  const hist = new Array(256).fill(0);
  for (let i = 0; i < w * h; i++) {
    const v = (px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114) | 0;
    gray[i] = v; hist[v]++;
  }
  // Otsu threshold.
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, t = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue;
    const wF = w * h - wB; if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; t = i; }
  }
  // Largest bright connected region.
  const label = new Int32Array(w * h).fill(-1);
  let bestId = -1, bestSize = 0;
  const stack: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (gray[start] <= t || label[start] !== -1) continue;
    let size = 0; stack.push(start); label[start] = start;
    while (stack.length) {
      const p = stack.pop()!; size++;
      const x = p % w, y = (p / w) | 0;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of nb) if (q >= 0 && label[q] === -1 && gray[q] > t) { label[q] = start; stack.push(q); }
    }
    if (size > bestSize) { bestSize = size; bestId = start; }
  }
  const share = bestSize / (w * h);
  if (bestId < 0 || share < 0.12 || share > 0.97) return inset(W, H);
  let tl = 0, tr = 0, br = 0, bl = 0, tlV = Infinity, trV = -Infinity, brV = -Infinity, blV = Infinity;
  for (let p = 0; p < w * h; p++) {
    if (label[p] !== bestId) continue;
    const x = p % w, y = (p / w) | 0;
    if (x + y < tlV) { tlV = x + y; tl = p; }
    if (x + y > brV) { brV = x + y; br = p; }
    if (x - y > trV) { trV = x - y; tr = p; }
    if (x - y < blV) { blV = x - y; bl = p; }
  }
  const at = (p: number): Pt => ({ x: ((p % w) + 0.5) / s, y: (((p / w) | 0) + 0.5) / s });
  return [at(tl), at(tr), at(br), at(bl)];
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

// Straighten the four corners into a rectangle (unit square to quad, Heckbert),
// then optionally make it look like a scan: grey, paper evened out to white, ink darkened.
function flatten(src: HTMLCanvasElement, q: Quad, mode: "doc" | "color"): HTMLCanvasElement {
  const [p0, p1, p2, p3] = q;
  let W = Math.max(dist(p0, p1), dist(p3, p2)), H = Math.max(dist(p0, p3), dist(p1, p2));
  const k = Math.min(1, MAX_OUT / Math.max(W, H));
  W = Math.max(1, Math.round(W * k)); H = Math.max(1, Math.round(H * k));

  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
  let a, b, c, d, e, f, g, h;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    a = p1.x - p0.x; b = p2.x - p1.x; c = p0.x; d = p1.y - p0.y; e = p2.y - p1.y; f = p0.y; g = 0; h = 0;
  } else {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den; h = (dx1 * dy3 - dx3 * dy1) / den;
    a = p1.x - p0.x + g * p1.x; b = p3.x - p0.x + h * p3.x; c = p0.x;
    d = p1.y - p0.y + g * p1.y; e = p3.y - p0.y + h * p3.y; f = p0.y;
  }

  const sw = src.width, sh = src.height;
  const sp = src.getContext("2d")!.getImageData(0, 0, sw, sh).data;
  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const og = out.getContext("2d")!;
  const img = og.createImageData(W, H);
  const op = img.data;
  for (let j = 0; j < H; j++) {
    const v = (j + 0.5) / H;
    for (let i = 0; i < W; i++) {
      const u = (i + 0.5) / W;
      const z = g * u + h * v + 1;
      let x = (a * u + b * v + c) / z - 0.5, y = (d * u + e * v + f) / z - 0.5;
      x = Math.min(sw - 1.001, Math.max(0, x)); y = Math.min(sh - 1.001, Math.max(0, y));
      const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      const o = (j * W + i) * 4;
      for (let ch = 0; ch < 3; ch++) {
        op[o + ch] = (sp[i00 + ch] * (1 - fx) + sp[i10 + ch] * fx) * (1 - fy) + (sp[i01 + ch] * (1 - fx) + sp[i11 + ch] * fx) * fy;
      }
      op[o + 3] = 255;
    }
  }
  og.putImageData(img, 0, 0);
  if (mode === "color") return out;

  // Paper brightness map: shrink right down (averages out the writing), then blow back up.
  const bw = Math.max(2, Math.round(W / 24)), bh = Math.max(2, Math.round(H / 24));
  const small = toCanvas(out, bw, bh);
  const bg = document.createElement("canvas");
  bg.width = W; bg.height = H;
  const bgg = bg.getContext("2d")!;
  bgg.imageSmoothingEnabled = true; bgg.imageSmoothingQuality = "high";
  bgg.drawImage(small, 0, 0, W, H);
  const bp = bgg.getImageData(0, 0, W, H).data;
  for (let o = 0; o < op.length; o += 4) {
    const gv = op[o] * 0.299 + op[o + 1] * 0.587 + op[o + 2] * 0.114;
    const bv = Math.max(40, bp[o] * 0.299 + bp[o + 1] * 0.587 + bp[o + 2] * 0.114);
    // Paper -> white; a curve that darkens ink and keeps faint pencil readable.
    const n = Math.min(1, gv / bv);
    const r = Math.min(255, 255 * Math.pow(n, 2.2) * 1.12);
    op[o] = op[o + 1] = op[o + 2] = r;
  }
  og.putImageData(img, 0, 0);
  return out;
}

export function Scanner({ file, onDone, onCancel }: { file: File; onDone: (scan: Blob) => void; onCancel: () => void }) {
  const [src, setSrc] = useState<HTMLCanvasElement | null>(null);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [mode, setMode] = useState<"doc" | "color">("doc");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [preview, setPreview] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const bmp = await createImageBitmap(file);
        const s = Math.min(1, MAX_SRC / Math.max(bmp.width, bmp.height));
        const c = toCanvas(bmp, Math.round(bmp.width * s), Math.round(bmp.height * s));
        if (off) return;
        setSrc(c); setQuad(findPage(c)); setPreview(c.toDataURL("image/jpeg", 0.8));
      } catch {
        setError("This photo couldn't be opened. Try taking it again.");
      }
    })();
    return () => { off = true; };
  }, [file]);

  // Track the shown size of the photo so the corner handles line up with it.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [preview]);

  const k = src && box.w ? box.w / src.width : 0;

  function move(e: React.PointerEvent) {
    if (drag.current === null || !src || !quad || !wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    const x = Math.min(src.width, Math.max(0, (e.clientX - r.left) / k));
    const y = Math.min(src.height, Math.max(0, (e.clientY - r.top) / k));
    const next = [...quad] as Quad;
    next[drag.current] = { x, y };
    setQuad(next);
  }

  function turn() {
    if (!src) return;
    const c = rotate(src);
    setSrc(c); setQuad(findPage(c)); setPreview(c.toDataURL("image/jpeg", 0.8));
  }

  async function use() {
    if (!src || !quad) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 30)); // let "Straightening…" paint first
    const out = flatten(src, quad, mode);
    out.toBlob((b) => { setBusy(false); if (b) onDone(b); else setError("That didn't work. Try again."); }, "image/jpeg", 0.88);
  }

  const pts = quad && k ? quad.map((p) => ({ x: p.x * k, y: p.y * k })) : [];
  return (
    <div className="sc" role="dialog" aria-label="Scan work">
      <div className="sc-in stack-sm">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18 }}>Scan work</h2>
          <button type="button" className="btn ghost sm" onClick={onCancel}>Cancel</button>
        </div>
        {error ? <p className="notice error">{error}</p> : !preview ? <p className="small muted">Finding the page…</p> : (
          <>
            <p className="small muted">Drag the four dots onto the corners of the page.</p>
            <div className="sc-stage">
              <div ref={wrap} className="sc-photo" onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Photo to scan" draggable={false} />
                {pts.length === 4 && (
                  <svg className="sc-svg" width={box.w} height={box.h} aria-hidden="true">
                    <polygon points={pts.map((p) => `${p.x},${p.y}`).join(" ")} />
                  </svg>
                )}
                {pts.map((p, i) => (
                  <button key={i} type="button" className="sc-dot" style={{ left: p.x, top: p.y }} aria-label={["Top left", "Top right", "Bottom right", "Bottom left"][i] + " corner"}
                    onPointerDown={(e) => { drag.current = i; (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId); }} />
                ))}
              </div>
            </div>
            <div className="row mw-wrap" style={{ justifyContent: "space-between" }}>
              <div className="row mw-wrap">
                <div className="seg" role="group" aria-label="Scan style">
                  <button type="button" aria-pressed={mode === "doc"} onClick={() => setMode("doc")}>Black &amp; white</button>
                  <button type="button" aria-pressed={mode === "color"} onClick={() => setMode("color")}>Colour</button>
                </div>
                <button type="button" className="btn ghost sm" onClick={turn}>Rotate</button>
                <button type="button" className="btn ghost sm" onClick={() => src && setQuad(inset(src.width, src.height))}>Whole photo</button>
              </div>
              <button type="button" className="btn" disabled={busy || !quad} onClick={use}>{busy ? "Straightening…" : "Use scan"}</button>
            </div>
            <span className="small muted">Black &amp; white is best for writing and worksheets; colour for drawings and paintings.</span>
          </>
        )}
      </div>
    </div>
  );
}
