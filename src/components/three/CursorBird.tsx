"use client";

import { useEffect, useRef, useState } from "react";

type BirdAction = "idle" | "excited" | "celebrate" | "sunglare" | "surprised" | "pointing";

interface BirdPhysics {
  x: number;
  y: number;
  vx: number;
  vy: number;
  flapPhase: number;
  speed: number;
}

export function CursorBird() {
  const birdRef = useRef<HTMLDivElement>(null);
  const physics = useRef<BirdPhysics>({ x: -200, y: -200, vx: 0, vy: 0, flapPhase: 0, speed: 0 });
  const target = useRef({ x: -200, y: -200 });
  const rafRef = useRef<number>(0);
  const [wingAngle, setWingAngle] = useState(0);
  const [flip, setFlip] = useState(false);
  const [action, setAction] = useState<BirdAction>("idle");
  const actionRef = useRef<BirdAction>("idle");
  const flipRef = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX - 20, y: e.clientY - 36 };
    };
    const onBirdAction = (e: Event) => {
      const detail = (e as CustomEvent).detail as { action: BirdAction };
      actionRef.current = detail.action;
      setAction(detail.action);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("bird-action", onBirdAction);

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const s = physics.current;
      const t = target.current;

      const dx = t.x - s.x;
      const dy = t.y - s.y;

      const isExcited = actionRef.current === "excited" || actionRef.current === "celebrate";
      const stiffness = isExcited ? 0.09 : 0.05;
      const damping = isExcited ? 0.68 : 0.74;

      s.vx = s.vx * damping + dx * stiffness;
      s.vy = s.vy * damping + dy * stiffness;
      s.x += s.vx;
      s.y += s.vy;
      s.speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);

      if (Math.abs(s.vx) > 0.3) {
        const newFlip = s.vx < 0;
        if (newFlip !== flipRef.current) {
          flipRef.current = newFlip;
          setFlip(newFlip);
        }
      }

      const flapMult = isExcited ? 2.8 : 1.0;
      const flapRate = (0.07 + s.speed * 0.022) * flapMult;
      s.flapPhase += flapRate;
      const angle = Math.sin(s.flapPhase) * (isExcited ? 38 : 26);
      setWingAngle(angle);

      if (birdRef.current) {
        birdRef.current.style.transform = `translate(${s.x}px, ${s.y}px)`;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("bird-action", onBirdAction);
    };
  }, []);

  // Wing paths — シマエナガ rounded wing feathers
  const scaleX = flip ? -1 : 1;
  const wUp = wingAngle * 0.6;

  // Left wing (back wing, slightly behind body)
  const leftWing = `M -2 0 C -10 ${-4 - wUp} -20 ${-10 - wUp * 1.1} -24 ${-8 - wUp}`;
  // Right wing (front wing)
  const rightWing = `M -2 0 C -10 ${-4 + wUp} -20 ${-10 + wUp * 1.1} -24 ${-8 + wUp}`;

  // Tail feathers — long, slightly forked
  const tailLen = action === "celebrate" ? 32 : 28;

  return (
    <div
      ref={birdRef}
      className="fixed top-0 left-0 pointer-events-none z-[9999]"
      style={{ willChange: "transform" }}
      aria-hidden
    >
      <svg
        width="80"
        height="80"
        viewBox="-40 -40 80 80"
        overflow="visible"
        style={{ transform: `scaleX(${scaleX})` }}
      >
        <defs>
          <radialGradient id="bodyGrad" cx="55%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f0f4f8" />
            <stop offset="100%" stopColor="#d8e4ec" />
          </radialGradient>
          <radialGradient id="headGrad" cx="60%" cy="35%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e8f0f6" />
          </radialGradient>
          <filter id="fluff" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="softglow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── Tail feathers (long, behind body) ── */}
        <g opacity="0.9">
          {/* Central tail */}
          <path
            d={`M -10 6 C -16 10 -22 14 -${tailLen} 10 C -${tailLen - 4} 8 -${tailLen - 8} 7 -10 6`}
            fill="#c8d8e4"
            stroke="#a0b8c8"
            strokeWidth="0.5"
          />
          {/* Upper tail feather */}
          <path
            d={`M -10 4 C -18 6 -${tailLen - 2} 4 -${tailLen + 2} 2`}
            fill="none"
            stroke="#b0c4d4"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Lower tail feather */}
          <path
            d={`M -10 8 C -18 12 -${tailLen - 2} 14 -${tailLen + 2} 17`}
            fill="none"
            stroke="#b0c4d4"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* ── Back wing (behind body) ── */}
        <path
          d={leftWing}
          fill="none"
          stroke="#b8ccd8"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* ── Body — very round and fluffy ── */}
        <ellipse
          cx="-2"
          cy="4"
          rx="15"
          ry="13"
          fill="url(#bodyGrad)"
          filter="url(#fluff)"
        />
        {/* Body fluff highlight */}
        <ellipse cx="-4" cy="0" rx="10" ry="8" fill="white" opacity="0.4" />

        {/* ── Front wing ── */}
        <path
          d={rightWing}
          fill="none"
          stroke="#c0d4e0"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Wing feather detail */}
        <path
          d={rightWing}
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* ── Head — round, slightly larger than you'd expect ── */}
        <circle
          cx="9"
          cy="-4"
          r="10"
          fill="url(#headGrad)"
          filter="url(#fluff)"
        />
        {/* Head highlight */}
        <ellipse cx="10" cy="-6" rx="5" ry="4" fill="white" opacity="0.45" />

        {/* ── Black eye stripe — signature feature ── */}
        <path
          d="M 14 -5 C 12 -7 10 -8 8 -8 C 6 -8 4 -7 3 -5 C 2 -3 3 -2 4 -1"
          fill="#1a1a1a"
          stroke="#1a1a1a"
          strokeWidth="0.5"
        />
        {/* Stripe continuation to beak */}
        <path
          d="M 14 -5 C 16 -5 18 -5 20 -4"
          stroke="#1a1a1a"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* ── Eye ── */}
        {action === "surprised" ? (
          <>
            {/* Wide surprised eyes */}
            <circle cx="9" cy="-5" r="3.5" fill="white" />
            <circle cx="9" cy="-5" r="2.2" fill="#1a1a1a" />
            <circle cx="9.8" cy="-5.8" r="0.8" fill="white" />
          </>
        ) : action === "sunglare" ? (
          <>
            {/* Squinting eye */}
            <ellipse cx="9" cy="-5" rx="3" ry="1.5" fill="#1a1a1a" />
            <path d="M 6.5 -6 C 7.5 -7.5 10.5 -7.5 11.5 -6" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="9" cy="-5" r="2.8" fill="#1a1a1a" />
            <circle cx="9.8" cy="-5.8" r="0.9" fill="white" />
          </>
        )}

        {/* ── Beak — tiny stubby ── */}
        <path
          d="M 18 -4.5 L 22 -3.5 L 18 -2.5 Z"
          fill={action === "sunglare" ? "#e8a020" : "#d4900e"}
        />

        {/* ── Pink cheek blush ── */}
        <ellipse cx="14" cy="-2" rx="4" ry="2.5" fill="#ffb8c0" opacity="0.55" />

        {/* ── Action overlays ── */}

        {action === "excited" && (
          <g>
            {/* Bouncing hearts */}
            <text x="14" y="-20" fontSize="12" textAnchor="middle" opacity="0.9">♥</text>
            <text x="4" y="-28" fontSize="9" textAnchor="middle" fill="#ff6b8a" opacity="0.7">♥</text>
          </g>
        )}

        {action === "celebrate" && (
          <g>
            {/* Sparkles */}
            <text x="-18" y="-24" fontSize="13" opacity="0.9">✨</text>
            <text x="16" y="-22" fontSize="10" opacity="0.85">⭐</text>
            <text x="2" y="-30" fontSize="11" opacity="0.8">✨</text>
          </g>
        )}

        {action === "sunglare" && (
          <g>
            {/* Wing shielding eye */}
            <path
              d="M 2 -2 C 6 -10 12 -14 16 -12 C 18 -10 16 -6 12 -4"
              fill="#c0d4e0"
              stroke="#a0b8c8"
              strokeWidth="1"
              opacity="0.9"
            />
            {/* Sweat drop */}
            <ellipse cx="-8" cy="-14" rx="2.5" ry="4" fill="#80ccff" opacity="0.8" />
            <path d="M -8 -18 L -5 -14 L -11 -14 Z" fill="#80ccff" opacity="0.8" />
          </g>
        )}

        {action === "surprised" && (
          <g>
            {/* Exclamation */}
            <text x="20" y="-20" fontSize="14" fontWeight="bold" fill="#ff4444" textAnchor="middle" opacity="0.9">!</text>
          </g>
        )}

        {action === "pointing" && (
          <g>
            {/* Wing pointing downward */}
            <path
              d="M -2 8 C 4 14 6 22 4 28"
              fill="none"
              stroke="#c0d4e0"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.9"
            />
            {/* Arrowhead */}
            <path d="M 0 26 L 4 30 L 8 26" fill="none" stroke="#a0b8c8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {/* ── Feet (only when nearly still) ── */}
        {physics.current.speed < 1.5 && action === "idle" && (
          <g stroke="#d4900e" strokeWidth="1.2" strokeLinecap="round" opacity="0.7">
            <line x1="-4" y1="14" x2="-6" y2="20" />
            <line x1="-4" y1="20" x2="-9" y2="22" />
            <line x1="-4" y1="20" x2="-4" y2="23" />
            <line x1="-4" y1="20" x2="0" y2="22" />
            <line x1="2" y1="14" x2="0" y2="20" />
            <line x1="0" y1="20" x2="-4" y2="22" />
            <line x1="0" y1="20" x2="0" y2="23" />
            <line x1="0" y1="20" x2="4" y2="22" />
          </g>
        )}
      </svg>
    </div>
  );
}
