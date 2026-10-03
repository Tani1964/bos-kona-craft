// The owner's own message history — what the passport sent to this phone,
// and whether it arrived. Quiet, reverse-chronological, never a feed.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, CloudRain, Footprints, MessageCircle, Sparkles } from "lucide-react";
import { listMyNotifications } from "@/lib/wear.functions";

const KIND_META: Record<string, { label: string; icon: React.ReactNode }> = {
  test: { label: "Test message", icon: <BellRing className="h-3.5 w-3.5" /> },
  wear_prompt: { label: "Wearing them today?", icon: <Footprints className="h-3.5 w-3.5" /> },
  rain_warning: { label: "Weather warning", icon: <CloudRain className="h-3.5 w-3.5" /> },
  care_whisper: { label: "Care whisper", icon: <Sparkles className="h-3.5 w-3.5" /> },
};

const STATUS_TEXT: Record<string, string> = {
  sent: "Delivered to your device",
  failed: "Couldn't reach this device",
  unavailable: "Messages weren't set up yet",
  no_devices: "No device was registered yet",
  opted_out: "Messages were turned off",
};

function when(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const mins = Math.round((now - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MyMessages() {
  const fetchMessages = useServerFn(listMyNotifications);
  const { data } = useQuery({
    queryKey: ["myNotifications"],
    queryFn: () => fetchMessages(),
  });

  if (!data || data.length === 0) return null;

  return (
    <section className="mt-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Messages from your passport
      </p>
      <div className="mt-3 space-y-2">
        {data.map((n: any) => {
          const meta = KIND_META[n.kind] ?? {
            label: "Message",
            icon: <MessageCircle className="h-3.5 w-3.5" />,
          };
          const model = n.assets?.model_name as string | undefined;
          return (
            <div
              key={n.id}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="mt-0.5 text-bronze">{meta.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{meta.label}</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {when(n.created_at)}
                  {model ? ` · ${model}` : ""}
                </p>
                <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
                  {STATUS_TEXT[n.status] ?? n.status}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
