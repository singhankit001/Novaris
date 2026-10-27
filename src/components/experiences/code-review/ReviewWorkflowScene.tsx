"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { visibleLoop } from "@/components/fx/scene/shared";
import { buildStages, type StageRig } from "./workflow-rigs";

/** Six illustrated stages laid along a lit path; the camera glides to `active`. Renders on demand only. */
export default function ReviewWorkflowScene({ active, reducedMotion, onError }: { active: number; reducedMotion: boolean; onError: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ setActive: (i: number) => void } | null>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    const start = () => {
      if (disposed) return;
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        onError();
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);
      // Bright, soft studio light so white reads as white; no environment map is needed.
      scene.add(new THREE.HemisphereLight(0xffffff, 0xe9edf6, 2.6));
      const sun = new THREE.DirectionalLight(0xffffff, 2.2);
      sun.position.set(5, 9, 7);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0xffffff, 1.1);
      fill.position.set(0, 2, 10);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xb8c4ff, 0.6);
      rim.position.set(-6, 3, -5);
      scene.add(rim);

      const rigs: StageRig[] = buildStages(scene);
      const n = rigs.length;

      // The path: a thin silver rail through every stage, with a blue overlay drawn up to the active stage.
      const points = rigs.map((r) => r.anchor.clone().add(new THREE.Vector3(0, -0.02, 1.25)));
      const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
      const tubeGeo = new THREE.TubeGeometry(curve, 360, 0.022, 8, false);
      scene.add(new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color: 0xd5d9e3, roughness: 0.4, metalness: 0.5 })));
      const litGeo = new THREE.TubeGeometry(curve, 360, 0.03, 8, false);
      const lit = new THREE.Mesh(litGeo, new THREE.MeshBasicMaterial({ color: 0x2f54ff }));
      scene.add(lit);
      const lengths = curve.getLengths(1200);
      const total = lengths[lengths.length - 1] || 1;
      const stageU = rigs.map((_, i) => (lengths[Math.round((i / (n - 1)) * 1200)] ?? total) / total);
      const litCount = litGeo.index ? litGeo.index.count : 0;
      const nodeGeo = new THREE.SphereGeometry(0.09, 20, 14);
      const nodes = points.map((p) => {
        const m = new THREE.Mesh(nodeGeo, new THREE.MeshStandardMaterial({ color: 0xc9cfdc, roughness: 0.35, metalness: 0.3 }));
        m.position.copy(p);
        scene.add(m);
        return m;
      });

      // Sparse particles that drift with the camera target.
      const pGeo = new THREE.BufferGeometry();
      const pCount = 70;
      const pPos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        const a = Math.sin(i * 12.9898) * 43758.5453;
        const b = Math.sin(i * 78.233) * 12543.123;
        const c = Math.sin(i * 39.425) * 24634.634;
        pPos[i * 3] = (a - Math.floor(a) - 0.5) * 9;
        pPos[i * 3 + 1] = (b - Math.floor(b)) * 3.6 - 0.2;
        pPos[i * 3 + 2] = (c - Math.floor(c) - 0.5) * 4;
      }
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x7a4dff, size: 0.035, transparent: true, opacity: 0.45, depthWrite: false }));
      scene.add(particles);

      const camPos = new THREE.Vector3();
      const camLook = new THREE.Vector3();
      const wantPos = new THREE.Vector3();
      const wantLook = new THREE.Vector3();
      const pointer = new THREE.Vector2();
      let narrow = false;
      let progress = stageU[activeRef.current] ?? 0;
      let busyUntil = 0;
      let clock = 0;
      let last = 0;

      const aim = (i: number) => {
        const a = rigs[i]?.anchor ?? new THREE.Vector3();
        const dist = narrow ? 1.45 : 1;
        wantLook.copy(a).add(new THREE.Vector3(0, 0.95, 0));
        wantPos.copy(a).add(new THREE.Vector3(0.6 * dist + pointer.x * 0.35, 2.4 * dist - pointer.y * 0.2, 7.4 * dist));
      };

      const resize = () => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        camera.aspect = w / h;
        narrow = camera.aspect < 1.05;
        camera.updateProjectionMatrix();
        aim(activeRef.current);
      };

      const step = (now: number) => {
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
        last = now;
        const idx = activeRef.current;
        const still = reducedMotion;
        if (!still) clock += dt;
        const ease = still ? 1 : 1 - Math.exp(-dt * 3.2);

        camPos.lerp(wantPos, ease);
        camLook.lerp(wantLook, ease);
        camera.position.copy(camPos);
        camera.lookAt(camLook);

        const targetU = stageU[idx] ?? 0;
        progress += (targetU - progress) * (still ? 1 : 1 - Math.exp(-dt * 2.6));
        lit.geometry.setDrawRange(0, Math.floor((litCount * Math.max(0.001, progress)) / 6) * 6);
        nodes.forEach((m, i) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          mat.color.setHex(i <= idx ? 0x2f54ff : 0xc9cfdc);
          m.scale.setScalar(i === idx ? 1.25 : 0.85);
        });
        rigs.forEach((r, i) => r.update(clock, dt, i === idx, still));
        particles.position.lerp(rigs[idx]?.anchor ?? particles.position, ease);
        if (!still) particles.rotation.y = clock * 0.03;

        renderer.render(scene, camera);
        const settled = camPos.distanceTo(wantPos) < 0.003 && Math.abs(targetU - progress) < 0.0005;
        if (still) return false;
        return !(settled && now > busyUntil);
      };

      const loop = visibleLoop(host, step, "150px");
      const wake = (ms: number) => {
        busyUntil = Math.max(busyUntil, performance.now() + ms);
        last = 0;
        loop.wake();
      };

      apiRef.current = {
        setActive: (i) => {
          activeRef.current = i;
          aim(i);
          wake(6000);
        },
      };

      const ro = new ResizeObserver(() => {
        resize();
        wake(200);
      });
      ro.observe(host);
      resize();
      aim(activeRef.current);
      camPos.copy(wantPos);
      camLook.copy(wantLook);
      wake(6000);

      const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const onMove = (e: PointerEvent) => {
        const r = host.getBoundingClientRect();
        pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
        aim(activeRef.current);
        wake(1500);
      };
      if (fine && !reducedMotion) host.addEventListener("pointermove", onMove);

      const onLost = (e: Event) => {
        e.preventDefault();
        onError();
      };
      renderer.domElement.addEventListener("webglcontextlost", onLost);

      cleanup = () => {
        loop.stop();
        ro.disconnect();
        host.removeEventListener("pointermove", onMove);
        renderer.domElement.removeEventListener("webglcontextlost", onLost);
        scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
          for (const m of mats) {
            (m as THREE.MeshBasicMaterial).map?.dispose();
            m.dispose();
          }
        });
        renderer.dispose();
        renderer.domElement.remove();
        apiRef.current = null;
      };
    };

    // Labels are drawn into canvas textures, so wait for the site fonts first.
    void document.fonts.ready.then(start);
    return () => {
      disposed = true;
      cleanup();
    };
  }, [reducedMotion, onError]);

  useEffect(() => {
    activeRef.current = active;
    apiRef.current?.setActive(active);
  }, [active]);

  return <div ref={hostRef} aria-hidden className="absolute inset-0" />;
}
