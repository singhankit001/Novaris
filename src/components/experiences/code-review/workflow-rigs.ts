import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** One illustrated stage: where it sits on the path, and how it animates while it is the active stage. */
export interface StageRig {
  anchor: THREE.Vector3;
  update: (clock: number, dt: number, active: boolean, still: boolean) => void;
}

const BLUE = 0x2f54ff;
const VIOLET = 0x7a4dff;
const AMBER = 0xe8a33a;
const RED = 0xe0574f;
const GAP = 6.4;

const white = () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0 });
// Low metalness on purpose: without an environment map, metallic surfaces render dark.
const silver = (c = 0xeef0f5) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.08 });
const flat = (c: number, opacity = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });

function fontVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Text drawn to a canvas texture on a plane. Height in world units. */
function label(text: string, height: number, opts: { color?: string; weight?: number; mono?: boolean; bg?: string } = {}) {
  // next/font exposes the self-hosted families as these variables on <html>.
  const font = opts.mono ? fontVar("--nv-font-mono-face", "monospace") : fontVar("--nv-font-sans-face", "sans-serif");
  const px = 96;
  const pad = opts.bg ? 40 : 8;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  if (!ctx) return new THREE.Mesh();
  ctx.font = `${opts.weight ?? 500} ${px}px ${font}`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = Math.ceil(px * 1.45);
  c.width = w;
  c.height = h;
  ctx.font = `${opts.weight ?? 500} ${px}px ${font}`;
  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, h / 2);
    ctx.fill();
  }
  ctx.fillStyle = opts.color ?? "#3a3e4a";
  ctx.textBaseline = "middle";
  ctx.fillText(text, pad, h / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  return new THREE.Mesh(new THREE.PlaneGeometry((height * w) / h, height), mat);
}

let shadowTex: THREE.Texture | null = null;
function softShadow(w: number, d: number) {
  if (!shadowTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
      g.addColorStop(0, "rgba(40,48,80,0.32)");
      g.addColorStop(1, "rgba(40,48,80,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = -0.005;
  return m;
}

/** An upright file card with grey code lines; returns the line meshes so stages can highlight them. */
function fileCard(w: number, h: number, name: string, lineCount: number, seed: number) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.07, 3, 0.06), white()));
  const title = label(name, 0.13, { mono: true, color: "#14161d" });
  title.position.set(-w / 2 + 0.16 + (title.geometry as THREE.PlaneGeometry).parameters.width / 2, h / 2 - 0.2, 0.04);
  g.add(title);
  const lines: THREE.Mesh[] = [];
  const top = h / 2 - 0.46;
  const gap = (h - 0.7) / lineCount;
  for (let i = 0; i < lineCount; i++) {
    const r = Math.abs(Math.sin((i + 1) * seed * 12.9898)) % 1;
    const indent = i % 4 === 0 ? 0 : 0.14 * ((i % 3) + 1);
    const len = (w - 0.4 - indent) * (0.35 + r * 0.6);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, gap * 0.38), flat(0xd5d8e0));
    m.position.set(-w / 2 + 0.2 + indent + len / 2, top - i * gap, 0.038);
    g.add(m);
    lines.push(m);
  }
  return { group: g, lines, w, h };
}

const approach = (v: number, target: number, dt: number, still: boolean, rate = 4) => (still ? target : v + (target - v) * (1 - Math.exp(-dt * rate)));

function stageAt(scene: THREE.Scene, i: number) {
  const group = new THREE.Group();
  group.position.set(i * GAP, 0, i % 2 ? -1.1 : 0);
  scene.add(group);
  return group;
}

