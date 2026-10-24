import * as THREE from "three";
import { drawableEdges } from "./build-atlas";
import type { AtlasEdge, AtlasLayout, AtlasPhase } from "./types";

export type Quality = "low" | "mid" | "high";

export interface SceneHandle {
  setData(layout: AtlasLayout, edges: AtlasEdge[]): void;
  setPhase(phase: AtlasPhase): void;
  setSelected(path: string | undefined): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

export interface SceneOptions {
  quality: Quality;
  onSelect(path: string): void;
  onContext(lost: boolean): void;
}

interface Nav { hardwareConcurrency?: number; deviceMemory?: number; connection?: { saveData?: boolean } }

export function detectQuality(): Quality {
  const n = navigator as Navigator & Nav;
  if (n.connection?.saveData) return "low";
  if ((n.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 4) return "low";
  return window.devicePixelRatio > 1 && (n.hardwareConcurrency ?? 8) >= 8 ? "high" : "mid";
}

export interface AtlasDebug {
  renderers: Map<number, THREE.WebGLRenderer>;
  created: number;
  disposed: { geometries: number; textures: number }[];
  memory(): { live: number; geometries: number; textures: number };
}
declare global {
  interface Window { __NV_ATLAS_DEBUG__?: AtlasDebug }
}

const C = {
  slab: [0x15181a, 0x1b1f22], hair: 0x353b40, file: 0xaba698, selected: 0xf7f2e8,
  copper: 0xd08f63, text: "#ede7da",
};
const ROWS = 5;
const GAP = 1.7;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function label(text: string): { sprite: THREE.Sprite; tex: THREE.CanvasTexture } {
  const cv = document.createElement("canvas");
  cv.width = 640;
  cv.height = 64;
  const g = cv.getContext("2d");
  if (g) {
    g.font = "500 30px ui-monospace, Menlo, monospace";
    g.fillStyle = C.text;
    g.textBaseline = "middle";
    g.fillText(text, 4, 34);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(8, 0.8, 1);
  sprite.center.set(0, 0.5);
  return { sprite, tex };
}

export function createScene(canvas: HTMLCanvasElement, opts: SceneOptions): SceneHandle {
  const cap = opts.quality === "low" ? 1 : 1.5;
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: opts.quality === "high", alpha: true, powerPreference: opts.quality === "low" ? "low-power" : "default",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
  renderer.setClearColor(0x000000, 0);

  const dbg = process.env.NODE_ENV !== "production" ? (window.__NV_ATLAS_DEBUG__ ??= {
    renderers: new Map(), created: 0, disposed: [] as AtlasDebug["disposed"],
    memory() {
      let geometries = 0, textures = 0;
      for (const r of this.renderers.values()) { geometries += r.info.memory.geometries; textures += r.info.memory.textures; }
      return { live: this.renderers.size, geometries, textures };
    },
  }) : undefined;
  const dbgId = dbg ? ++dbg.created : 0;
  dbg?.renderers.set(dbgId, renderer);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);
  const content = new THREE.Group();
  scene.add(content);
  const slabGeo = new THREE.BoxGeometry(1, 0.08, 1);
  const fileGeo = new THREE.BoxGeometry(1, 1, 1);
  const hairGeo = new THREE.EdgesGeometry(slabGeo);
  const hairMat = new THREE.LineBasicMaterial({ color: C.hair });
  const edgeMat = new THREE.LineBasicMaterial({ color: C.copper });
  const sweepMat = new THREE.MeshBasicMaterial({ color: C.copper, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  const sweep = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sweepMat);
  sweep.visible = false;
  scene.add(sweep);
  const owned: { dispose(): void }[] = [slabGeo, fileGeo, hairGeo, hairMat, edgeMat, sweepMat, sweep.geometry];
  let dyn: { dispose(): void }[] = [];

  let layout: AtlasLayout | undefined;
  let edges: AtlasEdge[] = [];
  let phase: AtlasPhase = "idle";
  let selected: string | undefined;
  let visible = true;
  let lost = false;
  let disposed = false;
  let files: THREE.InstancedMesh | undefined;
  let edgeLines: THREE.LineSegments | undefined;
  let ids: string[] = [];
  let dist = 28;
  let center = 0;
  let tween: { from: number; to: number; t0: number; dur: number } | undefined;
  let scale = 1;
  let raf = 0;
  let looping = false;

  const dir = new THREE.Vector3(0.38, 0.5, 1).normalize();
  const place = () => {
    camera.position.copy(dir).multiplyScalar(dist * scale).add(new THREE.Vector3(0, center, 0));
    camera.lookAt(0, center, 0);
  };
  const resize = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const a = Math.max(camera.aspect, 0.4);
    dist = Math.max(30, ((layout?.layers.length ?? 1) * GAP + 22) * Math.max(1, 1.5 / a));
    place();
  };
  const ro = new ResizeObserver(() => { resize(); invalidate(); });
  ro.observe(canvas);

  const paint = () => {
    if (!files || !layout) return;
    const cited = phase === "complete" ? new Set(edges.flatMap((e) => [e.from, e.to])) : new Set<string>();
    const col = new THREE.Color();
    ids.forEach((id, i) => files!.setColorAt(i, col.setHex(id === selected ? C.selected : cited.has(id) ? C.copper : C.file)));
    if (files.instanceColor) files.instanceColor.needsUpdate = true;
    if (edgeLines) edgeLines.visible = phase === "complete";
  };

  const rebuild = () => {
    content.clear();
    dyn.forEach((d) => d.dispose());
    dyn = [];
    files = edgeLines = undefined;
    if (!layout) return;
    const L = layout, n = L.layers.length;
    center = 0;
    const yOf = (i: number) => ((n - 1) / 2 - i) * GAP;
    L.layers.forEach((layer, i) => {
      const mat = new THREE.MeshBasicMaterial({ color: C.slab[i % 2] });
      dyn.push(mat);
      const slab = new THREE.Mesh(slabGeo, mat);
      slab.scale.set(L.cols + 1, 1, ROWS + 1);
      slab.position.y = yOf(i);
      const hair = new THREE.LineSegments(hairGeo, hairMat);
      hair.scale.copy(slab.scale);
      hair.position.copy(slab.position);
      const lb = label(`${layer.name}  ${layer.fileCount} files${layer.hiddenCount && !layer.aggregate ? ` (+${layer.hiddenCount} not drawn)` : ""}`);
      dyn.push(lb.sprite.material, lb.tex);
      lb.sprite.position.set(-(L.cols + 1) / 2, yOf(i) + 0.55, (ROWS + 1) / 2 + 0.2);
      content.add(slab, hair, lb.sprite);
    });
    ids = L.layers.flatMap((l) => l.nodes.map((nd) => nd.id));
    const sizes = new Map(L.layers.flatMap((l) => l.nodes.map((nd) => [nd.id, nd.size] as const)));
    const fm = new THREE.MeshBasicMaterial({ color: 0xffffff });
    dyn.push(fm);
    const mesh = new THREE.InstancedMesh(fileGeo, fm, Math.max(ids.length, 1));
    mesh.count = ids.length;
    const m = new THREE.Matrix4();
    const pos = (id: string) => {
      const s = L.slots[id];
      return new THREE.Vector3(s.col - (L.cols - 1) / 2, yOf(s.layer), s.row - (ROWS - 1) / 2);
    };
    ids.forEach((id, i) => {
      const sz = sizes.get(id);
      const h = sz ? 0.12 + Math.min(0.5, Math.log10(sz + 1) / 12) : 0.12; // height only when size is measured
      const p = pos(id);
      m.compose(new THREE.Vector3(p.x, p.y + 0.04 + h / 2, p.z), new THREE.Quaternion(), new THREE.Vector3(0.72, h, 0.72));
      mesh.setMatrixAt(i, m);
    });
    dyn.push(mesh);
    content.add(mesh);
    files = mesh;
    const pts: THREE.Vector3[] = [];
    for (const e of drawableEdges(L, edges)) pts.push(pos(e.from).setY(pos(e.from).y + 0.3), pos(e.to).setY(pos(e.to).y + 0.3));
    if (pts.length) {
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      dyn.push(g);
      edgeLines = new THREE.LineSegments(g, edgeMat);
      content.add(edgeLines);
    }
    sweep.scale.set(L.cols + 3, n * GAP + 1, 1);
    paint();
  };

  const frame = (now: number) => {
    if (tween) {
      const t = Math.min(1, (now - tween.t0) / tween.dur);
      scale = tween.from + (tween.to - tween.from) * ease(t);
      if (t >= 1) tween = undefined;
      place();
    }
    const moving = phase === "acquiring" || phase === "analyzing";
    sweep.visible = moving;
    if (moving) {
      const period = phase === "acquiring" ? 2400 : 3600;
      sweep.position.set(0, 0, (ROWS + 1) * (((now % period) / period) - 0.5));
      sweep.rotation.set(0, 0, 0);
    }
    renderer.render(scene, camera);
  };
  const needsLoop = () => visible && !lost && !disposed && (!!tween || phase === "acquiring" || phase === "analyzing");
  const sync = () => {
    const want = needsLoop();
    if (want && !looping) renderer.setAnimationLoop(frame);
    if (!want && looping) renderer.setAnimationLoop(null);
    looping = want;
    if (!want) invalidate();
  };
  function invalidate() {
    if (raf || looping || !visible || lost || disposed) return;
    raf = requestAnimationFrame((t) => { raf = 0; if (!lost && !disposed) { sweep.visible = false; frame(t); } });
  }
  const dolly = (from: number, dur: number) => {
    tween = { from, to: 1, t0: performance.now(), dur };
    scale = from;
    sync();
  };

  const ray = new THREE.Raycaster();
  const onClick = (ev: MouseEvent) => {
    if (!files || lost) return;
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObject(files)[0];
    if (hit?.instanceId !== undefined) opts.onSelect(ids[hit.instanceId]);
  };
  const onLost = (ev: Event) => { ev.preventDefault(); lost = true; sync(); opts.onContext(true); };
  const onRestored = () => { lost = false; opts.onContext(false); sync(); invalidate(); };
  canvas.addEventListener("click", onClick);
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  resize();

  return {
    setData(l, e) {
      const first = !layout;
      layout = l;
      edges = e;
      rebuild();
      resize();
      if (first && l.layers.length) dolly(1.14, 650);
      else invalidate();
    },
    setPhase(p) {
      const was = phase;
      phase = p;
      paint();
      if (p === "complete" && was !== "complete") dolly(1.05, 450);
      else sync();
    },
    setSelected(p) { selected = p; paint(); invalidate(); },
    setVisible(v) { visible = v; sync(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      renderer.setAnimationLoop(null);
      ro.disconnect();
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      content.clear();
      dyn.forEach((d) => d.dispose());
      owned.forEach((d) => d.dispose());
      dbg?.disposed.push({ geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures });
      dbg?.renderers.delete(dbgId);
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
