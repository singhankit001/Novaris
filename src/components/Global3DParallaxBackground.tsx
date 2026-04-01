"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ASTCluster {
  group: THREE.Group;
  baseX: number;
  baseY: number;
  baseZ: number;
  vx: number;
  vy: number;
  vz: number;
  rotSpeedX: number;
  rotSpeedY: number;
  layerScrollRate: number; // For layered scroll parallax
}

interface CodeStream {
  sprite: THREE.Sprite;
  baseX: number;
  baseY: number;
  baseZ: number;
  speed: number;
}

export default function Global3DParallaxBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Dramatic Studio Lighting Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05050a, 0.018);

    const ambientLight = new THREE.AmbientLight(0x3b82f6, 1.2);
    scene.add(ambientLight);

    const cyanLight = new THREE.DirectionalLight(0x06b6d4, 2.5);
    cyanLight.position.set(20, 30, 20);
    scene.add(cyanLight);

    const purpleLight = new THREE.DirectionalLight(0xa855f7, 2.5);
    purpleLight.position.set(-20, -20, 10);
    scene.add(purpleLight);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 24);

    // 3. High-Performance Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Helper: Create High-Res 3D Canvas Text Sprite
    const createTextSprite = (
      text: string,
      color: string = "#38bdf8",
      bg: string = "rgba(15, 23, 42, 0.88)",
      borderColor: string = "rgba(56, 189, 248, 0.45)"
    ): THREE.Sprite | null => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 110;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.fillStyle = bg;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(16, 16, 480, 78, 16);
      ctx.fill();
      ctx.stroke();

      ctx.font = "bold 28px monospace";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 256, 55);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.92,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(4.8, 1.05, 1);
      return sprite;
    };

    // ==========================================
    // LAYER 1: VAST FICTIONALIZED DATABASE GRID
    // ==========================================
    const bottomGrid = new THREE.GridHelper(180, 90, 0xa855f7, 0x1e1b4b);
    bottomGrid.position.set(0, -16, -15);
    bottomGrid.rotation.x = 0.05;
    scene.add(bottomGrid);

    const topGrid = new THREE.GridHelper(180, 90, 0x06b6d4, 0x0f172a);
    topGrid.position.set(0, 22, -15);
    topGrid.rotation.x = Math.PI - 0.05;
    scene.add(topGrid);

    // Flowing Code Snippet Streams (Layer 1 - Far Background)
    const codeSnippetTexts = [
      "SELECT * FROM ekg_nodes WHERE taint = 'HIGH'",
      "INDEXING ast_call_graph :: 1,482 symbols",
      "FLOW: Source(req.query) -> Sink(db.exec)",
      "EKG_GRAPH: Edge<CALLS_METHOD, AuthController>",
      "ZERO_GRAVITY_ENGINE :: active_workers=64",
      "AST_PARSE: FunctionDecl(verifyToken)",
      "TAINT_FLOW: user_input -> SQL_INJECTION_RISK",
      "SYMBOLS: GraphResolution -> 99.8% hit_rate",
    ];

    const codeStreams: CodeStream[] = [];
    codeSnippetTexts.forEach((snippet, idx) => {
      const sprite = createTextSprite(
        snippet,
        idx % 2 === 0 ? "#22d3ee" : "#c084fc",
        "rgba(9, 9, 11, 0.75)",
        idx % 2 === 0 ? "rgba(34, 211, 238, 0.35)" : "rgba(192, 132, 252, 0.35)"
      );
      if (sprite) {
        const baseX = (idx % 2 === 0 ? -1 : 1) * (15 + Math.random() * 20);
        const baseY = -10 + idx * 3.2;
        const baseZ = -38 + idx * 3;
        sprite.position.set(baseX, baseY, baseZ);
        scene.add(sprite);
        codeStreams.push({
          sprite,
          baseX,
          baseY,
          baseZ,
          speed: (idx % 2 === 0 ? 1 : -1) * (0.015 + Math.random() * 0.015),
        });
      }
    });

    // ==========================================
    // LAYER 1: BREATHING EKG INSTANCED MESH (180 Nodes in 1 Draw Call)
    // ==========================================
    const ekgCount = 180;
    const ekgNodeGeo = new THREE.SphereGeometry(0.26, 16, 16);
    const ekgNodeMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x6b21a8,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });
    const ekgInstancedMesh = new THREE.InstancedMesh(
      ekgNodeGeo,
      ekgNodeMat,
      ekgCount
    );

    const dummyMatrix = new THREE.Object3D();
    const ekgBaseCoords: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < ekgCount; i++) {
      const x = (Math.random() - 0.5) * 85;
      const y = (Math.random() - 0.5) * 45;
      const z = -48 + Math.random() * 35;
      ekgBaseCoords.push({ x, y, z });
      dummyMatrix.position.set(x, y, z);
      dummyMatrix.updateMatrix();
      ekgInstancedMesh.setMatrixAt(i, dummyMatrix.matrix);
    }
    ekgInstancedMesh.instanceMatrix.needsUpdate = true;
    scene.add(ekgInstancedMesh);

    // EKG Connecting Edges (LineSegments)
    const edgePositions: number[] = [];
    for (let i = 0; i < ekgCount - 1; i += 2) {
      const p1 = ekgBaseCoords[i];
      const p2 = ekgBaseCoords[i + 1];
      edgePositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(edgePositions, 3)
    );
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.22,
    });
    const ekgEdges = new THREE.LineSegments(edgeGeo, edgeMat);
    scene.add(ekgEdges);

    // ==========================================
    // LAYER 2: ADVANCED 3D RENDERED ASTs & CALL GRAPHS
    // ==========================================
    const astClusters: ASTCluster[] = [];

    const astDefinitions = [
      {
        title: "AST :: Program Root",
        children: ["FunctionDecl: Auth()", "CallExpr: verifyJWT()", "Return: Session"],
        pos: { x: -14, y: 5, z: -8 },
        color: 0x06b6d4,
      },
      {
        title: "CallGraph :: UserService",
        children: ["DB.Query(users)", "TaintCheck(req.id)", "Cache.Set(token)"],
        pos: { x: 15, y: 2, z: -11 },
        color: 0xa855f7,
      },
      {
        title: "SecurityAST :: TaintFlow",
        children: ["Source: req.query.q", "Sanitizer: NONE", "Sink: sql.exec()"],
        pos: { x: -11, y: -6, z: -14 },
        color: 0xec4899,
      },
      {
        title: "EKG :: DependencyGraph",
        children: ["PrismaSchema", "NextAuthAdapter", "SecurityScanner"],
        pos: { x: 13, y: -7, z: -16 },
        color: 0x3b82f6,
      },
      {
        title: "AST :: FlowAnalyzer",
        children: ["CFG_Block_01", "Branch: if(isAuth)", "SymbolTable"],
        pos: { x: 0, y: 8, z: -20 },
        color: 0x10b981,
      },
    ];

    const nodeBoxGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
    const childSphereGeo = new THREE.OctahedronGeometry(0.75, 0);

    astDefinitions.forEach((def, idx) => {
      const group = new THREE.Group();

      // Root AST Mesh with glowing wireframe
      const rootMat = new THREE.MeshStandardMaterial({
        color: def.color,
        wireframe: true,
        emissive: def.color,
        emissiveIntensity: 0.6,
      });
      const rootMesh = new THREE.Mesh(nodeBoxGeo, rootMat);
      group.add(rootMesh);

      // Title label sprite
      const titleSprite = createTextSprite(
        def.title,
        idx % 2 === 0 ? "#38bdf8" : "#e879f9"
      );
      if (titleSprite) {
        titleSprite.position.set(0, 1.9, 0);
        group.add(titleSprite);
      }

      // Add child AST nodes & connecting call-graph edges
      def.children.forEach((childText, cIdx) => {
        const angle = ((Math.PI * 2) / def.children.length) * cIdx;
        const radius = 3.6;
        const cx = Math.cos(angle) * radius;
        const cy = Math.sin(angle) * radius * 0.7;
        const cz = (cIdx - 1) * 1.2;

        const childMat = new THREE.MeshStandardMaterial({
          color: def.color,
          wireframe: true,
          emissive: def.color,
          emissiveIntensity: 0.4,
        });
        const childMesh = new THREE.Mesh(childSphereGeo, childMat);
        childMesh.position.set(cx, cy, cz);
        group.add(childMesh);

        // Child text sprite
        const childSprite = createTextSprite(
          childText,
          "#cbd5e1",
          "rgba(15, 23, 42, 0.8)",
          "rgba(148, 163, 184, 0.35)"
        );
        if (childSprite) {
          childSprite.scale.set(3.4, 0.75, 1);
          childSprite.position.set(cx, cy - 1.1, cz);
          group.add(childSprite);
        }

        // Connecting edge line
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(cx, cy, cz),
        ]);
        const lineMat = new THREE.LineBasicMaterial({
          color: def.color,
          transparent: true,
          opacity: 0.55,
        });
        const edgeLine = new THREE.Line(lineGeo, lineMat);
        group.add(edgeLine);
      });

      group.position.set(def.pos.x, def.pos.y, def.pos.z);
      scene.add(group);

      astClusters.push({
        group,
        baseX: def.pos.x,
        baseY: def.pos.y,
        baseZ: def.pos.z,
        vx: 0,
        vy: 0,
        vz: 0,
        rotSpeedX: (Math.random() - 0.5) * 0.006,
        rotSpeedY: (Math.random() - 0.5) * 0.008,
        layerScrollRate: 0.65 + idx * 0.12, // Distinct scroll rate per AST cluster
      });
    });

    // ==========================================
    // PARALLAX & SPRING REPULSION PHYSICS
    // ==========================================
    let mouseX = 0;
    let mouseY = 0;
    let targetCamX = 0;
    let targetCamY = 0;
    let targetCamZ = 24;
    let currentScrollY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const normalizedX = (event.clientX / window.innerWidth) * 2 - 1;
      const normalizedY = -(event.clientY / window.innerHeight) * 2 + 1;
      mouseX = normalizedX;
      mouseY = normalizedY;
    };

    const handleScroll = () => {
      currentScrollY = window.scrollY || document.documentElement.scrollTop;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize, { passive: true });

    // ==========================================
    // 60 FPS HIGH-PERFORMANCE ANIMATION LOOP
    // ==========================================
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // 1. Scroll-Driven Camera Fly-Through (Layer 3)
      // Map scrollY directly to camera Z and Y
      const desiredZ = 24 - currentScrollY * 0.022;
      const desiredY = -(currentScrollY * 0.008);
      targetCamZ = desiredZ;
      targetCamY = desiredY;
      targetCamX = mouseX * 4.2;

      // Smooth camera interpolation (lerp)
      camera.position.x += (targetCamX - camera.position.x) * 0.055;
      camera.position.y += (targetCamY + mouseY * 2.5 - camera.position.y) * 0.055;
      camera.position.z += (targetCamZ - camera.position.z) * 0.055;

      camera.lookAt(0, targetCamY * 0.4, -25);

      // 2. Layer 1 Code Streams Drifting
      codeStreams.forEach((cs) => {
        cs.sprite.position.x += cs.speed;
        if (cs.sprite.position.x > 45) cs.sprite.position.x = -45;
        if (cs.sprite.position.x < -45) cs.sprite.position.x = 45;
      });

      // 3. Breathing EKG InstancedMesh Pulse (Layer 1)
      for (let i = 0; i < ekgCount; i++) {
        const coord = ekgBaseCoords[i];
        const breathScale = 1 + 0.18 * Math.sin(elapsedTime * 2 + i);
        dummyMatrix.position.set(
          coord.x,
          coord.y + Math.sin(elapsedTime + i) * 0.5,
          coord.z
        );
        dummyMatrix.scale.set(breathScale, breathScale, breathScale);
        dummyMatrix.updateMatrix();
        ekgInstancedMesh.setMatrixAt(i, dummyMatrix.matrix);
      }
      ekgInstancedMesh.instanceMatrix.needsUpdate = true;

      // 4. Layer 2 AST Clusters: Rotation, Layered Scroll Parallax & Spring Repulsion
      astClusters.forEach((cluster) => {
        // Slow weightless rotation
        cluster.group.rotation.x += cluster.rotSpeedX;
        cluster.group.rotation.y += cluster.rotSpeedY;

        // Layered Scroll Parallax offset
        const layeredScrollOffsetZ =
          currentScrollY * 0.015 * cluster.layerScrollRate;
        const targetZ = cluster.baseZ + layeredScrollOffsetZ;

        // Interactive Spring-Based Repulsion from Mouse Cursor
        // Project cluster world position towards camera space
        const dx = cluster.group.position.x - camera.position.x - mouseX * 8;
        const dy = cluster.group.position.y - camera.position.y - mouseY * 8;
        const distSq = dx * dx + dy * dy;

        if (distSq < 45) {
          const force = (45 - distSq) * 0.006;
          cluster.vx += dx * force;
          cluster.vy += dy * force;
        }

        // Spring damping back to base coordinates
        cluster.vx += (cluster.baseX - cluster.group.position.x) * 0.04;
        cluster.vy += (
          cluster.baseY +
          Math.sin(elapsedTime * 1.3 + cluster.baseX) * 0.8 -
          cluster.group.position.y
        ) * 0.04;
        cluster.vz += (targetZ - cluster.group.position.z) * 0.04;

        cluster.vx *= 0.86;
        cluster.vy *= 0.86;
        cluster.vz *= 0.86;

        cluster.group.position.x += cluster.vx;
        cluster.group.position.y += cluster.vy;
        cluster.group.position.z += cluster.vz;
      });

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);

      // Recursively dispose geometries, materials, and textures to prevent WebGL memory leaks on unmount
      scene.traverse((object: THREE.Object3D) => {
        if (!object) return;
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => mat.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[-1]"
      style={{ background: "#05050a" }}
    />
  );
}
