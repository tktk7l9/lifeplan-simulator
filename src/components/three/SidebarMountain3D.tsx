"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function SidebarMountain3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth || 220;
    const H = 80;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 1.2, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // Warm sky ambient
    scene.add(new THREE.AmbientLight(0xfff0d0, 0.8));
    const sun = new THREE.DirectionalLight(0xffb347, 1.5);
    sun.position.set(3, 8, 4);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xff8c42, 0.4);
    fill.position.set(-4, 2, 2);
    scene.add(fill);

    // Mountain group — slowly rotates
    const group = new THREE.Group();
    scene.add(group);

    const peaks = [
      { x: -2.8, y: -0.5, z: -1.0, h: 2.2, r: 0.9,  sides: 4, opacity: 0.55, color: 0xd97706 },
      { x:  0.0, y: -0.5, z:  0.0, h: 3.5, r: 1.1,  sides: 4, opacity: 0.70, color: 0xf59e0b },
      { x:  2.6, y: -0.5, z: -0.8, h: 2.6, r: 0.95, sides: 4, opacity: 0.60, color: 0xfbbf24 },
      { x: -1.4, y: -0.5, z:  0.5, h: 1.6, r: 0.7,  sides: 3, opacity: 0.40, color: 0xfcd34d },
      { x:  1.4, y: -0.5, z:  0.4, h: 1.8, r: 0.75, sides: 3, opacity: 0.42, color: 0xfde68a },
    ];

    peaks.forEach(({ x, y, z, h, r, sides, opacity, color }) => {
      const geo = new THREE.ConeGeometry(r, h, sides, 1);
      const mat = new THREE.MeshPhongMaterial({
        color,
        transparent: true,
        opacity,
        flatShading: true,
        shininess: 60,
        specular: new THREE.Color(0xffffff),
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      // Slightly random tilt for organic feel
      mesh.rotation.y = (Math.random() - 0.5) * 0.3;
      group.add(mesh);

      // Snow cap on the tallest peak
      if (h > 3) {
        const capGeo = new THREE.ConeGeometry(r * 0.32, h * 0.18, sides, 1);
        const capMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, flatShading: true });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(x, y + h / 2 - h * 0.08, z);
        group.add(cap);
      }
    });

    // Far haze mountains (lower opacity)
    [-4.5, -1.8, 1.5, 4.2].forEach((x, i) => {
      const geo = new THREE.ConeGeometry(0.6 + i * 0.1, 1.5, 3, 1);
      const mat = new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.18 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, -1.0, -2.5);
      group.add(mesh);
    });

    // Trail dashes as small flat cylinders
    const trailPoints = [
      [0.9, -0.9, 0.5], [0.55, -0.45, 0.4], [0.2, 0.05, 0.3], [-0.1, 0.5, 0.2],
    ] as [number, number, number][];
    trailPoints.forEach(([x, y, z]) => {
      const geo = new THREE.CylinderGeometry(0.055, 0.055, 0.04, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      group.add(m);
    });

    // Summit flag
    const flagPole = new THREE.CylinderGeometry(0.025, 0.025, 0.6, 4);
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    const pole = new THREE.Mesh(flagPole, flagMat);
    pole.position.set(0, 1.6, 0);
    group.add(pole);

    const flagGeo = new THREE.PlaneGeometry(0.32, 0.18);
    const flag = new THREE.Mesh(flagGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    flag.position.set(0.18, 1.78, 0);
    group.add(flag);

    const clock = new THREE.Clock();
    let raf: number;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      group.rotation.y = Math.sin(t * 0.18) * 0.12; // gentle sway
      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      const w = el.clientWidth || 220;
      camera.aspect = w / H;
      camera.updateProjectionMatrix();
      renderer.setSize(w, H);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="w-full" style={{ height: 80 }} aria-hidden />;
}
