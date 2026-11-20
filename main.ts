// THE WORLD TODAY — Friday 20 November 2026
// A newspaper front page drawn from scratch in Node 22 stdlib only.
// Renders a 1024x1024 PNG of the day's world news and writes it to
// $MAKEFUN_OUTPUT_DIR/entry.png (default /output). No network, fully
// deterministic: the same bytes come out of every run.
//
// Stories (all happened or first reported on Friday 20 November 2026):
//   - Russia's overnight mass missile attack on Kyiv (Reuters, Kyiv Independent)
//   - Cyclone Akvan's landfall near Gopalpur, Odisha (NDTV / IMD)
//   - Tanker ablaze after striking a mine east of the Strait of Hormuz (Daily Baku)
//   - Drones halt flights at Genoa airport (Daily Baku)
//   - Houthis claim strikes on four Saudi targets (TASS / Daily Baku)
//   - Meta "reevaluating" its 2030 net-zero target (Bangkok Post)
//   - US auctions first deep-sea mining leases (Bangkok Post)
//   - European leaders ready for talks with Russia (BBC)

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- PNG out
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(w: number, h: number, rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // filter: none
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (1 + w * 3) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ canvas
type RGB = [number, number, number];

const PAPER: RGB = [246, 241, 227];
const INK: RGB = [22, 19, 14];
const RED: RGB = [166, 30, 30];
const BLUE: RGB = [30, 78, 121];
const GREY: RGB = [112, 108, 96];
const LIGHT: RGB = [232, 226, 208];

class Canvas {
  readonly w: number;
  readonly h: number;
  private px: Uint8Array;
  private clip: [number, number, number, number] | null = null;

  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 3);
    this.fillRect(0, 0, w, h, bg);
  }

  // Constrain all later drawing to this rectangle (pictograms stay in panel).
  clipRect(x: number, y: number, w: number, h: number): void {
    this.clip = [Math.round(x), Math.round(y), Math.round(w), Math.round(h)];
  }

  clearClip(): void {
    this.clip = null;
  }

  set(x: number, y: number, c: RGB): void {
    if (this.clip) {
      const [cx, cy, cw, ch] = this.clip;
      if (x < cx || y < cy || x >= cx + cw || y >= cy + ch) return;
    }
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
  }

  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    let x0 = Math.max(0, Math.round(x));
    let y0 = Math.max(0, Math.round(y));
    let x1 = Math.min(this.w, Math.round(x + w));
    let y1 = Math.min(this.h, Math.round(y + h));
    if (this.clip) {
      const [cx, cy, cw, ch] = this.clip;
      x0 = Math.max(x0, cx);
      y0 = Math.max(y0, cy);
      x1 = Math.min(x1, cx + cw);
      y1 = Math.min(y1, cy + ch);
    }
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * this.w + xx) * 3;
        this.px[i] = c[0];
        this.px[i + 1] = c[1];
        this.px[i + 2] = c[2];
      }
    }
  }

  // Filled circle.
  disc(cx: number, cy: number, r: number, c: RGB): void {
    const rr = Math.round(r);
    for (let dy = -rr; dy <= rr; dy++) {
      const dx = Math.floor(Math.sqrt(Math.max(0, rr * rr - dy * dy)));
      for (let xx = -dx; xx <= dx; xx++) this.set(cx + xx, cy + dy, c);
    }
  }

  // Circle outline, 1px.
  ring(cx: number, cy: number, r: number, c: RGB): void {
    const rr = Math.round(r);
    for (let a = 0; a < 360; a += 2) {
      const t = (a * Math.PI) / 180;
      this.set(Math.round(cx + rr * Math.cos(t)), Math.round(cy + rr * Math.sin(t)), c);
    }
  }

  // Bresenham line, with optional thickness stamped as discs.
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, thick = 1): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    for (;;) {
      if (thick <= 1) this.set(x, y, c);
      else this.disc(x, y, Math.floor(thick / 2), c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  // Even-odd scanline polygon fill. pts: [x, y, x, y, ...].
  poly(pts: number[], c: RGB): void {
    const n = pts.length / 2;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      minY = Math.min(minY, pts[i * 2 + 1]);
      maxY = Math.max(maxY, pts[i * 2 + 1]);
    }
    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const x0 = pts[i * 2];
        const y0 = pts[i * 2 + 1];
        const x1 = pts[j * 2];
        const y1 = pts[j * 2 + 1];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) this.set(x, y, c);
      }
    }
  }

  // Starburst: filled centre disc plus radiating spikes.
  burst(cx: number, cy: number, r: number, spikes: number, c: RGB): void {
    this.disc(cx, cy, Math.round(r * 0.45), c);
    for (let i = 0; i < spikes; i++) {
      const a = (i * Math.PI * 2) / spikes;
      const x1 = Math.round(cx + r * Math.cos(a));
      const y1 = Math.round(cy + r * Math.sin(a));
      this.line(cx, cy, x1, y1, c, 3);
    }
    this.disc(cx, cy, Math.round(r * 0.45), c);
  }

  toPNG(): Buffer {
    return encodePNG(this.w, this.h, this.px);
  }
}

