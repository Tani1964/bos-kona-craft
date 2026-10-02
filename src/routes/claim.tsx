import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { claimByPhone, claimBySerial } from "@/lib/owner.functions";
import { markPassportClaimed } from "@/pwa/installState";

const searchSchema = z.object({ serial: z.string().optional() });

export const Route = createFileRoute("/claim")({
  validateSearch: (s) => searchSchema.parse(s),
  component: ClaimPage,
  head: () => ({ meta: [{ title: "Open your passport — Bos' Kọ́nà" }] }),
});

function ClaimPage() {
  const { serial: serialFromQuery } = Route.useSearch();
  const navigate = useNavigate();
  const claimPhone = useServerFn(claimByPhone);
  const claimSerial = useServerFn(claimBySerial);
  const [serial, setSerial] = useState(serialFromQuery ?? "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const trimmedSerial = serial.trim();
      if (trimmedSerial) {
        await claimSerial({
          data: { serial: trimmedSerial, phone: phone.trim() },
        });
      } else {
        await claimPhone({ data: { phone: phone.trim() } });
      }
      markPassportClaimed();
      toast.success("Passport unlocked");
      navigate({ to: "/me" });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not open passport");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-foreground grain flex items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">
          Craft Passport
        </p>
        <h1 className="mt-3 font-serif text-3xl leading-tight">Open your passport</h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Enter the phone number you gave the store at purchase.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          {serialFromQuery && (
            <input
              placeholder="Serial (from your box)"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-stone-900 px-3 py-3 text-sm outline-none focus:border-bronze/50"
            />
          )}
          <input
            required
            type="tel"
            inputMode="tel"
            placeholder="+234 80 1234 5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-stone-900 px-3 py-3 text-sm outline-none focus:border-bronze/50"
          />
          <button
            disabled={busy}
            className="h-12 w-full rounded-lg bg-bronze font-bold text-stone-950 disabled:opacity-60"
          >
            {busy ? "Opening…" : "Open passport"}
          </button>
        </form>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Phone must match the number on file at the store. Transferred passports
          revoke access immediately.
        </p>
      </motion.div>
    </div>
  );
}
