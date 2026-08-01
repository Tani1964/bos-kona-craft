import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Play, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle: string;
  index?: number;
  thumbnail?: ReactNode;
  video?: boolean;
  icon?: ReactNode;
  to?: string;
  search?: Record<string, string>;
}

export function ModuleCard({
  title,
  subtitle,
  index = 0,
  thumbnail,
  video,
  icon,
  to,
  search,
}: Props) {
  const inner = (
    <div className="flex items-center gap-4">
      {thumbnail && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10">
          {thumbnail}
          {video && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="h-5 w-5 fill-foreground text-foreground" />
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
        <h3 className="font-serif text-lg leading-tight text-foreground">{title}</h3>
        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {subtitle}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative mb-4 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm"
    >
      {to ? (
        <Link
          to={to}
          search={search as never}
          className="block p-4 transition active:scale-[0.99]"
        >
          {inner}
        </Link>
      ) : (
        <div className="p-4">{inner}</div>
      )}
    </motion.div>
  );
}
