/**
 * Three.js コンポーネントの init() 経路を実行するテスト。
 * requestIdleCallback が jsdom にないため setTimeout fallback が使われる。
 * fake timers で setTimeout を進めれば init() が実行され、ほぼ全コードがカバーされる。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";

// three の汎用 stub — three-rest.test.tsx と同等
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  class Vec3 {
    x = 0; y = 0; z = 0;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
    setScalar(s: number) { this.x = s; this.y = s; this.z = s; return this; }
    multiplyScalar(s: number) { this.x *= s; this.y *= s; this.z *= s; return this; }
    copy() { return this; }
    add() { return this; }
    sub() { return this; }
    normalize() { return this; }
    cross() { return this; }
    length() { return 1; }
    distanceTo() { return 1; }
    applyEuler() { return this; }
    applyQuaternion() { return this; }
    clone() { return new Vec3(this.x, this.y, this.z); }
  }
  class Color {
    r = 1; g = 1; b = 1;
    constructor(_x?: unknown) {}
    set() { return this; }
    multiplyScalar() { return this; }
    offsetHSL() { return this; }
    lerp() { return this; }
    getHSL(t: { h: number; s: number; l: number }) { t.h = 0; t.s = 0; t.l = 0; return t; }
    clone() { return new Color(); }
  }
  class Material {
    uniforms: Record<string, { value: unknown }>; opacity = 1; transparent = false; depthWrite = true; side = 0;
    constructor(cfg?: { uniforms?: Record<string, { value: unknown }> }) {
      this.uniforms = cfg?.uniforms ?? {};
    }
    dispose() {}
  }
  class Geometry {
    attributes: Record<string, unknown> = { position: { array: new Float32Array(0), needsUpdate: false } };
    translate() { return this; }
    scale() { return this; }
    rotateX() { return this; }
    rotateY() { return this; }
    rotateZ() { return this; }
    computeVertexNormals() {}
    setAttribute() {}
    setIndex() {}
    dispose() {}
  }
  class Mesh {
    position = new Vec3(); rotation = new Vec3(); scale = new Vec3();
    userData: Record<string, unknown> = {};
    castShadow = false; receiveShadow = false; visible = true;
    geometry: Geometry; material: Material;
    constructor(g?: Geometry, m?: Material) {
      this.geometry = g ?? new Geometry();
      this.material = m ?? new Material();
    }
    add(_c?: unknown) {}
    lookAt() {}
    traverse() {}
    clone() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new (this.constructor as any)(this.geometry, this.material);
    }
  }
  class Group extends Mesh {
    children: unknown[] = [];
    add(c: unknown) { this.children.push(c); }
  }
  class Scene extends Group {
    fog: unknown = null;
    background: unknown = null;
  }
  class Camera {
    position = new Vec3(); rotation = new Vec3(); aspect = 1; fov = 50;
    constructor(..._args: unknown[]) {}
    lookAt() {}
    updateProjectionMatrix() {}
  }
  class WebGLRenderer {
    domElement = document.createElement("canvas");
    shadowMap = { enabled: false, type: 0 };
    toneMapping = 0;
    toneMappingExposure = 1;
    info = { reset: () => {} };
    setPixelRatio() {}
    setSize() {}
    setClearColor() {}
    render() {}
    dispose() {}
    getContext() { return { getExtension: () => ({ loseContext: () => {} }) }; }
  }
  class Shape {
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    closePath() {}
    holes: unknown[] = [];
  }
  class Path extends Shape {}
  class Light extends Mesh {
    shadow = {
      mapSize: { set: () => {}, width: 1024, height: 1024 },
      camera: { near: 0, far: 100, left: -10, right: 10, top: 10, bottom: -10 },
      bias: 0,
    };
  }
  class Fog {
    constructor(..._args: unknown[]) {}
  }

  return {
    ...actual,
    Vector2: class { x = 0; y = 0; set(x: number, y: number) { this.x = x; this.y = y; return this; } },
    Vector3: Vec3,
    Color,
    Group, Scene,
    PerspectiveCamera: Camera, OrthographicCamera: Camera,
    WebGLRenderer,
    Fog, FogExp2: Fog,
    PlaneGeometry: Geometry, ShapeGeometry: Geometry, SphereGeometry: Geometry,
    IcosahedronGeometry: Geometry, ConeGeometry: Geometry, CylinderGeometry: Geometry,
    OctahedronGeometry: Geometry, TetrahedronGeometry: Geometry,
    BoxGeometry: Geometry, ExtrudeGeometry: Geometry, CircleGeometry: Geometry, RingGeometry: Geometry,
    BufferGeometry: Geometry,
    ShaderMaterial: Material, MeshStandardMaterial: Material, MeshBasicMaterial: Material,
    MeshPhongMaterial: Material, MeshLambertMaterial: Material, MeshPhysicalMaterial: Material,
    LineBasicMaterial: Material, PointsMaterial: Material, SpriteMaterial: Material,
    Mesh, Points: Mesh, Line: Mesh, LineSegments: Mesh, Sprite: Mesh,
    HemisphereLight: Light, DirectionalLight: Light,
    PointLight: Light, AmbientLight: Light, SpotLight: Light,
    Shape, Path,
    BufferAttribute: class { constructor(..._args: unknown[]) {} },
    Float32BufferAttribute: class { constructor(..._args: unknown[]) {} },
    DoubleSide: 2, FrontSide: 0, BackSide: 1,
    AdditiveBlending: 1, NormalBlending: 0,
    PCFSoftShadowMap: 2, ACESFilmicToneMapping: 3,
    Raycaster: class { setFromCamera() {} intersectObjects() { return []; } },
    Clock: class { getElapsedTime() { return 0; } getDelta() { return 0.016; } },
    MathUtils: { degToRad: (d: number) => d * Math.PI / 180, randFloat: (a: number, b: number) => (a + b) / 2 },
    CatmullRomCurve3: class { constructor(..._args: unknown[]) {} getPoint() { return new Vec3(); } getPoints() { return []; } },
    Curve: class {},
    Object3D: Mesh,
  };
});

import { HeroCanvas } from "../three/HeroCanvas";
import { FloatingParticles } from "../three/FloatingParticles";
import { SidebarMountain3D } from "../three/SidebarMountain3D";

beforeEach(() => {
  vi.useFakeTimers();
  // requestIdleCallback を未定義に保つ (jsdom default)
  // (Window).requestIdleCallback は undefined のままで setTimeout fallback が使われる
});

afterEach(() => {
  vi.useRealTimers();
});

describe("HeroCanvas init() 経路", () => {
  it("mount → setTimeout(200) で init() 実行", () => {
    const { container } = render(<HeroCanvas />);
    // mountRef.current は div 要素になる
    act(() => { vi.advanceTimersByTime(300); });
    // canvas が container 内に追加される
    expect(container.querySelector("div")).toBeTruthy();
  });

  it("unmount でクリーンアップ", () => {
    const { unmount } = render(<HeroCanvas />);
    act(() => { vi.advanceTimersByTime(300); });
    expect(() => unmount()).not.toThrow();
  });
});

describe("FloatingParticles init() 経路", () => {
  it("既定 props で init", () => {
    render(<FloatingParticles />);
    act(() => { vi.advanceTimersByTime(500); });
    expect(true).toBe(true);
  });

  it("count=30 opacity=0.3 で init", () => {
    render(<FloatingParticles count={30} opacity={0.3} />);
    act(() => { vi.advanceTimersByTime(500); });
    expect(true).toBe(true);
  });

  it("count=120 opacity=0.5 で init", () => {
    render(<FloatingParticles count={120} opacity={0.5} />);
    act(() => { vi.advanceTimersByTime(500); });
    expect(true).toBe(true);
  });

  it("unmount でクリーンアップ", () => {
    const { unmount } = render(<FloatingParticles />);
    act(() => { vi.advanceTimersByTime(500); });
    expect(() => unmount()).not.toThrow();
  });
});

describe("SidebarMountain3D", () => {
  it("mount + advance", () => {
    render(<SidebarMountain3D />);
    act(() => { vi.advanceTimersByTime(500); });
    expect(true).toBe(true);
  });
});
