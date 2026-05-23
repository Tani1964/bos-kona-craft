import { motion } from "framer-motion";
import { Lock, Play, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle: string;
  index?: number;
  locked?: boolean;
  thumbnail?: ReactNode;
  video?: boolean;
  icon?: ReactNode;
}

export function ModuleCard({
  title,
  subtitle,
  index = 0,
  locked,
  thumbnail,
  video,
  icon,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: locked ? 0.5 : 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative mb-4 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
    >
      <div className="flex items-center gap-4">
        {thumbnail && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10">
            {thumbnail}
            {video && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="h-5 w-5 fill-foreground text-foreground" />
              </div>
            )}
            {locked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Lock className="h-4 w-4 text-bronze" />
              </div>
            )}
          </div>
        )}
        {!thumbnail && icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg leading-tight text-foreground">{title}</h3>
            {locked && !thumbnail && <Lock className="h-3.5 w-3.5 text-bronze" />}
          </div>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </motion.div>
  );
}
