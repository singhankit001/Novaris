"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/components/fx/use-reduced-motion";
import { GlobeFallback } from "./globe-fallback";
import { hasWebGL, visibleLoop } from "./shared";

/** three.js scene for Globe. Default export so next/dynamic can split it. */

// Illustrative hub points (lat, lon). Not user locations.
const HUBS: [number, number][] = [
  [37.8, -122.4],
  [40.7, -74],
  [51.5, -0.1],
  [52.5, 13.4],
  [19.1, 72.9],
  [1.35, 103.8],
  [35.7, 139.7],
  [-23.5, -46.6],
  [-33.9, 151.2],
];
const ARCS: [number, number][] = [[0, 2], [1, 3], [2, 4], [4, 6], [5, 8], [1, 7], [3, 5], [0, 6]];
const R = 1;

const toVec = (lat: number, lon: number, r = R) => {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
};

export default function GlobeCanvas() {
  const host = useRef<HTMLDivElement>(null);
  const fb = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (!hasWebGL()) return; // fallback stays visible
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    el.appendChild(renderer.domElement);
    const fbEl = fb.current;
    if (fbEl) fbEl.hidden = true;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
    camera.position.set(0, 0.25, 4.6);
    camera.lookAt(0, 0, 0);
    const globe = new THREE.Group();
    globe.rotation.z = 0.2;
    scene.add(globe);

    // Fibonacci-sphere dots on a white core (core hides back-facing dots)
    const N = 2200;
    const pos = new Float32Array(N * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rr = Math.sqrt(1 - y * y);
      const a = golden * i;
      pos.set([Math.cos(a) * rr * R, y * R, Math.sin(a) * rr * R], i * 3);
    }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const dotMat = new THREE.PointsMaterial({ color: 0x7d8496, size: 0.026, sizeAttenuation: true });
    globe.add(new THREE.Points(dotGeo, dotMat));
    const coreGeo = new THREE.SphereGeometry(R * 0.985, 48, 32);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    globe.add(new THREE.Mesh(coreGeo, coreMat));

    // Hubs + arcs
    const hubGeo = new THREE.SphereGeometry(0.018, 12, 8);
    const hubMat = new THREE.MeshBasicMaterial({ color: 0x2f54ff });
    for (const [la, lo] of HUBS) {
      const m = new THREE.Mesh(hubGeo, hubMat);
      m.position.copy(toVec(la, lo, R * 1.005));
      globe.add(m);
    }
    const arcs: { line: THREE.Line; count: number; geo: THREE.BufferGeometry }[] = [];
    const arcMats = [new THREE.LineBasicMaterial({ color: 0x2f54ff }), new THREE.LineBasicMaterial({ color: 0x7a4dff })];
    ARCS.forEach(([a, b], i) => {
      const [la1, lo1] = HUBS[a] ?? [0, 0];
      const [la2, lo2] = HUBS[b] ?? [0, 0];
      const p1 = toVec(la1, lo1);
      const p2 = toVec(la2, lo2);
      const mid = p1.clone().add(p2).multiplyScalar(0.5).normalize().multiplyScalar(R + p1.distanceTo(p2) * 0.16);
      const pts = new THREE.QuadraticBezierCurve3(p1, mid, p2).getPoints(48);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, arcMats[i % 2]);
      geo.setDrawRange(0, reduced ? pts.length : 0);
      globe.add(line);
      arcs.push({ line, count: pts.length, geo });
    });

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let loop: ReturnType<typeof visibleLoop> | null = null;
    if (!reduced) {
      const t0 = performance.now();
      let last = t0;
      loop = visibleLoop(el, (t) => {
        const dt = Math.min(t - last, 50);
        last = t;
        globe.rotation.y += dt * 0.00009;
        const elapsed = (t - t0) / 1000;
        arcs.forEach((a, i) => {
          // draw in, hold, repeat
          const cycle = (elapsed * 0.35 + i * 0.37) % 2.4;
          const p = cycle < 1 ? cycle : 1;
          a.geo.setDrawRange(0, Math.floor(p * a.count));
        });
        renderer.render(scene, camera);
      });
    }

    return () => {
      loop?.stop();
      ro.disconnect();
      for (const a of arcs) a.geo.dispose();
      for (const d of [dotGeo, dotMat, coreGeo, coreMat, hubGeo, hubMat, ...arcMats]) d.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      if (fbEl) fbEl.hidden = false;
    };
  }, [reduced]);

  return (
    <>
      <div ref={fb} className="absolute inset-0">
        <GlobeFallback />
      </div>
      <div ref={host} className="absolute inset-0" />
    </>
  );
}
