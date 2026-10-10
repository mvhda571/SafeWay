import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #e0f2fe 100%)",
        padding: "60px",
        gap: "24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "linear-gradient(135deg, #34d399, #059669)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 40px -8px rgba(16,185,129,0.5)",
          }}
        >
          <span style={{ color: "white", fontSize: 56, fontWeight: 900 }}>S</span>
        </div>
        <span style={{ fontSize: 88, fontWeight: 900, color: "#0b0b0f", letterSpacing: "-3px" }}>
          SafeWay
        </span>
      </div>
      <p style={{ fontSize: 38, color: "#4b5563", margin: 0, textAlign: "center" }}>
        Bolalar uchun xavfsiz yo&apos;l
      </p>
      <p style={{ fontSize: 26, color: "#9ca3af", margin: 0, textAlign: "center" }}>
        Xavf xaritasi · Xavfsiz yo&apos;nalish · Favqulodda yordam
      </p>
    </div>,
    { ...size },
  );
}