// -------------------------------------------------------------------- font
// Hand-drawn 5x7 bitmap font. '#' is ink, '.' is empty.
const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  a: ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####'],
  b: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.'],
  c: ['.....', '.....', '.####', '#....', '#....', '#....', '.####'],
  d: ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
  f: ['..##.', '.#..#', '.#...', '####.', '.#...', '.#...', '.#...'],
  g: ['.....', '.....', '.####', '#...#', '#...#', '.####', '....#', '.###.'],
  h: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#'],
  i: ['..#..', '.....', '.##..', '..#..', '..#..', '..#..', '.###.'],
  j: ['...#.', '.....', '..##.', '...#.', '...#.', '...#.', '...#.', '.##..'],
  k: ['#....', '#....', '#.#..', '#.#..', '##...', '#.#..', '#..#.'],
  l: ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  n: ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#'],
  o: ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
  p: ['.....', '.....', '####.', '#...#', '#...#', '####.', '#....', '#....'],
  q: ['.....', '.....', '.####', '#...#', '#...#', '.####', '....#', '....#'],
  r: ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....'],
  s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  t: ['.#...', '.#...', '####.', '.#...', '.#...', '.#...', '..##.'],
  u: ['.....', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
  v: ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  w: ['.....', '.....', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  x: ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  y: ['.....', '.....', '#...#', '#...#', '#...#', '.####', '....#', '.###.'],
  z: ['.....', '.....', '#####', '...#.', '..#..', '.#...', '#####'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  '"': ['.#.#.', '.#.#.', '.#.#.', '.....', '.....', '.....', '.....'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '.###.', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '.###.', '.....', '.###.', '.....', '.....'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  '•': ['.....', '.....', '.###.', '.###.', '.###.', '.....', '.....'],
};

// Some lowercase glyphs need 8 rows (descenders); normalise every glyph to
// exactly 8 rows so the renderer can treat the cell as 5x8.
for (const k of Object.keys(FONT)) {
  while (FONT[k].length < 8) FONT[k].push('.....');
}

function textWidth(s: string, scale: number): number {
  let w = 0;
  for (const ch of s) w += 6 * scale;
  return w > 0 ? w - scale : 0; // no trailing gap after the last glyph
}

function drawText(cv: Canvas, s: string, x: number, y: number, scale: number, c: RGB): void {
  let cx = Math.round(x);
  const cy = Math.round(y);
  for (const ch of s) {
    const g = FONT[ch] ?? FONT['?'];
    for (let r = 0; r < 8; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if (row[col] === '#') cv.fillRect(cx + col * scale, cy + r * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
}

// Word-wrap plain text to a pixel width; returns lines (no trailing spaces).
function wrapText(s: string, maxW: number, scale: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textWidth(trial, scale) <= maxW) {
      cur = trial;
    } else {
      if (cur) lines.push(cur);
      // A single word wider than the column: hard-split it.
      let rest = w;
      while (textWidth(rest, scale) > maxW) {
        const take = Math.max(1, Math.floor(maxW / (6 * scale)));
        lines.push(rest.slice(0, take));
        rest = rest.slice(take);
      }
      cur = rest;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Draw wrapped text; returns the y just below the last line.
function drawPara(cv: Canvas, s: string, x: number, y: number, maxW: number, scale: number, c: RGB, lh?: number): number {
  const lines = wrapText(s, maxW, scale);
  const step = lh ?? Math.round(9 * scale);
  lines.forEach((ln, i) => drawText(cv, ln, x, y + i * step, scale, c));
  return y + lines.length * step;
}

// ------------------------------------------------------------- pictograms
const NAVY: RGB = [22, 40, 62];
const NIGHT: RGB = [13, 21, 32];
const GOLD: RGB = [240, 196, 80];
const ORANGE: RGB = [224, 123, 42];
const FIRE: RGB = [214, 69, 32];
const SMOKE: RGB = [120, 124, 128];
const TEAL: RGB = [15, 91, 110];
const SEA: RGB = [16, 68, 92];
const SKYBLUE: RGB = [157, 184, 200];
const SAND: RGB = [214, 186, 140];
const WHITE: RGB = [248, 246, 240];

// Lead picture: Kyiv skyline at night under a missile attack.
function drawKyiv(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, NAVY);
  // Stars.
  const stars: [number, number][] = [
    [18, 22], [64, 14], [120, 30], [180, 12], [240, 26], [300, 16], [352, 34],
    [40, 58], [150, 52], [268, 48], [330, 62], [96, 78], [210, 70],
  ];
  for (const [sx, sy] of stars) cv.disc(x + sx, y + sy, 2, WHITE);
  // Moon.
  cv.disc(x + 356, y + 52, 20, [238, 232, 200]);
  cv.disc(x + 350, y + 46, 17, NAVY);
  // Distant skyline.
  const far: [number, number, number][] = [
    [0, 170, 60], [62, 190, 44], [108, 150, 70], [180, 185, 52],
    [240, 160, 66], [308, 195, 40], [350, 175, 56],
  ];
  for (const [bx, bw, bh] of far) cv.fillRect(x + bx, y + h - bh - 46, bw, bh, [38, 58, 82]);
  // Near buildings with lit windows.
  const near: [number, number, number][] = [
    [14, 96, 150], [118, 70, 108], [196, 110, 176], [314, 84, 128],
  ];
  for (const [bx, bw, bh] of near) {
    cv.fillRect(x + bx, y + h - bh, bw, bh, NIGHT);
    for (let wy = y + h - bh + 14; wy < y + h - 12; wy += 18) {
      for (let wx = x + bx + 10; wx < x + bx + bw - 8; wx += 16) {
        if ((wx * 7 + wy * 13) % 5 < 2) cv.fillRect(wx, wy, 5, 7, GOLD);
      }
    }
  }
  // Ground.
  cv.fillRect(x, y + h - 8, w, 8, [8, 12, 18]);
  // Missile streaks coming down from the top.
  const streaks: [number, number, number, number][] = [
    [150, 0, 108, 96], [262, 0, 226, 118], [336, 0, 300, 88],
  ];
  for (const [x0, y0, x1, y1] of streaks) {
    cv.line(x + x0, y + y0, x + x1, y + y1, [255, 236, 160], 3);
    cv.disc(x + x1, y + y1, 6, [255, 214, 90]);
  }
  // Explosions over the rooftops.
  cv.burst(x + 150, y + 138, 34, 10, FIRE);
  cv.burst(x + 150, y + 138, 20, 8, ORANGE);
  cv.disc(x + 150, y + 138, 10, GOLD);
  cv.burst(x + 300, y + 168, 26, 9, FIRE);
  cv.burst(x + 300, y + 168, 15, 7, ORANGE);
  cv.disc(x + 300, y + 168, 7, GOLD);
  // Smoke drifting up.
  cv.disc(x + 128, y + 104, 12, SMOKE);
  cv.disc(x + 168, y + 92, 15, SMOKE);
  cv.disc(x + 284, y + 138, 10, SMOKE);
  cv.disc(x + 316, y + 126, 12, SMOKE);
}

// Cyclone spiral over the Bay of Bengal coast.
function drawCyclone(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, [168, 196, 205]);
  // Sea at the bottom.
  cv.fillRect(x, y + h - 42, w, 42, TEAL);
  cv.fillRect(x, y + h - 42, w, 3, SAND);
  for (let i = 0; i < 5; i++) {
    const wy = y + h - 34 + i * 7;
    for (let wx = x + 8 + ((i * 37) % 40); wx < x + w - 6; wx += 44) {
      cv.line(wx, wy, wx + 22, wy, [190, 220, 228], 2);
    }
  }
  // Spiral: an Archimedean coil of cloud dots, denser at the rim.
  // Radius stays inside the panel: max r ~ 3 + 5*pi*3.0 = 50.
  const cx = x + Math.round(w * 0.46);
  const cy = y + Math.round(h * 0.40);
  for (let a = 0; a < Math.PI * 5; a += 0.09) {
    const r = 3 + a * 3.0;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a) * 0.92;
    cv.disc(Math.round(px), Math.round(py), 5, WHITE);
  }
  cv.disc(cx, cy, 9, [210, 222, 228]); // calm eye
  // Rain streaks.
  for (let i = 0; i < 14; i++) {
    const rx = x + 12 + ((i * 53) % (w - 24));
    const ry = y + 10 + ((i * 29) % 40);
    cv.line(rx, ry, rx - 6, ry + 14, [120, 150, 165], 2);
  }
  // Coast marker: a small red pin where the storm comes ashore.
  cv.disc(x + w - 52, y + h - 46, 5, RED);
  cv.line(x + w - 52, y + h - 46, x + w - 52, y + h - 62, RED, 2);
}

// Tanker on fire east of the Strait of Hormuz at dusk.
// All vertical positions are relative to the panel height h.
function drawTanker(cv: Canvas, x: number, y: number, w: number, h: number): void {
  const seaTop = Math.round(h * 0.55);
  const hullTop = h - 40;
  const hullBot = h - 16;
  cv.fillRect(x, y, w, h, [232, 150, 88]);
  cv.fillRect(x, y + Math.round(h * 0.4), w, Math.round(h * 0.15), [240, 178, 110]);
  cv.fillRect(x, y + seaTop, w, h - seaTop, SEA);
  // Sun low on the horizon.
  cv.disc(x + 52, y + seaTop - 8, 14, [255, 226, 150]);
  // Hull.
  cv.poly([x + 18, y + hullTop, x + w - 16, y + hullTop, x + w - 34, y + hullBot, x + 34, y + hullBot], [12, 14, 18]);
  // Containers on deck.
  const cols: RGB[] = [[178, 52, 44], [42, 110, 68], [30, 78, 121], [190, 140, 40]];
  for (let i = 0; i < 4; i++) {
    cv.fillRect(x + 52 + i * 52, y + hullTop - 22, 46, 22, cols[i]);
  }
  // Funnel.
  cv.fillRect(x + w - 58, y + hullTop - 26, 26, 26, [200, 60, 40]);
  // Flames rising from mid-deck.
  const fx = x + 150;
  const fy = y + hullTop - 22;
  cv.poly([fx - 24, fy, fx, fy - 40, fx + 24, fy], FIRE);
  cv.poly([fx - 16, fy, fx, fy - 29, fx + 16, fy], ORANGE);
  cv.poly([fx - 8, fy, fx, fy - 18, fx + 8, fy], GOLD);
  // Smoke.
  cv.disc(fx - 8, fy - 40, 9, SMOKE);
  cv.disc(fx + 10, fy - 50, 10, SMOKE);
  cv.disc(fx + 2, fy - 58, 8, SMOKE);
  // Sea waves below the hull.
  for (let i = 0; i < 2; i++) {
    const wy = y + hullBot + 5 + i * 6;
    for (let wx = x + 10 + ((i * 41) % 46); wx < x + w - 8; wx += 52) {
      cv.line(wx, wy, wx + 26, wy, [120, 170, 190], 2);
    }
  }
}

// Genoa airport: runway, tower and unidentified drones in the sky.
function drawAirport(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, SKYBLUE);
  // Clouds.
  cv.disc(x + 60, y + 26, 12, WHITE);
  cv.disc(x + 78, y + 22, 15, WHITE);
  cv.disc(x + 250, y + 34, 10, WHITE);
  cv.disc(x + 264, y + 30, 13, WHITE);
  // Runway.
  cv.fillRect(x, y + h - 46, w, 46, [74, 78, 84]);
  for (let wx = x + 12; wx < x + w - 12; wx += 34) {
    cv.fillRect(wx, y + h - 25, 18, 4, WHITE);
  }
  // Control tower.
  cv.fillRect(x + 24, y + h - 108, 16, 62, [52, 58, 66]);
  cv.fillRect(x + 16, y + h - 122, 32, 16, [52, 58, 66]);
  cv.fillRect(x + 19, y + h - 119, 26, 10, [140, 200, 220]);
  cv.line(x + 32, y + h - 122, x + 32, y + h - 136, INK, 2);
  cv.disc(x + 32, y + h - 138, 3, RED);
  // Parked plane silhouette on the runway.
  cv.fillRect(x + 170, y + h - 58, 96, 8, [40, 44, 50]);
  cv.poly([x + 262, y + h - 58, x + 276, y + h - 52, x + 262, y + h - 50], [40, 44, 50]);
  cv.line(x + 218, y + h - 58, x + 218, y + h - 72, [40, 44, 50], 3);
  // Two drones with spinning rotors.
  const drone = (dx: number, dy: number): void => {
    cv.fillRect(dx - 7, dy - 5, 14, 10, INK);
    cv.line(dx - 12, dy - 8, dx - 5, dy - 3, INK, 2);
    cv.line(dx + 5, dy - 3, dx + 12, dy - 8, INK, 2);
    cv.line(dx - 12, dy + 8, dx - 5, dy + 3, INK, 2);
    cv.line(dx + 5, dy + 3, dx + 12, dy + 8, INK, 2);
    cv.disc(dx - 14, dy - 10, 4, GREY);
    cv.disc(dx + 14, dy - 10, 4, GREY);
    cv.disc(dx - 14, dy + 10, 4, GREY);
    cv.disc(dx + 14, dy + 10, 4, GREY);
    cv.disc(dx, dy, 2, RED);
  };
  drone(x + 120, y + 52);
  drone(x + 220, y + 76);
}

// Small 44x44 icons for the bottom strip.
function iconRocket(cv: Canvas, x: number, y: number): void {
  cv.line(x + 10, y + 34, x + 30, y + 12, INK, 5);
  cv.poly([x + 30, y + 12, x + 40, y + 6, x + 36, y + 18], INK);
  cv.poly([x + 10, y + 34, x + 4, y + 40, x + 14, y + 40], ORANGE);
  cv.disc(x + 20, y + 24, 3, RED);
}
function iconLeaf(cv: Canvas, x: number, y: number): void {
  cv.line(x + 22, y + 40, x + 22, y + 14, [42, 110, 68], 3);
  cv.poly([x + 22, y + 14, x + 6, y + 26, x + 22, y + 30], [42, 110, 68]);
  cv.poly([x + 22, y + 16, x + 38, y + 24, x + 22, y + 32], [74, 148, 92]);
}
function iconAnchor(cv: Canvas, x: number, y: number): void {
  cv.ring(x + 22, y + 8, 5, BLUE);
  cv.line(x + 22, y + 13, x + 22, y + 36, BLUE, 3);
  cv.line(x + 10, y + 18, x + 34, y + 18, BLUE, 3);
  cv.line(x + 22, y + 36, x + 10, y + 26, BLUE, 3);
  cv.line(x + 22, y + 36, x + 34, y + 26, BLUE, 3);
  cv.disc(x + 38, y + 8, 2, [120, 170, 190]);
  cv.disc(x + 40, y + 16, 2, [120, 170, 190]);
}
function iconTalks(cv: Canvas, x: number, y: number): void {
  cv.fillRect(x + 4, y + 8, 20, 14, BLUE);
  cv.poly([x + 8, y + 22, x + 14, y + 22, x + 8, y + 30], BLUE);
  cv.fillRect(x + 20, y + 20, 20, 14, [190, 160, 40]);
  cv.poly([x + 30, y + 34, x + 36, y + 34, x + 36, y + 42], [190, 160, 40]);
  cv.fillRect(x + 8, y + 13, 12, 2, WHITE);
  cv.fillRect(x + 24, y + 25, 12, 2, WHITE);
}

// ------------------------------------------------------------------ layout
function rule(cv: Canvas, x: number, y: number, w: number, thick: number, c: RGB = INK): void {
  cv.fillRect(x, y, w, thick, c);
}

function renderPage(): Canvas {
  const cv = new Canvas(1024, 1024, PAPER);
  const MX = 36;
  const CW = 952; // content width, MX .. MX+CW

  // ---- masthead
  const mast = 'THE WORLD TODAY';
  drawText(cv, mast, Math.round((1024 - textWidth(mast, 7)) / 2), 26, 7, INK);
  rule(cv, MX, 94, CW, 3);
  const date = 'FRIDAY, 20 NOVEMBER 2026';
  drawText(cv, date, Math.round((1024 - textWidth(date, 3)) / 2), 104, 3, RED);
  const tag = "ONE DAY \u2022 ONE PAGE \u2022 THE WORLD'S NEWS";
  drawText(cv, tag, Math.round((1024 - textWidth(tag, 2)) / 2), 134, 2, INK);
  rule(cv, MX, 156, CW, 1, GREY);

  // ---- lead story: Kyiv
  drawText(cv, 'UKRAINE - WAR IN EUROPE', MX, 170, 2, RED);
  drawText(cv, 'RUSSIA RAINS', MX, 198, 5, INK);
  drawText(cv, 'MISSILES ON KYIV', MX, 244, 5, INK);
  let y = drawPara(
    cv,
    'Explosions rocked the capital in the early hours of Friday as Russia launched a mass missile attack. Fires burned in homes in Obolonskyi and Podilskyi, and an infrastructure site was hit in Holosiivskyi.',
    MX,
    302,
    520,
    2,
    INK,
  );
  drawPara(
    cv,
    'Air defences were in action across the city as waves of missiles and drones kept coming through the night.',
    MX,
    y + 8,
    520,
    2,
    INK,
  );
  cv.fillRect(576, 168, 412, 300, INK); // picture border
  cv.clipRect(578, 170, 408, 296);
  drawKyiv(cv, 578, 170, 408, 296);
  cv.clearClip();

  rule(cv, MX, 482, CW, 2);

  // ---- secondary row: three stories with pictures
  const cols = [MX, 358, 680];
  const pics: Array<(cv: Canvas, x: number, y: number, w: number, h: number) => void> = [
    drawCyclone,
    drawTanker,
    drawAirport,
  ];
  const heads: string[][] = [
    ['CYCLONE AKVAN', 'SLAMS ODISHA'],
    ['TANKER ABLAZE', 'AFTER MINE BLAST'],
    ['DRONES SHUT', 'GENOA AIRPORT'],
  ];
  const bodies = [
    'Landfall near Gopalpur at noon, winds to 110 km/h. Over 120,000 evacuated.',
    'A tanker caught fire east of the Strait of Hormuz after striking a mine.',
    'Flights suspended after unidentified drones were seen over the airport.',
  ];
  for (let i = 0; i < 3; i++) {
    const cx = cols[i];
    cv.fillRect(cx, 496, 308, 132, INK);
    cv.clipRect(cx + 2, 498, 304, 128);
    pics[i](cv, cx + 2, 498, 304, 128);
    cv.clearClip();
    drawText(cv, heads[i][0], cx, 638, 3, INK);
    drawText(cv, heads[i][1], cx, 665, 3, INK);
    drawPara(cv, bodies[i], cx, 696, 308, 2, INK);
  }

  rule(cv, MX, 760, CW, 2);

  // ---- bottom strip: four short stories with icons
  const stripX = [MX, 276, 516, 756];
  const icons = [iconRocket, iconLeaf, iconAnchor, iconTalks];
  const sHeads: string[][] = [
    ['HOUTHIS HIT', 'FOUR SAUDI', 'TARGETS'],
    ['META RETHINKS', 'NET-ZERO GOAL'],
    ['US AUCTIONS', 'FIRST DEEP-SEA', 'LEASES'],
    ['EUROPE READY', 'FOR RUSSIA', 'TALKS'],
  ];
  const sBodies = [
    "Yemen's Houthis claim drone and missile strikes on four targets in Saudi Arabia.",
    "Meta says it is 'reevaluating' its 2030 net-zero target as its AI buildout grows.",
    'Washington auctions the first deep-sea mining leases despite a court ruling.',
    'European leaders in Berlin say they are ready for talks with Russia on Ukraine.',
  ];
  for (let i = 0; i < 4; i++) {
    const sx = stripX[i];
    icons[i](cv, sx, 772);
    sHeads[i].forEach((ln, j) => drawText(cv, ln, sx + 52, 772 + j * 18, 2, INK));
    drawPara(cv, sBodies[i], sx, 830, 230, 2, INK);
    if (i > 0) cv.fillRect(sx - 6, 772, 1, 158, LIGHT);
  }

  // ---- footer
  rule(cv, MX, 946, CW, 1, GREY);
  drawText(cv, 'Sources: Reuters \u2022 Kyiv Independent \u2022 NDTV / IMD \u2022 Bangkok Post \u2022 BBC \u2022 TASS', MX, 956, 2, GREY);
  drawText(cv, 'Every story above happened or was first reported on Friday 20 November 2026.', MX, 976, 2, GREY);

  return cv;
}

// --------------------------------------------------------------------- main
function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  const png = renderPage().toPNG();
  writeFileSync(join(outDir, 'entry.png'), png);
}

main();
