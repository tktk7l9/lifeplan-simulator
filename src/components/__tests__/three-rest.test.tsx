/**
 * 残りの three components の smoke test
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// THREE 系を汎用 stub (WebGL 非対応 jsdom でも setup 経路を踏める)
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  class Vec3 {
    x = 0; y = 0; z = 0
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z }
    set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this }
    setScalar(s: number) { this.x = s; this.y = s; this.z = s; return this }
    multiplyScalar(s: number) { this.x *= s; this.y *= s; this.z *= s; return this }
    copy() { return this }
    add() { return this }
    sub() { return this }
    normalize() { return this }
    cross() { return this }
  }
  class Color {
    constructor(_x?: unknown) {}
    set() { return this }
    multiplyScalar() { return this }
    offsetHSL() { return this }
    lerp() { return this }
  }
  class Material { uniforms: Record<string, { value: unknown }>; opacity = 1
    constructor(cfg?: { uniforms?: Record<string, { value: unknown }> }) {
      this.uniforms = cfg?.uniforms ?? {}
    }
    dispose() {}
  }
  class Geometry { translate() { return this }; scale() { return this }; rotateX() { return this }; rotateY() { return this }; rotateZ() { return this }; dispose() {} }
  class Mesh {
    position = new Vec3(); rotation = new Vec3(); scale = new Vec3(); userData: Record<string, unknown> = {}
    geometry: Geometry; material: Material
    constructor(g: Geometry, m: Material) { this.geometry = g; this.material = m }
  }
  class Group {
    children: unknown[] = []; position = new Vec3(); rotation = new Vec3(); scale = new Vec3()
    add(c: unknown) { this.children.push(c) }
  }
  class Scene extends Group { fog: unknown = null }
  class Camera {
    position = new Vec3(); aspect = 1
    constructor(..._args: unknown[]) {}
    lookAt() {}
    updateProjectionMatrix() {}
  }
  class WebGLRenderer {
    domElement = document.createElement("canvas")
    setPixelRatio() {}
    setSize() {}
    setClearColor() {}
    render() {}
    dispose() {}
    getContext() { return { getExtension: () => ({ loseContext: () => {} }) } }
  }
  class Shape { moveTo() {} lineTo() {} bezierCurveTo() {} }

  return {
    ...actual,
    Vector3: Vec3, Color, Group, Scene,
    PerspectiveCamera: Camera, OrthographicCamera: Camera,
    WebGLRenderer, FogExp2: class { constructor() {} },
    PlaneGeometry: Geometry, ShapeGeometry: Geometry, SphereGeometry: Geometry,
    IcosahedronGeometry: Geometry, ConeGeometry: Geometry, CylinderGeometry: Geometry,
    OctahedronGeometry: Geometry, TetrahedronGeometry: Geometry,
    ShaderMaterial: Material, MeshStandardMaterial: Material, MeshBasicMaterial: Material,
    MeshPhongMaterial: Material, LineBasicMaterial: Material, PointsMaterial: Material,
    Mesh, Points: Mesh, Line: Mesh,
    HemisphereLight: class extends Mesh { constructor() { super(new Geometry(), new Material()) } },
    DirectionalLight: class extends Mesh { constructor() { super(new Geometry(), new Material()) } },
    PointLight: class extends Mesh { constructor() { super(new Geometry(), new Material()) } },
    AmbientLight: class extends Mesh { constructor() { super(new Geometry(), new Material()) } },
    SpotLight: class extends Mesh { constructor() { super(new Geometry(), new Material()) } },
    Shape, BufferGeometry: Geometry,
    BufferAttribute: class { constructor(..._args: unknown[]) {} },
    DoubleSide: 2, AdditiveBlending: 1, NormalBlending: 0,
    Raycaster: class { setFromCamera() {} intersectObjects() { return [] } },
    Vector2: class { x = 0; y = 0; set(x: number, y: number) { this.x = x; this.y = y } },
  }
})

import { HeroCanvas } from "../three/HeroCanvas";
import { CursorBird } from "../three/CursorBird";
import { FloatingParticles } from "../three/FloatingParticles";
import { SidebarMountain3D } from "../three/SidebarMountain3D";

describe("Three components (R3F は描画されないが mount OK)", () => {
  it("HeroCanvas", () => {
    expect(() => render(<HeroCanvas />)).not.toThrow();
  });
  it("CursorBird", () => {
    expect(() => render(<CursorBird />)).not.toThrow();
  });
  it("FloatingParticles 既定", () => {
    expect(() => render(<FloatingParticles />)).not.toThrow();
  });
  it("FloatingParticles count/opacity custom", () => {
    expect(() => render(<FloatingParticles count={30} opacity={0.3} />)).not.toThrow();
  });
  it("SidebarMountain3D", () => {
    expect(() => render(<SidebarMountain3D />)).not.toThrow();
  });
});
