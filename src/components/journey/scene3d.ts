import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import gsap from "gsap";
import type { SceneModel } from "./model";

export interface SceneOptions {
    container: HTMLElement;
    lowPower: boolean;
    /** Short run for cached data. */
    fast: boolean;
    onContextLost: () => void;
}

export interface SceneHandle {
    setModel(model: SceneModel): void;
    /** Recent commits orbit their repository; owners are node indexes (-1 orbits the core). */
    setCommits(owners: number[]): void;
    /** A milestone landed: light pulse travels out from the core. */
    pulse(): void;
    /** Pull back, settle, resolve when the camera is at rest (about 1s). */
    reveal(): Promise<void>;
    dispose(): void;
}

const IVORY = "#fafaf7";
const BLUE = new THREE.Color("#2f54ff");
const VIOLET = new THREE.Color("#7a4dff");
const CYAN = new THREE.Color("#19b6e6");

const RING_VERT = /* glsl */ `
varying vec2 vP;
void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const RING_FRAG = /* glsl */ `
uniform float uTime; uniform float uOpacity; uniform float uPhase;
uniform vec3 cA; uniform vec3 cB; uniform vec3 cC;
varying vec2 vP;
vec3 cyc(float t){ t = fract(t) * 3.0; if(t < 1.0) return mix(cA,cB,t); if(t < 2.0) return mix(cB,cC,t-1.0); return mix(cC,cA,t-2.0); }
void main(){
  float a = atan(vP.y, vP.x) / 6.28318 + 0.5;
  vec3 col = cyc(a + uTime * 0.07 + uPhase);
  float spark = smoothstep(0.92, 1.0, sin((a + uTime * 0.12) * 18.0 + uPhase * 9.0) * 0.5 + 0.5);
  col = mix(col, vec3(1.0, 0.86, 0.95), spark * 0.45);
  gl_FragColor = vec4(col, uOpacity);
}`;
const HALO_FRAG = /* glsl */ `
uniform float uTime; uniform float uOpacity; uniform float uRadius;
varying vec2 vP;
vec3 holo(float t){ return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67))); }
void main(){
  float r = length(vP);
  float d = abs(r - uRadius);
  float glow = exp(-d * d * 1.6);
  float a = atan(vP.y, vP.x) / 6.28318 + 0.5;
  vec3 col = mix(vec3(0.82, 0.86, 1.0), holo(a + uTime * 0.05), 0.55);
  float inside = smoothstep(uRadius, 0.0, r) * 0.22;
  gl_FragColor = vec4(col, (glow * 0.5 + inside) * uOpacity);
}`;

function dotTexture(): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    if (g) {
        const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.45, "rgba(255,255,255,0.9)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

interface NodeMesh {
    group: THREE.Group;
    radius: number;
    base: THREE.Vector3;
    phase: number;
}
interface LinkState {
    tube: THREE.Mesh;
    samples: THREE.Vector3[];
    progress: { v: number };
    indexCount: number;
    color: THREE.Color;
}

export function mountScene(opts: SceneOptions): SceneHandle {
    const { container, lowPower, fast } = opts;
    const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 2));
    const canvas = renderer.domElement;
    canvas.style.cssText = "display:block;width:100%;height:100%";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(IVORY);
    scene.fog = new THREE.FogExp2(IVORY, lowPower ? 0.03 : 0.024);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 1.05;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d4ff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(4, 8, 6);
    scene.add(key);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 140);
    const cam = { x: 0, y: 0.6, z: 26, lx: 0, ly: 0, lz: 0 };
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let width = 1;
    let height = 1;
    let alive = true;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const resize = (w: number, h: number) => {
        width = Math.max(1, Math.round(w));
        height = Math.max(1, Math.round(h));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        // Narrow screens need a wider field to keep the constellation framed.
        camera.fov = width / height < 0.8 ? 62 : 46;
        camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver((entries) => {
        const r = entries[0]?.contentRect;
        if (r) resize(r.width, r.height);
    });
    ro.observe(container);
    resize(container.clientWidth || 800, container.clientHeight || 600);

    const disposables: { dispose(): void }[] = [envRT];
    const track = <T extends { dispose(): void }>(d: T): T => (disposables.push(d), d);

    /* ---------- grid floor and dust ---------- */
    const grid = new THREE.GridHelper(120, 90, 0xcfd4e4, 0xe3e6ef);
    grid.position.y = -5.2;
    const gridMat = grid.material as THREE.LineBasicMaterial;
    gridMat.transparent = true;
    gridMat.opacity = 0.75;
    track(grid.geometry);
    track(gridMat);
    scene.add(grid);

    const dot = track(dotTexture());
    const dustCount = lowPower ? 140 : 380;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
        dustPos[i * 3] = (Math.random() - 0.5) * 40;
        dustPos[i * 3 + 1] = (Math.random() - 0.5) * 18;
        dustPos[i * 3 + 2] = 14 - Math.random() * 46;
    }
    const dustGeo = track(new THREE.BufferGeometry());
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = track(new THREE.PointsMaterial({ size: 0.11, map: dot, color: 0x8f9bff, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true }));
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    /* ---------- portal rings ---------- */
    const portal = new THREE.Group();
    portal.position.z = 14;
    scene.add(portal);
    const ringUniforms: { uTime: { value: number }; uOpacity: { value: number } }[] = [];
    const ringDefs = [
        { r: 6.4, tube: 0.1, phase: 0 },
        { r: 5.5, tube: 0.045, phase: 0.33 },
        { r: 4.6, tube: 0.07, phase: 0.66 },
        { r: 3.7, tube: 0.035, phase: 0.15 },
    ];
    const rings = ringDefs.map((d) => {
        const geo = track(new THREE.TorusGeometry(d.r, d.tube, 10, lowPower ? 96 : 200));
        const uniforms = {
            uTime: { value: 0 },
            uOpacity: { value: 1 },
            uPhase: { value: d.phase },
            cA: { value: BLUE },
            cB: { value: VIOLET },
            cC: { value: CYAN },
        };
        const mat = track(new THREE.ShaderMaterial({ uniforms, vertexShader: RING_VERT, fragmentShader: RING_FRAG, transparent: true }));
        ringUniforms.push(uniforms);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = (Math.random() - 0.5) * 0.35;
        mesh.rotation.y = (Math.random() - 0.5) * 0.35;
        portal.add(mesh);
        return mesh;
    });
    const haloUniforms = { uTime: { value: 0 }, uOpacity: { value: 1 }, uRadius: { value: 6.0 } };
    const haloGeo = track(new THREE.PlaneGeometry(26, 26));
    const haloMat = track(new THREE.ShaderMaterial({ uniforms: haloUniforms, vertexShader: RING_VERT, fragmentShader: HALO_FRAG, transparent: true, depthWrite: false }));
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.z = -0.4;
    portal.add(halo);

    /* ---------- core crystal ---------- */
    const core = new THREE.Group();
    scene.add(core);
    const crystalMat = (color: string, scale = 1) =>
        track(
            lowPower
                ? new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.18, flatShading: true })
                : new THREE.MeshPhysicalMaterial({ color, metalness: 0.25, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 1, iridescenceIOR: 1.55, iridescenceThicknessRange: [180 * scale, 620 * scale], flatShading: true }),
        );
    const edgeMat = (color: THREE.ColorRepresentation, opacity: number) => track(new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
    const coreGeo = track(new THREE.IcosahedronGeometry(1.15, 1));
    const coreMesh = new THREE.Mesh(coreGeo, crystalMat("#f1f4ff"));
    const coreEdgesGeo = track(new THREE.EdgesGeometry(coreGeo));
    const coreEdges = new THREE.LineSegments(coreEdgesGeo, edgeMat(BLUE, 0.7));
    const innerGeo = track(new THREE.OctahedronGeometry(0.55, 0));
    const inner = new THREE.Mesh(innerGeo, crystalMat("#e7ddff", 0.7));
    const innerEdges = new THREE.LineSegments(track(new THREE.EdgesGeometry(innerGeo)), edgeMat(VIOLET, 0.9));
    core.add(coreMesh, coreEdges, inner, innerEdges);
    core.scale.setScalar(0.001);
    const coreHaloGeo = track(new THREE.TorusGeometry(1.9, 0.014, 8, 120));
    const coreHaloMat = track(new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.5 }));
    const coreHalo = new THREE.Mesh(coreHaloGeo, coreHaloMat);
    coreHalo.rotation.x = Math.PI / 2.4;
    core.add(coreHalo);

    // Milestone pulse: an expanding ring around the core.
    const pulseGeo = track(new THREE.TorusGeometry(1, 0.012, 8, 120));
    const pulseMat = track(new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0 }));
    const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
    pulseMesh.rotation.x = Math.PI / 2.1;
    scene.add(pulseMesh);

    /* ---------- model-driven objects ---------- */
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);
    const nodes: NodeMesh[] = [];
    const links: LinkState[] = [];
    let particles: { points: THREE.Points; link: number[]; offset: Float32Array; speed: Float32Array; pos: Float32Array; col: Float32Array } | null = null;
    let commitMesh: THREE.InstancedMesh | null = null;
    let commitOwners: number[] = [];
    const commitScale = { v: 0 };
    const energy = { v: 1 };
    const settle = { v: 1 };
    let modelSet = false;

    const nodeGeos = [new THREE.OctahedronGeometry(1, 0), new THREE.IcosahedronGeometry(1, 0), new THREE.DodecahedronGeometry(1, 0), new THREE.TetrahedronGeometry(1.15, 0)].map((g) => track(g));
    const tmpColor = new THREE.Color();

    const setModel = (model: SceneModel) => {
        if (modelSet) return;
        modelSet = true;
        const base = new THREE.Vector3(0, 0, 0);
        model.nodes.forEach((nd, i) => {
            const group = new THREE.Group();
            const radius = 0.32 + nd.weight * 0.7;
            const geo = nodeGeos[i % nodeGeos.length];
            const tint = tmpColor.set(nd.color).lerp(new THREE.Color("#ffffff"), 0.4).getStyle();
            const mesh = new THREE.Mesh(geo, crystalMat(tint));
            const edges = new THREE.LineSegments(track(new THREE.EdgesGeometry(geo)), edgeMat(nd.color, 0.85));
            mesh.scale.setScalar(radius);
            edges.scale.setScalar(radius * 1.002);
            group.add(mesh, edges);
            const pos = new THREE.Vector3(...nd.pos);
            group.position.copy(pos);
            group.scale.setScalar(0.001);
            nodeGroup.add(group);
            nodes.push({ group, radius, base: pos, phase: i * 1.7 });
        });

        // Curved pathways: tubes drawn progressively, plus samples for the data-stream particles.
        model.links.forEach((l) => {
            const a = l.from < 0 ? base : (nodes[l.from]?.base ?? base);
            const b = nodes[l.to]?.base;
            if (!b) return;
            const mid = a.clone().lerp(b, 0.5);
            const dir = b.clone().sub(a);
            const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize().multiplyScalar(dir.length() * (l.kind === "core" ? 0.16 : 0.28));
            mid.add(perp);
            const curve = new THREE.CatmullRomCurve3([a, mid, b]);
            const segments = lowPower ? 28 : 56;
            const tubeGeo = track(new THREE.TubeGeometry(curve, segments, l.kind === "core" ? 0.016 : 0.011, 5, false));
            const color = new THREE.Color(model.nodes[l.to]?.color ?? "#2f54ff");
            const tube = new THREE.Mesh(tubeGeo, track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: l.kind === "core" ? 0.55 : 0.4 })));
            const indexCount = tubeGeo.index ? tubeGeo.index.count : 0;
            tubeGeo.setDrawRange(0, 0);
            scene.add(tube);
            links.push({ tube, samples: curve.getPoints(120), progress: { v: 0 }, indexCount, color });
        });

        const perLink = lowPower ? 2 : 4;
        const count = links.length * perLink;
        if (count > 0) {
            const pos = new Float32Array(count * 3);
            const col = new Float32Array(count * 3);
            const owner: number[] = [];
            const offset = new Float32Array(count);
            const speed = new Float32Array(count);
            for (let i = 0; i < count; i++) {
                const li = Math.floor(i / perLink);
                owner.push(li);
                offset[i] = Math.random();
                speed[i] = 0.12 + Math.random() * 0.14;
                const c = links[li].color;
                col[i * 3] = c.r;
                col[i * 3 + 1] = c.g;
                col[i * 3 + 2] = c.b;
            }
            const geo = track(new THREE.BufferGeometry());
            geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
            geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
            const mat = track(new THREE.PointsMaterial({ size: 0.2, map: dot, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
            const points = new THREE.Points(geo, mat);
            points.frustumCulled = false;
            scene.add(points);
            particles = { points, link: owner, offset, speed, pos, col };
        }

        // Materialise: crystals scale up, pathways draw outward.
        const stagger = Math.min(0.09, 0.9 / Math.max(1, nodes.length));
        nodes.forEach((n, i) => {
            gsap.to(n.group.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: "back.out(1.6)", delay: 0.05 + i * stagger });
        });
        links.forEach((l, i) => {
            const segs = 56;
            gsap.to(l.progress, {
                v: 1,
                duration: 0.8,
                ease: "power2.out",
                delay: 0.12 + i * Math.min(0.05, 0.8 / Math.max(1, links.length)),
                onUpdate: () => {
                    const s = lowPower ? 28 : segs;
                    l.tube.geometry.setDrawRange(0, Math.floor(l.progress.v * s) * 30 > l.indexCount ? l.indexCount : Math.floor(l.progress.v * s) * 30);
                },
            });
        });

        startTour();
    };


    const setCommits = (owners: number[]) => {
        if (commitMesh || owners.length === 0) return;
        commitOwners = owners.slice();
        const cGeo = track(new THREE.IcosahedronGeometry(0.085, 0));
        const cMat = track(new THREE.MeshBasicMaterial({ color: 0xffffff }));
        commitMesh = new THREE.InstancedMesh(cGeo, cMat, commitOwners.length);
        commitMesh.frustumCulled = false;
        commitOwners.forEach((_, i) => commitMesh?.setColorAt(i, tmpColor.set(i % 2 ? "#7a4dff" : "#19b6e6")));
        scene.add(commitMesh);
        gsap.to(commitScale, { v: 1, duration: 0.8, ease: "back.out(2)" });
    };

    /* ---------- camera ---------- */
    let introDone = false;
    const introTl = gsap.timeline({ onComplete: () => (introDone = true) });
    const D = fast ? 1.0 : 2.6;
    introTl
        .to(cam, { z: 8.2, y: 0.4, duration: D, ease: "power3.inOut" }, 0)
        .to(core.scale, { x: 1, y: 1, z: 1, duration: D * 0.5, ease: "back.out(1.4)" }, D * 0.55)
        .to(portal.scale, { x: 2.6, y: 2.6, z: 2.6, duration: D * 0.5, ease: "power2.in" }, D * 0.55)
        .to([...ringUniforms.map((u) => u.uOpacity), haloUniforms.uOpacity], { value: 0, duration: D * 0.4, ease: "power1.in" }, D * 0.62);

    const tourState = { active: false };
    function startTour() {
        const begin = () => {
            if (!alive) return;
            tourState.active = true;
            const picks = nodes.length > 0 ? nodes : [];
            const tl = gsap.timeline({ defaults: { ease: "sine.inOut" } });
            // Fly between nodes along the corridor; reveal() interrupts whenever the data is complete.
            picks.forEach((n, i) => {
                const side = i % 2 === 0 ? 1 : -1;
                const stop = fast ? 0.45 : 0.9;
                tl.to(cam, { x: n.base.x * 0.45 + side * 1.1, y: n.base.y * 0.45 + 0.5, z: n.base.z + 6.2, duration: stop, overwrite: "auto" }, i * stop * 0.92);
                tl.to(cam, { lx: n.base.x * 0.7, ly: n.base.y * 0.7, lz: n.base.z, duration: stop, overwrite: "auto" }, i * stop * 0.92);
            });
        };
        if (introDone) begin();
        else {
            // Data landed while the portal flight is still running: finish the flight quickly, then travel.
            const remaining = Math.max(0.01, introTl.duration() - introTl.time());
            introTl.timeScale(Math.max(1, remaining / 0.5));
            introTl.eventCallback("onComplete", () => {
                introDone = true;
                begin();
            });
        }
    }

    /* ---------- frame loop ---------- */
    const timer = new THREE.Timer();
    const tmpMat = new THREE.Matrix4();
    const tmpPos = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const tmpScale = new THREE.Vector3();
    const tmpEuler = new THREE.Euler();

    const frame = () => {
        timer.update();
        const dt = Math.min(timer.getDelta(), 0.05);
        const t = timer.getElapsed();
        for (const u of ringUniforms) u.uTime.value = t;
        haloUniforms.uTime.value = t;
        rings.forEach((r, i) => {
            r.rotation.z += dt * (0.12 + i * 0.05) * (i % 2 ? -1 : 1);
        });
        core.rotation.y += dt * 0.35;
        inner.rotation.x -= dt * 0.8;
        innerEdges.rotation.x = inner.rotation.x;
        coreHalo.rotation.z += dt * 0.4;
        dust.rotation.y = Math.sin(t * 0.05) * 0.05;
        dust.position.y = Math.sin(t * 0.2) * 0.2;

        pointer.x += (pointer.tx - pointer.x) * 0.06;
        pointer.y += (pointer.ty - pointer.y) * 0.06;
        const sway = tourState.active ? 0 : Math.sin(t * 0.25) * 0.35;
        camera.position.set(cam.x + pointer.x * 0.7 + sway, cam.y + pointer.y * 0.45 + Math.sin(t * 0.4) * 0.06, cam.z);
        camera.lookAt(cam.lx, cam.ly, cam.lz);

        nodes.forEach((n) => {
            const bob = Math.sin(t * 0.7 + n.phase) * 0.12 * settle.v;
            n.group.position.set(n.base.x, n.base.y + bob, n.base.z);
            n.group.rotation.y += dt * 0.25;
            n.group.rotation.x += dt * 0.12;
        });

        if (particles) {
            const { pos, link, offset, speed } = particles;
            for (let i = 0; i < link.length; i++) {
                const l = links[link[i]];
                const ready = l.progress.v > 0.98;
                if (!ready) {
                    pos[i * 3 + 1] = -999;
                    continue;
                }
                const u = (offset[i] + t * speed[i] * energy.v) % 1;
                const s = l.samples[Math.floor(u * (l.samples.length - 1))];
                if (s) {
                    pos[i * 3] = s.x;
                    pos[i * 3 + 1] = s.y;
                    pos[i * 3 + 2] = s.z;
                }
            }
            (particles.points.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
        }

        if (commitMesh) {
            for (let i = 0; i < commitOwners.length; i++) {
                const owner = commitOwners[i];
                const n = owner >= 0 ? nodes[owner] : undefined;
                const cx = n ? n.base.x : 0;
                const cy = n ? n.base.y : 0;
                const cz = n ? n.base.z : 0;
                const orbit = (n ? n.radius : 1.2) + 0.5 + (i % 3) * 0.14;
                const a = t * (0.6 + (i % 4) * 0.12) + i * 2.1;
                tmpPos.set(cx + Math.cos(a) * orbit, cy + Math.sin(a * 0.8) * orbit * 0.5, cz + Math.sin(a) * orbit);
                tmpScale.setScalar(Math.max(0.0001, commitScale.v));
                tmpEuler.set(a, a * 0.5, 0);
                tmpQuat.setFromEuler(tmpEuler);
                tmpMat.compose(tmpPos, tmpQuat, tmpScale);
                commitMesh.setMatrixAt(i, tmpMat);
            }
            commitMesh.instanceMatrix.needsUpdate = true;
        }

        renderer.render(scene, camera);
    };

    const startLoop = () => renderer.setAnimationLoop(frame);
    startLoop();

    const onVisibility = () => {
        if (document.hidden) renderer.setAnimationLoop(null);
        else {
            timer.update();
            startLoop();
        }
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onMove = (e: PointerEvent) => {
        pointer.tx = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
        pointer.ty = -(e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };
    if (finePointer) window.addEventListener("pointermove", onMove, { passive: true });
    const onLost = (e: Event) => {
        e.preventDefault();
        opts.onContextLost();
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return {
        setModel,
        setCommits,
        pulse() {
            pulseMesh.scale.setScalar(1.6);
            pulseMat.opacity = 0.7;
            gsap.to(pulseMesh.scale, { x: 7, y: 7, z: 7, duration: 1.1, ease: "power2.out", overwrite: true });
            gsap.to(pulseMat, { opacity: 0, duration: 1.1, ease: "power1.in" });
            gsap.fromTo(energy, { v: 3 }, { v: 1, duration: 1.4, ease: "power2.out" });
        },
        reveal() {
            return new Promise<void>((resolve) => {
                introTl.timeScale(8);
                gsap.killTweensOf(cam);
                tourState.active = false;
                const wide = nodes.length > 0;
                const midZ = nodes.length ? nodes[Math.floor(nodes.length / 2)].base.z : 0;
                gsap
                    .timeline({ onComplete: () => resolve() })
                    .to(cam, { x: wide ? 11 : 0, y: wide ? 6.5 : 1.4, z: wide ? midZ + 19 : 13, lx: 0, ly: 0, lz: wide ? midZ : 0, duration: 1.05, ease: "power3.inOut" }, 0)
                    .to(settle, { v: 0.3, duration: 1.05 }, 0)
                    .to(commitScale, { v: 1, duration: 0.6 }, 0);
            });
        },
        dispose() {
            alive = false;
            renderer.setAnimationLoop(null);
            gsap.killTweensOf([cam, settle, energy, commitScale, pulseMesh.scale, pulseMat, portal.scale, core.scale, ...ringUniforms.map((u) => u.uOpacity), haloUniforms]);
            introTl.kill();
            nodes.forEach((n) => gsap.killTweensOf(n.group.scale));
            links.forEach((l) => gsap.killTweensOf(l.progress));
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("webglcontextlost", onLost);
            ro.disconnect();
            for (const d of disposables) d.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
            canvas.remove();
        },
    };
}