export function buildStages(scene: THREE.Scene): StageRig[] {
  const rigs: StageRig[] = [];

  // 1. Connect: a repository slab and the GitHub link ring above it.
  {
    const g = stageAt(scene, 0);
    g.add(softShadow(4, 3));
    const slab = new THREE.Mesh(new RoundedBoxGeometry(2.8, 0.24, 1.9, 4, 0.1), silver());
    slab.position.y = 0.12;
    g.add(slab);
    const name = label("acme/payments-api", 0.2, { mono: true, color: "#14161d" });
    name.rotation.x = -Math.PI / 2;
    name.position.set(0, 0.25, 0.25);
    g.add(name);
    const host = label("github.com", 0.13, { mono: true, color: "#626775" });
    host.rotation.x = -Math.PI / 2;
    host.position.set(0, 0.25, -0.2);
    g.add(host);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 12), silver(0xcfd5e1));
    stem.position.y = 0.75;
    g.add(stem);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.045, 18, 72), new THREE.MeshStandardMaterial({ color: BLUE, roughness: 0.3, metalness: 0.2, emissive: BLUE, emissiveIntensity: 0.15 }));
    ring.position.y = 1.55;
    g.add(ring);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), white());
    core.position.y = 1.55;
    g.add(core);
    let k = 0;
    rigs.push({
      anchor: g.position.clone(),
      update: (t, dt, active, still) => {
        k = approach(k, active ? 1 : 0, dt, still);
        ring.rotation.x = 0.25 + Math.sin(t * 0.8) * 0.1 * k;
        ring.rotation.y = Math.sin(t * 0.7) * 0.45 * k;
        ring.scale.setScalar(0.85 + 0.15 * k);
      },
    });
  }

  // 2. Explore: stacked folders; whole files rise out of them and fan open.
  {
    const g = stageAt(scene, 1);
    g.add(softShadow(4.2, 3));
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new RoundedBoxGeometry(2.5, 0.14, 1.7, 3, 0.05), silver(i === 2 ? 0xdfe4ff : 0xe6e9f0));
      f.position.set(i * 0.08, 0.08 + i * 0.2, -i * 0.06);
      g.add(f);
    }
    const names = ["session.ts", "middleware.ts", "route.ts", "schema.prisma"];
    const cards = names.map((n, i) => {
      const c = fileCard(1.0, 1.3, n, 7, i + 2);
      if (i === 0) {
        const edge = new THREE.Mesh(new RoundedBoxGeometry(1.08, 1.38, 0.04, 3, 0.07), flat(BLUE));
        edge.position.z = -0.03;
        c.group.add(edge);
      }
      g.add(c.group);
      return c.group;
    });
    let k = 0;
    rigs.push({
      anchor: g.position.clone(),
      update: (_t, dt, active, still) => {
        k = approach(k, active ? 1 : 0.15, dt, still, 3);
        cards.forEach((c, i) => {
          const spread = (i - 1.5) * 1.12;
          c.position.set(spread * k, 0.75 + 0.65 * k + (i === 0 ? 0.12 * k : 0), 0.2 + Math.abs(i - 1.5) * -0.12 * k);
          c.rotation.y = -spread * 0.16 * k;
        });
      },
    });
  }

  // 3. Dependencies: the changed file with its imports and callers, linked by lines; packets travel the links.
  {
    const g = stageAt(scene, 2);
    g.add(softShadow(5, 3.4));
    const centre = fileCard(1.0, 1.3, "session.ts", 6, 9);
    centre.group.position.y = 1.0;
    g.add(centre.group);
    const deps = [
      { n: "token.ts", p: [-1.55, 1.75, -0.4] },
      { n: "db.ts", p: [-1.5, 0.45, 0.4] },
      { n: "middleware.ts", p: [1.55, 1.8, -0.3] },
      { n: "billing/route.ts", p: [1.5, 0.5, 0.35] },
      { n: "account/page.tsx", p: [0.1, 2.35, -0.8] },
    ];
    const lineMats: THREE.LineBasicMaterial[] = [];
    const edges: THREE.Vector3[][] = [];
    for (const d of deps) {
      const pos = new THREE.Vector3(d.p[0], d.p[1], d.p[2]);
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), white());
      node.position.copy(pos);
      g.add(node);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 40), flat(BLUE, 0.6));
      ring.position.copy(pos);
      g.add(ring);
      const t = label(d.n, 0.13, { mono: true, color: "#3a3e4a" });
      t.position.copy(pos).add(new THREE.Vector3(0, -0.32, 0));
      g.add(t);
      const from = new THREE.Vector3(0, 1.0, 0);
      const mat = new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.3 });
      lineMats.push(mat);
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, pos]), mat));
      edges.push([from, pos]);
    }
    const packets = edges.map(() => {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), flat(VIOLET));
      p.visible = false;
      g.add(p);
      return p;
    });
    let k = 0;
    rigs.push({
      anchor: g.position.clone(),
      update: (t, dt, active, still) => {
        k = approach(k, active ? 1 : 0, dt, still);
        lineMats.forEach((m) => (m.opacity = 0.25 + 0.5 * k));
        packets.forEach((p, i) => {
          const e = edges[i];
          if (!e || still) return void (p.visible = false);
          p.visible = k > 0.5;
          const u = (t * 0.45 + i / packets.length) % 1;
          p.position.lerpVectors(e[1] ?? e[0], e[0], u);
        });
      },
    });
  }

  // 4. Review: a whole file read top to bottom by a scanning band.
  {
    const g = stageAt(scene, 3);
    g.add(softShadow(3.6, 2.6));
    const card = fileCard(2.0, 2.5, "billing/route.ts", 12, 5);
    card.group.position.y = 1.32;
    card.group.rotation.y = -0.12;
    g.add(card.group);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.22), flat(BLUE, 0.12));
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.012), flat(BLUE, 0.85));
    band.position.z = beam.position.z = 0.045;
    card.group.add(band, beam);
    const chip = label("review intent", 0.16, { color: "#ffffff", weight: 600, bg: "#7a4dff" });
    chip.position.set(0.95, 2.75, 0.2);
    g.add(chip);
    let k = 0;
    rigs.push({
      anchor: g.position.clone(),
      update: (t, dt, active, still) => {
        k = approach(k, active ? 1 : 0, dt, still);
        const y = still ? 0.2 : 0.95 - ((t * 0.32) % 1) * 2.0;
        band.position.y = beam.position.y = y;
        (band.material as THREE.MeshBasicMaterial).opacity = 0.14 * k;
        (beam.material as THREE.MeshBasicMaterial).opacity = 0.85 * k;
        chip.position.y = 2.75 + Math.sin(t * 1.4) * 0.05 * k;
      },
    });
  }

  // 5. Risks: the same kind of file with two lines flagged: a side effect and a dependency impact.
  {
    const g = stageAt(scene, 4);
    g.add(softShadow(3.6, 2.6));
    const card = fileCard(2.0, 2.5, "billing/route.ts", 12, 5);
    // Shifted left so the risk tags on its right stay in frame.
    card.group.position.set(-0.75, 1.32, 0);
    card.group.rotation.y = 0.14;
    g.add(card.group);
    const flags = [
      { line: 3, color: AMBER, text: "side effect" },
      { line: 7, color: RED, text: "dependency impact" },
    ].map((f) => {
      const ln = card.lines[f.line];
      const hl = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 0.17), flat(f.color, 0));
      hl.position.set(0, ln ? ln.position.y : 0, 0.039);
      card.group.add(hl);
      const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), new THREE.MeshStandardMaterial({ color: f.color, roughness: 0.35, metalness: 0.15 }));
      marker.position.set(1.22, hl.position.y, 0.1);
      card.group.add(marker);
      const tag = label(f.text, 0.14, { color: "#14161d", weight: 600, bg: "#ffffff" });
      tag.position.set(1.42 + (tag.geometry as THREE.PlaneGeometry).parameters.width / 2, hl.position.y, 0.1);
      (tag.material as THREE.MeshBasicMaterial).opacity = 0;
      card.group.add(tag);
      return { hl, marker, tag };
    });
    let k = 0;
    rigs.push({
      anchor: g.position.clone(),
      update: (t, dt, active, still) => {
        k = approach(k, active ? 1 : 0, dt, still, 3);
        flags.forEach((f, i) => {
          (f.hl.material as THREE.MeshBasicMaterial).opacity = 0.32 * k;
          (f.tag.material as THREE.MeshBasicMaterial).opacity = Math.min(1, k * 1.4 - i * 0.2);
          f.marker.rotation.y = t * 1.2;
          f.marker.scale.setScalar(0.4 + 0.6 * k);
        });
      },
    });
  }

  // 6. Findings: a report card whose rows cite file paths.
  {
    const g = stageAt(scene, 5);
    g.add(softShadow(3.8, 2.8));
    const card = new THREE.Group();
    card.position.y = 1.35;
    card.rotation.y = -0.18;
    g.add(card);
    card.add(new THREE.Mesh(new RoundedBoxGeometry(2.4, 2.6, 0.08, 3, 0.08), white()));
    const head = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.42), flat(0xeef1ff));
    head.position.set(0, 1.0, 0.045);
    card.add(head);
    const title = label("Review notes", 0.17, { color: "#14161d", weight: 600 });
    title.position.set(-1.0 + (title.geometry as THREE.PlaneGeometry).parameters.width / 2, 1.0, 0.05);
    card.add(title);
    const rows = [
      { c: RED, t: "app/api/billing/route.ts:5" },
      { c: AMBER, t: "lib/auth/session.ts:18" },
      { c: BLUE, t: "app/account/page.tsx:42" },
    ].map((r, i) => {
      const row = new THREE.Group();
      row.position.set(0, 0.45 - i * 0.55, 0.05);
      const pill = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.16, 0.04, 2, 0.06), new THREE.MeshStandardMaterial({ color: r.c, roughness: 0.4 }));
      pill.position.x = -0.92;
      row.add(pill);
      const path = label(r.t, 0.12, { mono: true, color: "#3a3e4a" });
      path.position.x = -0.76 + (path.geometry as THREE.PlaneGeometry).parameters.width / 2;
      path.position.y = 0.08;
      row.add(path);
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.05), flat(0xe6e8ee));
      bar.position.set(-0.01, -0.1, 0);
      row.add(bar);
      card.add(row);
      return row;
    });
    let k = 0;
    rigs.push({
      anchor: g.position.clone(),
      update: (_t, dt, active, still) => {
        k = approach(k, active ? 1 : 0, dt, still, 3);
        rows.forEach((r, i) => {
          const kk = Math.max(0, Math.min(1, k * 1.6 - i * 0.25));
          r.position.x = (1 - kk) * 0.5;
          r.scale.setScalar(0.6 + 0.4 * kk);
        });
      },
    });
  }

  return rigs;
}
