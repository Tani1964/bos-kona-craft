import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  adminListAssets,
  createAsset,
  getAssetForEdit,
  saveIdentity,
  saveProvenance,
  saveMakers,
  saveAtelier,
  saveDocumentary,
  getDocumentaryUploadUrl,
  claimAdminIfNone,
  isCurrentUserAdmin,
  adminListOwnership,
  adminAddOwnership,
  adminDeleteOwnership,
  adminListCareTools,
  adminUpsertCareTool,
  adminSetCareToolActive,
  adminListWearEvents,
  adminListCareInsights,
} from "@/lib/passport.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  LogOut,
  ExternalLink,
  Save,
  Trash2,
  Upload,
  Film,
  ShoppingBag,
  ArrowRightLeft,
  HandCoins,
  Gift,
  Phone,
  CalendarDays,
  Clock,
  Tag,
  StickyNote,
  History,
  Wrench,
  Activity,
  Footprints,
  Sparkles,
  Cloud,
  CloudRain,
  Eye,
  EyeOff,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    if (import.meta.env.SSR) return;
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw redirect({ to: "/login" });
    await claimAdminIfNone().catch(() => {});
    let isAdmin = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { admin } = await isCurrentUserAdmin().catch(() => ({ admin: false }));
      if (admin) {
        isAdmin = true;
        break;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    if (!isAdmin) throw redirect({ to: "/login" });
  },
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — Bos' Kọ́nà" }] }),
});

function AdminPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: assets } = useQuery({ queryKey: ["admin", "assets"], queryFn: () => adminListAssets() });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const create = useMutation({
    mutationFn: (input: { serial: string; model_name: string }) => createAsset({ data: input }),
    onSuccess: (a) => {
      toast.success("Asset created");
      qc.invalidateQueries({ queryKey: ["admin", "assets"] });
      setNewOpen(false);
      setSelectedId(a.id);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-stone-950 text-foreground grain">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-stone-950/80 px-5 py-4 backdrop-blur">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">Atelier · Admin</p>
          <h1 className="mt-1 font-serif text-xl leading-tight">Narrative Control</h1>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/login" });
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
        {/* Sidebar: asset list */}
        <aside className="border-r border-white/5 p-4 lg:h-[calc(100vh-73px)] lg:overflow-y-auto">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Passports
            </span>
            <button
              onClick={() => setNewOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-bronze text-stone-950"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {newOpen && (
            <NewAssetForm
              onCancel={() => setNewOpen(false)}
              onCreate={(v) => create.mutate(v)}
              busy={create.isPending}
            />
          )}

          <ul className="mt-2 space-y-1">
            {assets?.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => setSelectedId(a.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    selectedId === a.id
                      ? "border-bronze/50 bg-bronze/10"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                  }`}
                >
                  <p className="font-serif text-base leading-tight">{a.model_name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    {a.serial} · {a.status}
                  </p>
                </button>
              </li>
            ))}
            {assets?.length === 0 && (
              <li className="rounded-lg border border-dashed border-white/10 p-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                No passports yet
              </li>
            )}
          </ul>
        </aside>

        {/* Editor */}
        <main className="p-5 lg:p-8">
          {selectedId ? (
            <AssetEditor id={selectedId} />
          ) : (
            <div className="flex h-full min-h-[40vh] items-center justify-center rounded-2xl border border-dashed border-white/10">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Select a passport to edit
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function NewAssetForm({
  onCreate,
  onCancel,
  busy,
}: {
  onCreate: (v: { serial: string; model_name: string }) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [serial, setSerial] = useState("");
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onCreate({ serial: serial.trim(), model_name: name.trim() });
      }}
      className="mb-3 space-y-2 rounded-lg border border-bronze/30 bg-bronze/5 p-3"
    >
      <input
        required
        placeholder="Model name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-white/10 bg-stone-900 px-2 py-2 text-sm outline-none"
      />
      <input
        required
        placeholder="Serial (e.g. 9A12-B3C4)"
        value={serial}
        onChange={(e) => setSerial(e.target.value)}
        className="w-full rounded-md border border-white/10 bg-stone-900 px-2 py-2 text-sm font-mono outline-none"
      />
      <div className="flex gap-2">
        <button disabled={busy} className="flex-1 rounded-md bg-bronze py-2 text-xs font-bold text-stone-950">
          {busy ? "…" : "Create"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-white/10 px-3 py-2 text-xs">
          Cancel
        </button>
      </div>
    </form>
  );
}

function AssetEditor({ id }: { id: string }) {
  const { data: asset, isLoading } = useQuery({
    queryKey: ["admin", "asset", id],
    queryFn: () => getAssetForEdit({ data: { id } }),
  });

  if (isLoading || !asset) return <p className="font-mono text-xs text-muted-foreground">Loading…</p>;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">
            {asset.serial} · Lot {asset.lot ?? "—"}
          </p>
          <h2 className="mt-1 font-serif text-3xl leading-tight">{asset.model_name}</h2>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.2em]"
        >
          View <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <Tabs defaultValue="identity">
        <TabsList className="mb-6 grid w-full max-w-3xl grid-cols-6 bg-white/5">
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="provenance">Provenance</TabsTrigger>
          <TabsTrigger value="makers">Makers</TabsTrigger>
          <TabsTrigger value="atelier">Atelier</TabsTrigger>
          <TabsTrigger value="documentary">Documentary</TabsTrigger>
          <TabsTrigger value="ownership">Ownership</TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <IdentityTab asset={asset} />
        </TabsContent>
        <TabsContent value="provenance">
          <ProvenanceTab asset={asset} />
        </TabsContent>
        <TabsContent value="makers">
          <MakersTab asset={asset} />
        </TabsContent>
        <TabsContent value="atelier">
          <AtelierTab asset={asset} />
        </TabsContent>
        <TabsContent value="documentary">
          <DocumentaryTab asset={asset} />
        </TabsContent>
        <TabsContent value="ownership">
          <OwnershipTab asset={asset} />
        </TabsContent>
      </Tabs>

      <ReadOnlyTelemetry asset={asset} />
    </motion.div>
  );
}

function field(label: string, child: React.ReactNode) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </span>
      {child}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-white/10 bg-stone-900 px-3 py-2 text-sm outline-none focus:border-bronze/50";

function SaveBar({ onSave, busy, dirty }: { onSave: () => void; busy: boolean; dirty: boolean }) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        onClick={onSave}
        disabled={busy || !dirty}
        className="inline-flex items-center gap-2 rounded-lg bg-bronze px-4 py-2 text-sm font-bold text-stone-950 disabled:opacity-50"
      >
        <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save changes"}
      </button>
      {dirty && (
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bronze">Unsaved</span>
      )}
    </div>
  );
}

function useSave<T>(fn: (v: T) => Promise<any>, key: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });
}

function IdentityTab({ asset }: { asset: any }) {
  const [v, setV] = useState({
    model_name: asset.model_name,
    status: asset.status,
    lot: asset.lot ?? "",
  });
  const dirty = JSON.stringify(v) !== JSON.stringify({ model_name: asset.model_name, status: asset.status, lot: asset.lot ?? "" });
  const m = useSave((d: any) => saveIdentity({ data: d }), ["admin", "asset", asset.id]);
  return (
    <div className="grid max-w-2xl gap-4">
      {field("Model name", <input className={inputCls} value={v.model_name} onChange={(e) => setV({ ...v, model_name: e.target.value })} />)}
      {field("Status", <input className={inputCls} value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })} placeholder="New, Breaking In, Seasoned…" />)}
      {field("Lot", <input className={inputCls} value={v.lot} onChange={(e) => setV({ ...v, lot: e.target.value })} placeholder="014/200" />)}
      <SaveBar busy={m.isPending} dirty={dirty} onSave={() => m.mutate({ id: asset.id, ...v, lot: v.lot || null })} />
    </div>
  );
}

const emptyStage = { position: 0, icon_key: "leaf", label: "", title: "", body: "", location: "", date_text: "" };

function ProvenanceTab({ asset }: { asset: any }) {
  const [rows, setRows] = useState<any[]>(asset.provenance_stages ?? []);
  const m = useSave((d: any) => saveProvenance({ data: d }), ["admin", "asset", asset.id]);
  return (
    <div className="max-w-3xl space-y-4">
      {rows.map((s, i) => (
        <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">Stage {i + 1}</span>
            <button onClick={() => setRows(rows.filter((_, x) => x !== i))} className="text-muted-foreground hover:text-terracotta">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("Label", <input className={inputCls} value={s.label} onChange={(e) => setRows(rows.map((r, x) => x === i ? { ...r, label: e.target.value } : r))} />)}
            {field("Icon (leaf / scissors / hammer / stamp)", <input className={inputCls} value={s.icon_key} onChange={(e) => setRows(rows.map((r, x) => x === i ? { ...r, icon_key: e.target.value } : r))} />)}
            {field("Title", <input className={inputCls} value={s.title} onChange={(e) => setRows(rows.map((r, x) => x === i ? { ...r, title: e.target.value } : r))} />)}
            {field("Date text", <input className={inputCls} value={s.date_text} onChange={(e) => setRows(rows.map((r, x) => x === i ? { ...r, date_text: e.target.value } : r))} />)}
            {field("Location", <input className={inputCls} value={s.location} onChange={(e) => setRows(rows.map((r, x) => x === i ? { ...r, location: e.target.value } : r))} />)}
          </div>
          <div className="mt-3">
            {field("Body", <textarea className={inputCls + " min-h-[80px]"} value={s.body} onChange={(e) => setRows(rows.map((r, x) => x === i ? { ...r, body: e.target.value } : r))} />)}
          </div>
        </div>
      ))}
      <button
        onClick={() => setRows([...rows, { ...emptyStage, position: rows.length }])}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-3 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground hover:border-bronze/40 hover:text-bronze"
      >
        <Plus className="h-4 w-4" /> Add stage
      </button>
      <SaveBar busy={m.isPending} dirty={true} onSave={() => m.mutate({ asset_id: asset.id, stages: rows })} />
    </div>
  );
}

function MakersTab({ asset }: { asset: any }) {
  const [rows, setRows] = useState<any[]>(asset.makers ?? []);
  const m = useSave((d: any) => saveMakers({ data: d }), ["admin", "asset", asset.id]);
  return (
    <div className="max-w-2xl space-y-3">
      {rows.map((mk, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_80px_40px] gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <input className={inputCls} placeholder="Name" value={mk.name} onChange={(e) => setRows(rows.map((r, x) => x === i ? { ...r, name: e.target.value } : r))} />
          <input className={inputCls} placeholder="Role" value={mk.role} onChange={(e) => setRows(rows.map((r, x) => x === i ? { ...r, role: e.target.value } : r))} />
          <input className={inputCls} placeholder="12 yrs" value={mk.years} onChange={(e) => setRows(rows.map((r, x) => x === i ? { ...r, years: e.target.value } : r))} />
          <button onClick={() => setRows(rows.filter((_, x) => x !== i))} className="text-muted-foreground hover:text-terracotta">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        onClick={() => setRows([...rows, { position: rows.length, name: "", role: "", years: "" }])}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-3 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground hover:border-bronze/40 hover:text-bronze"
      >
        <Plus className="h-4 w-4" /> Add maker
      </button>
      <SaveBar busy={m.isPending} dirty={true} onSave={() => m.mutate({ asset_id: asset.id, makers: rows })} />
    </div>
  );
}

function AtelierTab({ asset }: { asset: any }) {
  const at = asset.atelier ?? { name: "", location: "", lat: null, lng: null };
  const [v, setV] = useState({
    name: at.name ?? "",
    location: at.location ?? "",
    lat: at.lat ?? "",
    lng: at.lng ?? "",
  });
  const m = useSave((d: any) => saveAtelier({ data: d }), ["admin", "asset", asset.id]);
  return (
    <div className="grid max-w-xl gap-4">
      {field("Name", <input className={inputCls} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />)}
      {field("Location (display)", <input className={inputCls} value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} />)}
      <div className="grid grid-cols-2 gap-3">
        {field("Latitude", <input className={inputCls} value={v.lat} onChange={(e) => setV({ ...v, lat: e.target.value })} />)}
        {field("Longitude", <input className={inputCls} value={v.lng} onChange={(e) => setV({ ...v, lng: e.target.value })} />)}
      </div>
      <SaveBar
        busy={m.isPending}
        dirty={true}
        onSave={() =>
          m.mutate({
            asset_id: asset.id,
            name: v.name,
            location: v.location,
            lat: v.lat === "" ? null : Number(v.lat),
            lng: v.lng === "" ? null : Number(v.lng),
          })
        }
      />
    </div>
  );
}

function DocumentaryTab({ asset }: { asset: any }) {
  const d = asset.documentary ?? {};
  const [v, setV] = useState({
    title: d.title ?? "",
    runtime: d.runtime ?? "",
    year: d.year ?? "",
    format: d.format ?? "",
    synopsis: d.synopsis ?? "",
    video_path: d.video_path ?? null,
    chapters: d.chapters ?? [],
    credits: d.credits ?? [],
  });
  const [uploading, setUploading] = useState(false);
  const m = useSave((data: any) => saveDocumentary({ data }), ["admin", "asset", asset.id]);

  async function uploadVideo(file: File) {
    if (file.size > 500 * 1024 * 1024) {
      toast.error("Video must be under 500 MB");
      return;
    }
    setUploading(true);
    try {
      const { path, token } = await getDocumentaryUploadUrl({
        data: { asset_id: asset.id, filename: file.name.replace(/[^a-zA-Z0-9._-]/g, "_") },
      });
      const { error } = await supabase.storage.from("documentary").uploadToSignedUrl(path, token, file);
      if (error) throw error;
      setV((s) => ({ ...s, video_path: path }));
      toast.success("Video uploaded — remember to Save");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Video uploader */}
      <div className="rounded-xl border border-bronze/30 bg-gradient-to-br from-bronze/10 to-transparent p-4">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-bronze" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">Documentary video</span>
        </div>
        {v.video_path ? (
          <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">{v.video_path}</p>
        ) : (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">No video uploaded yet.</p>
        )}
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-mono uppercase tracking-[0.2em] hover:bg-white/10">
          <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload video (mp4/mov ≤500MB)"}
          <input
            type="file"
            accept="video/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {field("Title", <input className={inputCls} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />)}
        {field("Runtime", <input className={inputCls} value={v.runtime} onChange={(e) => setV({ ...v, runtime: e.target.value })} />)}
        {field("Year", <input className={inputCls} value={v.year} onChange={(e) => setV({ ...v, year: e.target.value })} />)}
        {field("Format", <input className={inputCls} value={v.format} onChange={(e) => setV({ ...v, format: e.target.value })} />)}
      </div>
      {field("Synopsis", <textarea className={inputCls + " min-h-[100px]"} value={v.synopsis} onChange={(e) => setV({ ...v, synopsis: e.target.value })} />)}

      <ListEditor
        label="Chapters"
        rows={v.chapters}
        cols={["t", "time"]}
        placeholders={["Chapter title", "00:00"]}
        onChange={(rows) => setV({ ...v, chapters: rows })}
      />
      <ListEditor
        label="Credits"
        rows={v.credits}
        cols={["role", "name"]}
        placeholders={["Role", "Name"]}
        onChange={(rows) => setV({ ...v, credits: rows })}
      />

      <SaveBar
        busy={m.isPending}
        dirty={true}
        onSave={() => m.mutate({ asset_id: asset.id, ...v })}
      />
    </div>
  );
}

function ListEditor({
  label,
  rows,
  cols,
  placeholders,
  onChange,
}: {
  label: string;
  rows: any[];
  cols: string[];
  placeholders: string[];
  onChange: (rows: any[]) => void;
}) {
  return (
    <div>
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </span>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_40px] gap-2">
            {cols.map((c, j) => (
              <input
                key={c}
                className={inputCls}
                placeholder={placeholders[j]}
                value={r[c] ?? ""}
                onChange={(e) => onChange(rows.map((x, ix) => (ix === i ? { ...x, [c]: e.target.value } : x)))}
              />
            ))}
            <button
              onClick={() => onChange(rows.filter((_, ix) => ix !== i))}
              className="text-muted-foreground hover:text-terracotta"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...rows, Object.fromEntries(cols.map((c) => [c, ""]))])}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-white/15 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground hover:border-bronze/40 hover:text-bronze"
        >
          <Plus className="h-3 w-3" /> Add row
        </button>
      </div>
    </div>
  );
}

function ReadOnlyTelemetry({ asset }: { asset: any }) {
  const t = asset.asset_telemetry ?? {};
  return (
    <div className="mt-10 max-w-3xl rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Buyer telemetry · read-only
      </p>
      <p className="mt-1 mb-4 font-mono text-[10px] text-muted-foreground/60">
        Driven by the State Engine — flows from owner activity, never edited here.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ["Wears", t.wears],
          ["NFC scans", t.nfc_scans],
          ["Care entries", t.care_entries],
          ["Repairs", t.repairs],
          ["Age (days)", t.age_days],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-lg border border-white/5 bg-stone-900 p-3 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">{l}</p>
            <p className="mt-1 font-serif text-xl">{v ?? 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OwnershipTab({ asset }: { asset: any }) {
  const qc = useQueryClient();
  const { data: records, isLoading } = useQuery({
    queryKey: ["admin", "ownership", asset.id],
    queryFn: () => adminListOwnership({ data: { asset_id: asset.id } }),
  });
  const [form, setForm] = useState({
    owner_phone: "",
    owner_ref: "",
    store_order_id: "",
    event_type: "transfer" as "purchase" | "transfer" | "resale" | "gift",
    notes: "",
  });
  const add = useMutation({
    mutationFn: (d: any) => adminAddOwnership({ data: d }),
    onSuccess: () => {
      toast.success("Ownership record added — previous owner access revoked");
      qc.invalidateQueries({ queryKey: ["admin", "ownership", asset.id] });
      setForm({ owner_phone: "", owner_ref: "", store_order_id: "", event_type: "transfer", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => adminDeleteOwnership({ data: { id } }),
    onSuccess: () => {
      toast.success("Record removed");
      qc.invalidateQueries({ queryKey: ["admin", "ownership", asset.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const current = records?.[0];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-xl border border-bronze/30 bg-gradient-to-br from-bronze/10 to-transparent p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">Current Owner</p>
        {isLoading ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">Loading…</p>
        ) : current ? (
          <div className="mt-2">
            <p className="font-serif text-lg">{current.owner_ref ?? "Anonymous"}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {current.owner_phone ?? "—"} · {current.event_type} ·{" "}
              {new Date(current.acquired_at).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">No ownership records yet.</p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate({
            asset_id: asset.id,
            owner_phone: form.owner_phone.trim() || null,
            owner_ref: form.owner_ref.trim() || null,
            store_order_id: form.store_order_id.trim() || null,
            event_type: form.event_type,
            notes: form.notes.trim() || null,
          });
        }}
        className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Transfer / Add owner
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("Owner phone (E.164, e.g. +2348012345678)",
            <input className={inputCls} value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} placeholder="+234..." />
          )}
          {field("Owner name / reference",
            <input className={inputCls} value={form.owner_ref} onChange={(e) => setForm({ ...form, owner_ref: e.target.value })} />
          )}
          {field("Store order ID (optional)",
            <input className={inputCls} value={form.store_order_id} onChange={(e) => setForm({ ...form, store_order_id: e.target.value })} />
          )}
          {field("Event type",
            <select className={inputCls} value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value as any })}>
              <option value="purchase">Purchase</option>
              <option value="transfer">Transfer</option>
              <option value="resale">Resale</option>
              <option value="gift">Gift</option>
            </select>
          )}
        </div>
        {field("Notes", <textarea className={inputCls + " min-h-[60px]"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />)}
        <button
          disabled={add.isPending}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-bronze px-4 py-2 text-sm font-bold text-stone-950 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {add.isPending ? "Saving…" : "Record ownership event"}
        </button>
        <p className="font-mono text-[10px] text-muted-foreground/80">
          Adding a record makes this phone the latest owner. Previous owner loses passport access immediately.
        </p>
      </form>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-bronze" />
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Ownership History Timeline
          </p>
        </div>

        {records && records.length > 0 ? (
          <OwnershipTimeline records={records} onDelete={(id) => del.mutate(id)} deleting={del.isPending} />
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              No ownership records yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function OwnershipTimeline({
  records,
  onDelete,
  deleting,
}: {
  records: any[];
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const EVENT_META: Record<string, { label: string; icon: React.ReactNode; color: string; ring: string; bg: string }> = {
    purchase: {
      label: "Purchase",
      icon: <ShoppingBag className="h-3.5 w-3.5" />,
      color: "text-emerald-400",
      ring: "ring-emerald-400/30",
      bg: "bg-emerald-400/10",
    },
    transfer: {
      label: "Transfer",
      icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
      color: "text-sky-400",
      ring: "ring-sky-400/30",
      bg: "bg-sky-400/10",
    },
    resale: {
      label: "Resale",
      icon: <HandCoins className="h-3.5 w-3.5" />,
      color: "text-amber-400",
      ring: "ring-amber-400/30",
      bg: "bg-amber-400/10",
    },
    gift: {
      label: "Gift",
      icon: <Gift className="h-3.5 w-3.5" />,
      color: "text-rose-400",
      ring: "ring-rose-400/30",
      bg: "bg-rose-400/10",
    },
  };

  const sorted = [...records].sort(
    (a, b) => new Date(b.acquired_at).getTime() - new Date(a.acquired_at).getTime(),
  );

  return (
    <ol className="relative space-y-0 border-l border-white/10 pl-6">
      {sorted.map((r, i) => {
        const meta = EVENT_META[r.event_type] ?? {
          label: r.event_type,
          icon: <Tag className="h-3.5 w-3.5" />,
          color: "text-muted-foreground",
          ring: "ring-white/10",
          bg: "bg-white/5",
        };
        const isLatest = i === 0;
        const dt = new Date(r.acquired_at);

        return (
          <motion.li
            key={r.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            className="relative pb-6"
          >
            {/* Timeline dot */}
            <span
              className={`absolute -left-[31px] top-1 flex h-5 w-5 items-center justify-center rounded-full ${meta.bg} ring-2 ${meta.ring}`}
            >
              <span className={meta.color}>{meta.icon}</span>
            </span>

            {/* Card */}
            <div
              className={`rounded-xl border p-4 transition hover:border-white/15 ${
                isLatest
                  ? "border-bronze/30 bg-gradient-to-br from-bronze/10 to-transparent"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[9px] uppercase tracking-[0.3em] ${meta.color}`}>
                      {meta.label}
                    </span>
                    {isLatest && (
                      <span className="rounded-full bg-bronze/15 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-bronze">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-serif text-base leading-tight">
                    {r.owner_ref ?? "Anonymous Owner"}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(r.id)}
                  disabled={deleting}
                  className="shrink-0 text-muted-foreground hover:text-terracotta"
                  title="Delete record"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Detail rows */}
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {r.owner_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground/60" />
                    <span className="font-mono text-[11px] text-foreground">{r.owner_phone}</span>
                  </div>
                )}
                {r.store_order_id && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-3 w-3 text-muted-foreground/60" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      Order // <span className="text-foreground">{r.store_order_id}</span>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3 w-3 text-muted-foreground/60" />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground/60" />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              {r.notes && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                  <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50" />
                  <p className="font-serif text-sm leading-snug text-muted-foreground">{r.notes}</p>
                </div>
              )}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
