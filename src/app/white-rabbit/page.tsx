import Image from "next/image";

const HOTSPOT = {
  left: "35%",
  top: "18%",
  width: "28%",
  height: "40%",
} as const;

type WhiteRabbitPageProps = {
  searchParams?: Promise<{ debug?: string | string[] }>;
};

export default async function WhiteRabbitPage({ searchParams }: WhiteRabbitPageProps) {
  const params = await searchParams;
  const debugValue = params?.debug;
  const debug = Array.isArray(debugValue) ? debugValue.includes("1") : debugValue === "1";

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        overflow: "hidden",
        margin: 0,
        padding: 0,
      }}
    >
      {/* Full screen image */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Image
          src="/demo.matrix.white.rabbit.png"
          alt="Matrix white rabbit"
          fill
          priority
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* Hotspot: rabbit + white area (tune these % values) */}
      <a
        href="/deel"
        aria-label="Enter demo"
        style={{
          position: "absolute",
          left: HOTSPOT.left,
          top: HOTSPOT.top,
          width: HOTSPOT.width,
          height: HOTSPOT.height,
          cursor: "pointer",
          borderRadius: "18px",
          border: debug ? "1px dashed rgba(255,255,255,0.85)" : "none",
          background: debug ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0)",
          transition: "background 120ms ease, border-color 120ms ease",
        }}
      />

      {debug && (
        <div
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            padding: "8px 10px",
            borderRadius: 10,
            fontSize: 11,
            lineHeight: 1.35,
            color: "rgba(255,255,255,0.88)",
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.18)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          <div>hotspot</div>
          <div>left: {HOTSPOT.left}</div>
          <div>top: {HOTSPOT.top}</div>
          <div>width: {HOTSPOT.width}</div>
          <div>height: {HOTSPOT.height}</div>
        </div>
      )}

      {/* Optional: subtle hint for first-time users */}
      <div
        style={{
          position: "absolute",
          left: 18,
          bottom: 18,
          padding: "10px 12px",
          borderRadius: 12,
          fontSize: 13,
          color: "rgba(255,255,255,0.66)",
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(8px)",
          pointerEvents: "none",
        }}
      >
        Click the white rabbit.
      </div>
    </main>
  );
}
