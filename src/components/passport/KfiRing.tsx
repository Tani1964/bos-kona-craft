import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  score: number;
  stage: string;
}

export function KfiRing({ score, stage }: Props) {
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const progress = useMotionValue(0);
  const [display, setDisplay] = useState("0.0");
  const strokeDashoffset = useTransform(
    progress,
    (v) => circumference - (v / 100) * circumference,
  );

  useEffect(() => {
    const controls = animate(progress, score, {
      duration: 2.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v.toFixed(1)),
    });
    return controls.stop;
  }, [score, progress]);

  return (
    <div className="relative mx-auto flex aspect-square w-[280px] items-center justify-center">
      {/* Glow */}
      <div className="absolute inset-6 rounded-full bronze-glow opacity-60" />

      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 280 280">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.15 68)" />
            <stop offset="50%" stopColor="oklch(0.72 0.13 62)" />
            <stop offset="100%" stopColor="oklch(0.55 0.14 40)" />
          </linearGradient>
        </defs>
        <circle
          cx="140"
          cy="140"
          r={radius}
          fill="none"
          stroke="oklch(1 0 0 / 0.06)"
          strokeWidth="6"
        />
        <motion.circle
          cx="140"
          cy="140"
          r={radius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
        />
        {/* tick marks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i / 60) * 360;
          const isMajor = i % 5 === 0;
          return (
            <line
              key={i}
              x1="140"
              y1="20"
              x2="140"
              y2={isMajor ? 28 : 24}
              stroke="oklch(1 0 0 / 0.15)"
              strokeWidth={isMajor ? 1.2 : 0.6}
              transform={`rotate(${angle} 140 140)`}
            />
          );
        })}
      </svg>

      <div className="relative flex flex-col items-center">
        <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
          KFI Score
        </span>
        <motion.span
          className="font-serif text-7xl font-light leading-none tracking-tight text-foreground"
          style={{
            textShadow: "0 0 30px color-mix(in oklab, var(--bronze) 40%, transparent)",
          }}
        >
          {display}
        </motion.span>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.5 }}
          className="mt-3 rounded-full border border-bronze/40 bg-bronze/10 px-3 py-1"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bronze">
            Stage: {stage}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
