/**
 * Next.js pages / layouts の smoke test
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// next/link を mock
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// next/headers / metadata 系
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("next/font/google", () => ({
  JetBrains_Mono: () => ({ variable: "--font-jetbrains-mono", className: "jbmono" }),
  Inter: () => ({ variable: "--font-inter", className: "inter" }),
  Noto_Sans_JP: () => ({ variable: "--font-noto", className: "noto" }),
}));

// SimulatorApp は重いので stub
vi.mock("@/components/simulator/SimulatorApp", () => ({
  SimulatorApp: () => <div data-testid="sim-app-stub" />,
}));

import HomePage from "../(home)/page";
import HomeLayout from "../(home)/layout";
import SimulatorPage from "../simulator/page";
import SimulatorLayout from "../simulator/layout";
import RootLayout from "../layout";
import { Providers } from "@/components/providers";

describe("(home)/page", () => {
  it("ランディング描画", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector(".lp-root")).toBeTruthy();
  });
});

describe("(home)/layout", () => {
  it("children を素通し", () => {
    const Layout = HomeLayout as React.ComponentType<{ children: React.ReactNode }>;
    render(<Layout><span>子</span></Layout>);
    expect(screen.getByText("子")).toBeTruthy();
  });
});

describe("simulator/page", () => {
  it("SimulatorApp を描画", () => {
    render(<SimulatorPage />);
    expect(screen.getByTestId("sim-app-stub")).toBeTruthy();
  });
});

describe("simulator/layout", () => {
  it("children を素通し", () => {
    const Layout = SimulatorLayout as React.ComponentType<{ children: React.ReactNode }>;
    render(<Layout><span>子</span></Layout>);
    expect(screen.getByText("子")).toBeTruthy();
  });
});

describe("RootLayout", () => {
  it("メタデータ含め描画する (関数として呼び出す)", () => {
    const Layout = RootLayout as (props: { children: React.ReactNode }) => React.ReactNode;
    // RootLayout 内に <html> がある場合は render すると重複だが、
    // jsdom は許容する
    const el = Layout({ children: <span>子</span> });
    expect(el).toBeTruthy();
  });
});

describe("Providers", () => {
  it("children を素通し", () => {
    render(<Providers><span>子</span></Providers>);
    expect(screen.getByText("子")).toBeTruthy();
  });
});
