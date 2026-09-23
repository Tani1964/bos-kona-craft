// Calm owner controls: what the passport is allowed to notice, and whether it
// may reach out. Both reversible, neither required.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Sparkles } from "lucide-react";
import {
  updateWearSettings,
  registerPushDevice,
} from "@/lib/wear.functions";
import { useWearState } from "@/components/passport/PendingWearPrompt";
import { enablePush } from "@/lib/push/enablePush";

function Toggle({
  on,
  onChange,
  label,
  hint,
  icon,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex gap-3">
        <div className="mt-0.5 text-bronze">{icon}</div>
        <div>
          <p className="text-sm text-foreground">{label}</p>
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
            {hint}
          </p>
        </div>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`mt-1 h-6 w-11 shrink-0 rounded-full border transition ${
          on ? "border-bronze bg-bronze/80" : "border-white/15 bg-white/10"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-stone-950 transition-transform ${
            on ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export function WearSettings() {
  const { data } = useWearState();
  const qc = useQueryClient();
  const save = useServerFn(updateWearSettings);
  const register = useServerFn(registerPushDevice);
  const [note, setNote] = useState<string | null>(null);

  const mSave = useMutation({
    mutationFn: (patch: {
      wear_intelligence?: boolean;
      notifications_enabled?: boolean;
    }) => save({ data: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wearState"] }),
  });

  const mEnable = useMutation({
    mutationFn: async () => {
      const result = await enablePush();
      if (result.status === "registered") {
        await register({
          data: { token: result.token, label: navigator.userAgent.slice(0, 100) },
        });
      }
      return result;
    },
    onSuccess: (result) => {
      setNote(
        result.status === "registered"
          ? "This device will receive the passport's messages."
          : result.status === "open-in-new-tab"
            ? "Open the passport in its own tab (or from your home screen) to allow messages."
            : result.status === "denied"
              ? "Messages are blocked for this site — allow notifications in your browser settings."
              : result.status === "unsupported"
                ? "This browser can't receive messages. Install the passport to your home screen and try again."
                : "Messaging isn't set up yet on our side — your passport still keeps everything in-app.",
      );
      qc.invalidateQueries({ queryKey: ["wearState"] });
    },
    onError: () => setNote("Couldn't turn messages on. Please try again."),
  });

  if (!data?.owner || !data.settings) return null;
  const s = data.settings;

  return (
    <section className="mt-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        What the passport notices
      </p>

      <div className="mt-3 space-y-2">
        <Toggle
          icon={<Sparkles className="h-4 w-4" />}
          on={s.wear_intelligence}
          onChange={(v) => mSave.mutate({ wear_intelligence: v })}
          label="Let the passport notice outings"
          hint="Checked only while the passport is open. No address is ever stored, and nothing is recorded until you confirm it."
        />
        <Toggle
          icon={<BellRing className="h-4 w-4" />}
          on={s.notifications_enabled}
          onChange={(v) => mSave.mutate({ notifications_enabled: v })}
          label="Allow the passport to reach out"
          hint="A rare message: weather worth knowing about, or a quick 'wearing them today?'. Never more than one a day."
        />
      </div>

      {s.notifications_enabled && (
        <button
          onClick={() => mEnable.mutate()}
          disabled={mEnable.isPending}
          className="mt-3 h-11 w-full rounded-lg border border-bronze/40 bg-bronze/10 text-sm font-bold text-bronze active:scale-[0.98] disabled:opacity-60"
        >
          {mEnable.isPending ? "Setting up…" : "Allow messages on this device"}
        </button>
      )}

      {note && (
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {note}
        </p>
      )}
    </section>
  );
}
