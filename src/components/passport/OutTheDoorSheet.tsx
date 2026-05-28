import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Footprints, Train, Car, X, MapPin, CloudRain } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createWearEvent, closeWearEvent } from "@/lib/owner.functions";

type Transport = "walking" | "transit" | "car";
type OpenEvent = {
  id: string;
  started_at: string;
  transport_mode: string;
  rain_probability: number | null;
  weather_snapshot: any;
} | null;

export function OutTheDoorSheet({
  open,
  onClose,
  assetId,
  openEvent,
}: {
  open: boolean;
  onClose: () => void;
  assetId: string;
  openEvent: OpenEvent;
}) {
  const qc = useQueryClient();
  const create = useServerFn(createWearEvent);
  const close = useServerFn(closeWearEvent);
  const [mode, setMode] = useState<Transport>("walking");
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!navigator.geolocation) {
      toast.error("Location not available");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await create({
            data: {
              asset_id: assetId,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              transport_mode: mode,
            },
          });
          toast.success(
            res.rain_probability > 0.4
              ? `Stepping out — rain likely (${Math.round(res.rain_probability * 100)}%).`
              : "Wear session started",
          );
          qc.invalidateQueries({ queryKey: ["openWearEvent", assetId] });
          qc.invalidateQueries({ queryKey: ["careInsight", assetId] });
          onClose();
        } catch (err: any) {
          toast.error(err?.message ?? "Could not start session");
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        toast.error(err.message || "Location permission needed");
        setBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function end() {
    if (!openEvent) return;
    setBusy(true);
    try {
      await close({ data: { wear_event_id: openEvent.id } });
      toast.success("Welcome back. Session closed.");
      qc.invalidateQueries({ queryKey: ["openWearEvent", assetId] });
      qc.invalidateQueries({ queryKey: ["careInsight", assetId] });
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not close session");
    } finally {
      setBusy(false);
    }
  }

  const weather = openEvent?.weather_snapshot as any;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-t-3xl border-t border-white/10 bg-stone-950 px-5 pb-8 pt-5"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">
                {openEvent ? "Wear session active" : "Out The Door"}
              </p>
              <button onClick={onClose} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {openEvent ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="font-serif text-2xl">You're wearing them.</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    Started {new Date(openEvent.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip icon={<MapPin className="h-3 w-3" />}>
                      {openEvent.transport_mode}
                    </Chip>
                    {weather?.condition && (
                      <Chip>{weather.condition} {Math.round(weather.temp_c ?? 0)}°</Chip>
                    )}
                    {(openEvent.rain_probability ?? 0) > 0 && (
                      <Chip icon={<CloudRain className="h-3 w-3" />}>
                        {Math.round((openEvent.rain_probability ?? 0) * 100)}% rain
                      </Chip>
                    )}
                  </div>
                </div>
                <button
                  disabled={busy}
                  onClick={end}
                  className="h-14 w-full rounded-lg bg-bronze font-bold text-stone-950 disabled:opacity-60"
                >
                  {busy ? "Closing…" : "Back Home"}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  How are you moving?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <ModeBtn active={mode === "walking"} onClick={() => setMode("walking")}>
                    <Footprints className="h-5 w-5" />
                    <span>Walking</span>
                  </ModeBtn>
                  <ModeBtn active={mode === "transit"} onClick={() => setMode("transit")}>
                    <Train className="h-5 w-5" />
                    <span>Transit</span>
                  </ModeBtn>
                  <ModeBtn active={mode === "car"} onClick={() => setMode("car")}>
                    <Car className="h-5 w-5" />
                    <span>Car</span>
                  </ModeBtn>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  We'll check the weather for where you are, then watch your wear quietly.
                </p>
                <button
                  disabled={busy}
                  onClick={start}
                  className="h-14 w-full rounded-lg bg-bronze font-bold text-stone-950 disabled:opacity-60"
                >
                  {busy ? "Checking conditions…" : "Step Out"}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Chip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border text-[11px] font-mono uppercase tracking-[0.15em] transition ${
        active
          ? "border-bronze/60 bg-bronze/10 text-bronze"
          : "border-white/10 bg-white/5 text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
