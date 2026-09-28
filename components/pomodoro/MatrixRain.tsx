"use client";

import { useEffect, useRef } from "react";

const GLYPHS = "アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF<>/{}[]=+*#$";
const CELL = 16;
const FRAME_MS = 55;

/** Background "digital rain" canvas. Tints itself with the current --accent and speeds up while a timer runs. */
export function MatrixRain({ running }: { running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(running);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let cols = 0;
    let drops: number[] = [];
    let color = "#39ff88";
    let frame = 0;
    let timer = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / CELL);
      drops = Array.from({ length: cols }, () => (Math.random() * -h) / CELL);
    };

    const draw = () => {
      if (frame++ % 20 === 0) {
        const c = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
        if (c) color = c;
      }
      ctx.fillStyle = "rgba(3,7,5,0.14)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = "14px monospace";
      const speed = runningRef.current ? 1 : 0.45;
      for (let i = 0; i < cols; i++) {
        const y = drops[i] * CELL;
        ctx.fillStyle = Math.random() < 0.04 ? "#eafff1" : color;
        ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * CELL, y);
        if (y > h && Math.random() > 0.975) drops[i] = 0;
        if (Math.random() < speed) drops[i]++;
      }
      timer = window.setTimeout(() => {
        raf = requestAnimationFrame(draw);
      }, FRAME_MS);
    };

    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 size-full opacity-[0.16] motion-reduce:hidden" aria-hidden="true" />;
}
