"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // Defer heavy Three.js init until the browser is idle — keeps TBT low
    const idleCb = "requestIdleCallback" in window
      ? (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
          .requestIdleCallback(() => init(), { timeout: 2000 })
      : setTimeout(() => init(), 200);

    let cleanupFn: (() => void) | undefined;

    function init() {
    if (!el) return;
    const W = el.clientWidth || window.innerWidth;
    const H = el.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();

    // Atmospheric fog — layered depth haze
    scene.fog = new THREE.FogExp2(0x8fbcd4, 0.016);

    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 120);
    camera.position.set(0, 2.2, 10);
    camera.lookAt(0, -0.2, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    el.appendChild(renderer.domElement);

    const disposables: { dispose: () => void }[] = [];

    // ── Lighting: golden-hour / dawn atmosphere ────────────────
    const hemi = new THREE.HemisphereLight(0xb8d4f0, 0x3d2010, 0.7);
    scene.add(hemi);

    // Main sun — warm golden directional
    const sun = new THREE.DirectionalLight(0xffd580, 3.2);
    sun.position.set(10, 18, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -15;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    // Sky fill — cool blue from top
    const skyFill = new THREE.DirectionalLight(0x4a90d8, 0.65);
    skyFill.position.set(-8, 12, -6);
    scene.add(skyFill);

    // Horizon glow — warm amber
    const horizonGlow = new THREE.DirectionalLight(0xff8040, 0.55);
    horizonGlow.position.set(3, -4, 10);
    scene.add(horizonGlow);

    // Rim / backlight from behind peaks
    const rimLight = new THREE.DirectionalLight(0x1a2840, 0.4);
    rimLight.position.set(-6, 4, -14);
    scene.add(rimLight);

    // ── Material factory ──────────────────────────────────────
    function mkMat(color: number, rough: number, metal: number, opacity = 1) {
      const m = new THREE.MeshStandardMaterial({
        color,
        roughness: rough,
        metalness: metal,
        transparent: opacity < 1,
        opacity,
      });
      disposables.push(m);
      return m;
    }

    // ── Mountain geometry factory ────────────────────────────
    function addPeak(
      group: THREE.Group,
      x: number, z: number,
      h: number, r: number, sides: number,
      mat: THREE.MeshStandardMaterial,
      capOpacity = 0,
    ) {
      const geo = new THREE.ConeGeometry(r, h, sides, 5);
      disposables.push(geo);

      // Strong vertex perturbation for jagged alpine look
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const frac = (y + h / 2) / h; // 0 = base, 1 = peak
        const strength = (1.0 - frac) * r * 0.32;
        if (frac < 0.88) {
          pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * strength);
          pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * strength);
          pos.setY(i, y + (Math.random() - 0.5) * h * 0.04);
        }
      }
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, -3.8 + h / 2, z);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Snow cap — thicker, more realistic
      if (capOpacity > 0 && h > 4) {
        const capH = h * 0.28;
        const capGeo = new THREE.ConeGeometry(r * 0.38, capH, sides, 3);
        disposables.push(capGeo);
        // Perturb snow cap edges slightly
        const cpos = capGeo.attributes.position;
        for (let i = 0; i < cpos.count; i++) {
          const cy = cpos.getY(i);
          if (cy < capH * 0.3) {
            cpos.setX(i, cpos.getX(i) + (Math.random() - 0.5) * r * 0.14);
            cpos.setZ(i, cpos.getZ(i) + (Math.random() - 0.5) * r * 0.14);
          }
        }
        capGeo.computeVertexNormals();
        const capMat = mkMat(0xf0f6ff, 0.70, 0.0, Math.min(capOpacity + 0.08, 1.0));
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(x, -3.8 + h - capH * 0.32, z);
        cap.rotation.y = Math.random() * Math.PI * 2;
        cap.castShadow = true;
        group.add(cap);

        // Snow specular sheen overlay
        const sheenGeo = new THREE.ConeGeometry(r * 0.18, capH * 0.55, sides, 2);
        disposables.push(sheenGeo);
        const sheenMat = mkMat(0xffffff, 0.30, 0.05, 0.55);
        const sheen = new THREE.Mesh(sheenGeo, sheenMat);
        sheen.position.set(x + r * 0.05, -3.8 + h + capH * 0.08, z - r * 0.05);
        group.add(sheen);
      }
    }

    // ── Ghost/haze mountains — extreme distance ────────────────
    const ghostMat = mkMat(0x9ab8cc, 0.95, 0.0, 0.30);
    const ghostMtns = new THREE.Group();
    [
      [-20, 12.0, 4.5, 7], [-8, 14.5, 5.0, 8], [2, 16.0, 5.5, 8],
      [12, 13.0, 4.8, 7],  [22, 11.0, 4.2, 7], [-30, 10.5, 4.0, 7],
    ].forEach(([x, h, r, s]) => addPeak(ghostMtns, x, -18, h, r, s, ghostMat, 0.0));
    scene.add(ghostMtns);

    // ── Far mountains: atmospheric blue-gray ──────────────────
    const farMat = mkMat(0x6a8eac, 0.90, 0.04, 0.60);
    const farMtns = new THREE.Group();
    [
      [-14, 9.0,  3.4, 9], [-7.5, 11.5, 3.8, 10], [-1.5, 13.5, 4.2, 10],
      [ 5,  10.0, 3.6, 9], [  10,  8.0,  3.0, 9],  [ 15,  7.0,  2.8, 8],
      [-20,  7.5,  3.0, 8], [19.5,  7.8,  3.1, 8],
    ].forEach(([x, h, r, s]) => addPeak(farMtns, x, -12, h, r, s, farMat, 0.52));
    scene.add(farMtns);

    // ── Mid mountains: muted slate-green ──────────────────────
    const midMat = mkMat(0x2e4838, 0.88, 0.05, 0.90);
    const midMtns = new THREE.Group();
    [
      [-15, 7.0, 2.8, 10], [-9.5, 8.8, 3.2, 11], [-4,  8.0,  3.0, 10],
      [  2, 9.5, 3.5, 11], [7.5,  7.5, 2.8, 10],  [ 13, 6.5,  2.6, 9],
      [-20,  6.0, 2.5, 9], [17.0,  7.0, 2.7, 10],
    ].forEach(([x, h, r, s]) => addPeak(midMtns, x, -6, h, r, s, midMat, 0.65));
    scene.add(midMtns);

    // ── Near mountains: dark forest ───────────────────────────
    const nearMat = mkMat(0x182820, 0.95, 0.02, 1.0);
    const nearMtns = new THREE.Group();
    [
      [-16, 5.5, 2.8, 10], [-10.5, 6.5, 3.0, 11], [-5.5, 5.0, 2.5, 10],
      [  1, 7.0, 3.2, 11], [  6,   5.2, 2.6, 10],  [ 11, 6.0, 2.8, 11],
      [ 15, 5.0, 2.5, 10], [-21,   5.0, 2.5, 10],
    ].forEach(([x, h, r, s]) => addPeak(nearMtns, x, -2, h, r, s, nearMat, 0.0));
    scene.add(nearMtns);

    // ── Ground plane (foothills) ──────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(80, 30, 40, 20);
    disposables.push(groundGeo);
    const gPos = groundGeo.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      const x = gPos.getX(i);
      const z = gPos.getZ(i);
      const bump = Math.sin(x * 0.3) * 0.3 + Math.cos(z * 0.5) * 0.2 + (Math.random() - 0.5) * 0.15;
      gPos.setY(i, bump);
    }
    groundGeo.computeVertexNormals();
    const groundMat = mkMat(0x1e2f1c, 0.98, 0.0);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -3.85, 0);
    ground.receiveShadow = true;
    scene.add(ground);

    // ── Stars — sparse, dawn-sky look ─────────────────────────
    const starCount = 80;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3]     = (Math.random() - 0.5) * 80;
      starPos[i * 3 + 1] = 5 + Math.random() * 18;
      starPos[i * 3 + 2] = -22 + Math.random() * 4;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    disposables.push(starGeo);
    const starMat = new THREE.PointsMaterial({ color: 0xfff8e8, size: 0.05, transparent: true, opacity: 0.35 });
    disposables.push(starMat);
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Clouds ────────────────────────────────────────────────
    // Main cloud body — warm cream white
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xfff8f0,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88,
    });
    disposables.push(cloudMat);

    // Slightly cooler underside for visual depth
    const cloudBaseMat = new THREE.MeshStandardMaterial({
      color: 0xd8e8f0,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.72,
    });
    disposables.push(cloudBaseMat);

    // [dx, dy, dz, scale, useBaseMat]
    const puffDefs: [number, number, number, number, boolean][] = [
      [0, 0, 0, 1.0, false],
      [-0.72, -0.18, 0.1, 0.74, true],
      [0.74, -0.14, 0.1, 0.70, true],
      [-1.32, -0.32, 0.2, 0.52, true],
      [1.28, -0.26, 0.2, 0.50, true],
      [0.28, 0.36, 0, 0.60, false],
      [-0.26, 0.32, 0, 0.56, false],
      [0.96, 0.26, 0.05, 0.46, false],
      [-0.94, 0.22, 0.05, 0.44, false],
      [0.0, 0.65, 0, 0.50, false],
      [-0.48, 0.52, 0.05, 0.42, false],
      [0.52, 0.54, 0.05, 0.44, false],
      [-1.58, -0.12, 0.15, 0.40, true],
      [1.52, -0.10, 0.15, 0.38, true],
    ];

    interface CloudData { group: THREE.Group; startX: number; speed: number; baseY: number; phase: number; }
    const WRAP = 28;

    function makeCloud(x: number, y: number, z: number, sc: number): THREE.Group {
      const cg = new THREE.Group();
      puffDefs.forEach(([dx, dy, dz, s, useBase]) => {
        const g = new THREE.SphereGeometry(s * sc, 10, 7);
        disposables.push(g);
        const m = new THREE.Mesh(g, useBase ? cloudBaseMat : cloudMat);
        m.position.set(dx * sc, dy * sc, dz * sc);
        m.scale.y = 0.62;
        cg.add(m);
      });
      cg.position.set(x, y, z);
      return cg;
    }

    const cloudDefs = [
      { x: -9,  y: 4.5, z: -8.0, sc: 1.20, speed: 0.36 },
      { x:  5,  y: 5.2, z: -8.0, sc: 0.90, speed: 0.28 },
      { x: 16,  y: 4.8, z: -8.0, sc: 1.40, speed: 0.24 },
      { x: -22, y: 5.0, z: -8.0, sc: 1.10, speed: 0.32 },
      { x: -16, y: 3.6, z: -4.5, sc: 0.95, speed: 0.48 },
      { x:  8,  y: 3.9, z: -4.5, sc: 0.80, speed: 0.44 },
      { x: 19,  y: 3.3, z: -4.5, sc: 1.05, speed: 0.40 },
      { x: -30, y: 3.7, z: -4.5, sc: 0.88, speed: 0.46 },
      { x: -5,  y: 2.8, z: -2.2, sc: 0.65, speed: 0.60 },
      { x: 12,  y: 2.5, z: -2.2, sc: 0.76, speed: 0.56 },
    ];

    const clouds: CloudData[] = cloudDefs.map(c => {
      const group = makeCloud(c.x, c.y, c.z, c.sc);
      scene.add(group);
      return { group, startX: c.x, speed: c.speed, baseY: c.y, phase: Math.random() * Math.PI * 2 };
    });

    // ── Background birds (far away scene dressing) ────────────
    interface SceneBird {
      group: THREE.Group;
      x: number;
      y: number;
      z: number;
      speed: number;
      flapPhase: number;
      wingL: THREE.Mesh;
      wingR: THREE.Mesh;
    }

    const birdMat = new THREE.MeshStandardMaterial({ color: 0x0d1117, roughness: 1, metalness: 0, transparent: true, opacity: 0.75 });
    disposables.push(birdMat);

    function makeSceneBird(x: number, y: number, z: number, speed: number, phase: number): SceneBird {
      const g = new THREE.Group();

      // Body
      const bodyGeo = new THREE.SphereGeometry(0.12, 6, 4);
      bodyGeo.scale(2.2, 0.7, 1.0);
      disposables.push(bodyGeo);
      const body = new THREE.Mesh(bodyGeo, birdMat);
      g.add(body);

      // Wings as flat quads
      const wingGeo = new THREE.PlaneGeometry(0.55, 0.15);
      disposables.push(wingGeo);
      const wingL = new THREE.Mesh(wingGeo, birdMat);
      wingL.position.set(-0.35, 0, 0);
      g.add(wingL);

      const wingR = wingL.clone();
      wingR.position.set(0.35, 0, 0);
      g.add(wingR);

      g.position.set(x, y, z);
      scene.add(g);
      return { group: g, x, y, z, speed, flapPhase: phase, wingL, wingR };
    }

    const sceneBirds: SceneBird[] = [
      makeSceneBird(-6,  3.8, -6.5, 0.55, 0.0),
      makeSceneBird(-5,  4.0, -6.5, 0.55, 0.4),
      makeSceneBird(-4.2,3.7, -6.5, 0.62, 0.8),
      makeSceneBird( 8,  3.4, -5.5, 0.42, 1.2),
      makeSceneBird( 8.7,3.6, -5.5, 0.42, 1.6),
      makeSceneBird(-12, 4.2, -7.5, 0.30, 0.5),
    ];

    // Mouse parallax
    let mx = 0, my = 0, tx = 0, ty = 0;
    const onMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);

    const clock = new THREE.Clock();
    let raf: number;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();

      tx += (mx - tx) * 0.018;
      ty += (my - ty) * 0.018;

      ghostMtns.position.x = -tx * 0.08;
      ghostMtns.position.y =  ty * 0.02;
      farMtns.position.x   = -tx * 0.18;
      farMtns.position.y   =  ty * 0.05;
      midMtns.position.x   = -tx * 0.36;
      midMtns.position.y   =  ty * 0.10;
      nearMtns.position.x  = -tx * 0.60;
      nearMtns.position.y  =  ty * 0.16;

      // Cloud drift
      clouds.forEach(c => {
        const rawX = c.startX + c.speed * t;
        c.group.position.x = ((rawX + WRAP) % (WRAP * 2)) - WRAP;
        c.group.position.y = c.baseY + Math.sin(t * 0.12 + c.phase) * 0.10;
      });

      // Scene birds: flap + drift across sky
      const BIRD_WRAP = 30;
      sceneBirds.forEach(b => {
        b.flapPhase += 0.08 + b.speed * 0.02;
        const flapAngle = Math.sin(b.flapPhase) * 0.4;
        b.wingL.rotation.z =  flapAngle;
        b.wingR.rotation.z = -flapAngle;

        b.x += b.speed * 0.008;
        if (b.x > BIRD_WRAP) b.x = -BIRD_WRAP;
        b.group.position.x = b.x;
        b.group.position.y = b.y + Math.sin(t * 0.5 + b.flapPhase * 0.1) * 0.08;
      });

      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    cleanupFn = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      disposables.forEach(d => d.dispose());
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
    } // end init()

    return () => {
      if ("requestIdleCallback" in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void })
          .cancelIdleCallback(idleCb as number);
      } else {
        clearTimeout(idleCb as ReturnType<typeof setTimeout>);
      }
      cleanupFn?.();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 pointer-events-none" aria-hidden />;
}
