"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./white-rabbit.module.css";

type HotspotConfig = {
  left: string;
  top: string;
  width: string;
  height: string;
};

type WhiteRabbitDebugClientProps = {
  hotspot: HotspotConfig;
  currentHotspot: HotspotConfig;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function WhiteRabbitDebugClient({
  hotspot,
  currentHotspot,
}: WhiteRabbitDebugClientProps) {
  const hotspotWidth = useMemo(() => parseFloat(hotspot.width), [hotspot.width]);
  const hotspotHeight = useMemo(() => parseFloat(hotspot.height), [hotspot.height]);
  const initialLeft = useMemo(() => parseFloat(hotspot.left), [hotspot.left]);
  const initialTop = useMemo(() => parseFloat(hotspot.top), [hotspot.top]);

  const [mousePct, setMousePct] = useState({ x: 50, y: 50 });
  const [proposedHotspot, setProposedHotspot] = useState({
    left: initialLeft,
    top: initialTop,
    width: hotspotWidth,
    height: hotspotHeight,
  });

  const updateFromPoint = useCallback(
    (clientX: number, clientY: number, setProposal: boolean) => {
      const viewportWidth = window.innerWidth || 1;
      const viewportHeight = window.innerHeight || 1;
      const x = clamp((clientX / viewportWidth) * 100, 0, 100);
      const y = clamp((clientY / viewportHeight) * 100, 0, 100);
      setMousePct({ x, y });

      if (!setProposal) return;

      const left = clamp(x - hotspotWidth / 2, 0, 100 - hotspotWidth);
      const top = clamp(y - hotspotHeight / 2, 0, 100 - hotspotHeight);

      setProposedHotspot({
        left,
        top,
        width: hotspotWidth,
        height: hotspotHeight,
      });
    },
    [hotspotHeight, hotspotWidth],
  );

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      updateFromPoint(event.clientX, event.clientY, false);
    };
    const handleClick = (event: MouseEvent) => {
      updateFromPoint(event.clientX, event.clientY, true);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("click", handleClick, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
    };
  }, [updateFromPoint]);

  return (
    <>
      <div
        className={styles.debugPanel}
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        <div>mouseX: {mousePct.x.toFixed(1)}%</div>
        <div>mouseY: {mousePct.y.toFixed(1)}%</div>
        <div style={{ marginTop: 6, opacity: 0.9 }}>proposed HOTSPOT</div>
        <div>left: {proposedHotspot.left.toFixed(1)}%</div>
        <div>top: {proposedHotspot.top.toFixed(1)}%</div>
        <div>width: {proposedHotspot.width.toFixed(1)}%</div>
        <div>height: {proposedHotspot.height.toFixed(1)}%</div>
        <div style={{ marginTop: 6, opacity: 0.74 }}>click anywhere to set center</div>
        <div style={{ marginTop: 6, opacity: 0.9 }}>current HOTSPOT</div>
        <div>left: {currentHotspot.left}</div>
        <div>top: {currentHotspot.top}</div>
        <div>width: {currentHotspot.width}</div>
        <div>height: {currentHotspot.height}</div>
      </div>

      <div className={styles.debugLayer} aria-hidden="true">
        <div className={styles.debugCrosshairV} style={{ left: `${mousePct.x}%` }} />
        <div className={styles.debugCrosshairH} style={{ top: `${mousePct.y}%` }} />
        <div
          className={styles.debugCrosshairDot}
          style={{ left: `${mousePct.x}%`, top: `${mousePct.y}%` }}
        />
        <div
          className={styles.proposedHotspot}
          style={{
            left: `${proposedHotspot.left}%`,
            top: `${proposedHotspot.top}%`,
            width: `${proposedHotspot.width}%`,
            height: `${proposedHotspot.height}%`,
          }}
        />
      </div>
    </>
  );
}
