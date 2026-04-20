"use client";

export type SpinnerShape = "coin" | "gem" | "peak" | "ring" | "box";

interface Props {
  shape?: SpinnerShape;
  color?: number;
  size?: number;
  className?: string;
}

function hexToHsl(hex: number): string {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `hsl(0,0%,${Math.round(l * 100)}%)`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `hsl(${Math.round(h * 360)},${Math.round(s * 100)}%,${Math.round(l * 100)}%)`;
}

const KEYFRAMES = `
@keyframes _ts_spin{0%{transform:rotateX(0deg) rotateY(0deg)}100%{transform:rotateX(25deg) rotateY(360deg)}}
@keyframes _ts_bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
`;

export function TinySpinner({ shape = "gem", color = 0xf59e0b, size = 48, className }: Props) {
  const c = hexToHsl(color);
  const half = size / 2;
  const s = size * 0.44;

  const face: React.CSSProperties = {
    position: "absolute",
    width: s,
    height: s,
    background: c,
    border: `1px solid hsl(from ${c} h s calc(l + 15%))`,
    opacity: 0.88,
  };

  const shapeEl = () => {
    switch (shape) {
      case "box": {
        const d = s * 0.5;
        return (
          <div style={{ width: s, height: s, position: "relative", transformStyle: "preserve-3d" }}>
            {/* front */}
            <div style={{ ...face, transform: `translateZ(${d / 2}px)` }} />
            {/* back */}
            <div style={{ ...face, transform: `rotateY(180deg) translateZ(${d / 2}px)`, opacity: 0.55 }} />
            {/* left */}
            <div style={{ ...face, width: d, transform: `rotateY(-90deg) translateZ(${d / 2}px)`, opacity: 0.7 }} />
            {/* right */}
            <div style={{ ...face, width: d, transform: `rotateY(90deg) translateZ(${s - d / 2}px)`, opacity: 0.7 }} />
            {/* top */}
            <div style={{ ...face, height: d, transform: `rotateX(90deg) translateZ(${d / 2}px)` }} />
          </div>
        );
      }
      case "coin": {
        const thick = s * 0.18;
        return (
          <div style={{ width: s, height: s, position: "relative", transformStyle: "preserve-3d" }}>
            <div style={{ ...face, borderRadius: "50%", transform: `translateZ(${thick / 2}px)` }} />
            <div style={{ ...face, borderRadius: "50%", transform: `translateZ(-${thick / 2}px)`, opacity: 0.55 }} />
          </div>
        );
      }
      case "ring":
        return (
          <div style={{
            width: s, height: s, borderRadius: "50%",
            border: `${s * 0.2}px solid ${c}`,
            boxShadow: `0 0 ${s * 0.12}px ${c}`,
            opacity: 0.85,
          }} />
        );
      case "peak":
        return (
          <div style={{
            width: 0, height: 0,
            borderLeft: `${s * 0.46}px solid transparent`,
            borderRight: `${s * 0.46}px solid transparent`,
            borderBottom: `${s * 0.9}px solid ${c}`,
            filter: `drop-shadow(0 ${s * 0.08}px ${s * 0.1}px ${c}88)`,
          }} />
        );
      case "gem":
      default:
        return (
          <div style={{
            width: s * 0.82, height: s * 0.82,
            background: `linear-gradient(135deg, ${c} 30%, hsl(from ${c} h s calc(l + 20%)) 100%)`,
            clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
            boxShadow: `0 0 ${s * 0.15}px ${c}66`,
          }} />
        );
    }
  };

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        className={className}
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          perspective: size * 3,
          animation: `_ts_bob 2.8s ease-in-out infinite`,
        }}
      >
        <div style={{
          transformStyle: "preserve-3d",
          animation: `_ts_spin 3.2s linear infinite`,
        }}>
          {shapeEl()}
        </div>
      </div>
    </>
  );
}
