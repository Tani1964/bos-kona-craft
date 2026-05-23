import { AnimatePresence, motion } from "framer-motion";
import {
  Radio,
  SprayCan,
  Sparkles,
  Layers,
  Wrench,
  Camera,
  type LucideIcon,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CareSheet({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto w-full max-w-md rounded-t-2xl border-t border-stone-800 bg-stone-900 pb-safe shadow-[0_-30px_60px_-10px_rgba(0,0,0,0.7)]"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-stone-700" />
            </div>

            {/* Header */}
            <div className="px-5 pb-4 pt-2">
              <p className="text-center font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                Care Intelligence
              </p>
            </div>

            <div className="px-5 pb-6">
              {/* 1. NFC Hero */}
              <button
                className="group relative flex w-full items-center gap-4 overflow-hidden rounded-xl border border-bronze/25 bg-stone-950 p-4 text-left transition active:scale-[0.99] bronze-glow"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-bronze/30 bg-bronze/10">
                  <Radio className="h-5 w-5 text-bronze" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg leading-tight text-foreground">
                    Scan Bos' Kọ́nà Care Kit
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Verifies authentic care · max KFI boost
                  </p>
                </div>
              </button>

              {/* 2. Manual Logs */}
              <div className="mt-6">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Manual Logs
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ManualBtn icon={SprayCan} label="Surface Clean" />
                  <ManualBtn icon={Sparkles} label="Leather Polish" />
                  <ManualBtn icon={Layers} label="Sole Maintenance" />
                  <ManualBtn icon={Wrench} label="Restoration" />
                </div>
              </div>

              {/* 3. Smart Scan */}
              <button className="mt-6 flex w-full items-center gap-4 rounded-xl border border-white/10 bg-stone-950 p-4 text-left transition active:scale-[0.99]">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <Camera className="h-5 w-5 text-bronze" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-serif text-lg leading-tight text-foreground">
                      Smart Scan Condition
                    </p>
                    <span className="rounded-full border border-bronze/40 bg-bronze/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-bronze">
                      Beta
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Upload a photo · estimate wear & dirt
                  </p>
                </div>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ManualBtn({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button className="flex flex-col items-start gap-2 rounded-xl border border-stone-800 bg-stone-950 p-3 transition active:scale-[0.98]">
      <Icon className="h-4 w-4 text-bronze" />
      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-foreground">
        {label}
      </span>
    </button>
  );
}
