import { ImageResponse } from "next/og";

export const alt = "ライフプランシミュレーター — 人生の山頂を目指そう";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #050c1a 0%, #0d1b3e 50%, #050c1a 100%)",
          position: "relative",
        }}
      >
        {/* Glow blob */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -60%)",
            width: "800px",
            height: "400px",
            background: "radial-gradient(ellipse, rgba(37,99,235,0.22) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "28px",
          }}
        >
          {/* Icon box */}
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "22px",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: "40px", display: "flex" }}>🏔️</div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "76px",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-2px",
              lineHeight: 1.05,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>ライフプランシミュレーター</span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: "30px",
              color: "rgba(255,255,255,0.38)",
              display: "flex",
            }}
          >
            人生の山頂を、一緒に目指そう
          </div>

          {/* Badges row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "8px",
            }}
          >
            {["登録不要・完全無料", "100歳まで試算", "AI 総合評価"].map((badge) => (
              <div
                key={badge}
                style={{
                  display: "flex",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "100px",
                  padding: "10px 24px",
                  color: "rgba(255,255,255,0.45)",
                  fontSize: "22px",
                }}
              >
                {badge}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
