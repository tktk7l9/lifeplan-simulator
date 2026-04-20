"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  count?: number;
  opacity?: number;
}

export function FloatingParticles({ count = 60, opacity = 0.18 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const idleCb = "requestIdleCallback" in window
      ? (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
          .requestIdleCallback(() => init(), { timeout: 3000 })
      : setTimeout(() => init(), 300);

    let cleanupFn: (() => void) | undefined;

    function init() {
    if (!el) return;
    const W = el.clientWidth || window.innerWidth;
    const H = el.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0.1, 100);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // Particles as small icosahedra
    const geos = [
      new THREE.OctahedronGeometry(1, 0),
      new THREE.TetrahedronGeometry(1, 0),
    ];
    const palette = [0xf59e0b, 0xd97706, 0xfbbf24, 0xf97316, 0xfcd34d];

    interface Particle {
      mesh: THREE.Mesh;
      vx: number; vy: number;
      rotSpeed: number;
    }

    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const geo = geos[Math.floor(Math.random() * geos.length)];
      const mat = new THREE.MeshBasicMaterial({
        color: palette[Math.floor(Math.random() * palette.length)],
        transparent: true,
        opacity: opacity * (0.4 + Math.random() * 0.6),
        wireframe: Math.random() > 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);

      const s = 2 + Math.random() * 7;
      mesh.scale.setScalar(s);

      mesh.position.set(
        (Math.random() - 0.5) * W,
        (Math.random() - 0.5) * H,
        0,
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );

      scene.add(mesh);
      particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 0.12,
        vy: 0.08 + Math.random() * 0.14,   // drift upward
        rotSpeed: (Math.random() - 0.5) * 0.008,
      });
    }

    let raf: number;
    const tick = () => {
      raf = requestAnimationFrame(tick);

      particles.forEach((p) => {
        p.mesh.position.x += p.vx;
        p.mesh.position.y += p.vy;
        p.mesh.rotation.z += p.rotSpeed;

        // Wrap around
        if (p.mesh.position.y > H / 2 + 20) {
          p.mesh.position.y = -H / 2 - 20;
          p.mesh.position.x = (Math.random() - 0.5) * W;
        }
        if (Math.abs(p.mesh.position.x) > W / 2 + 20) {
          p.mesh.position.x = -Math.sign(p.mesh.position.x) * (W / 2 - 10);
        }
      });

      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      camera.left = -w / 2; camera.right = w / 2;
      camera.top = h / 2; camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    cleanupFn = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geos.forEach((g) => g.dispose());
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
  }, [count, opacity]);

  return <div ref={mountRef} className="absolute inset-0 pointer-events-none" aria-hidden />;
}
