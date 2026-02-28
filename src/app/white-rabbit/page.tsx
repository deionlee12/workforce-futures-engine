import Image from "next/image";
import styles from "./white-rabbit.module.css";

const HOTSPOT = {
  left: "45%",
  top: "40%",
  width: "28%",
  height: "44%",
} as const;

type WhiteRabbitPageProps = {
  searchParams?: Promise<{ debug?: string | string[] }>;
};

export default async function WhiteRabbitPage({ searchParams }: WhiteRabbitPageProps) {
  const params = await searchParams;
  const debugValue = params?.debug;
  const debug = Array.isArray(debugValue) ? debugValue.includes("1") : debugValue === "1";

  return (
    <main className={styles.root}>
      {/* Full screen image */}
      <div className={styles.mediaLayer}>
        <Image
          src="/demo.matrix.white.rabbit.v3.png"
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
        className={styles.hotspot}
        style={{
          left: HOTSPOT.left,
          top: HOTSPOT.top,
          width: HOTSPOT.width,
          height: HOTSPOT.height,
          border: debug ? "1px dashed rgba(255,255,255,0.85)" : "none",
          background: debug ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0)",
        }}
      />

      {debug && (
        <div
          className={styles.debugPanel}
          style={{
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

      <div
        className={styles.terminalHint}
        aria-hidden="true"
        style={{
          left: "41.5%",
          top: "69.5%",
          transform: "rotate(-7deg)",
        }}
      >
        <span className={styles.terminalHintText}> </span>
        <span className={styles.terminalCursor} />
      </div>
    </main>
  );
}
