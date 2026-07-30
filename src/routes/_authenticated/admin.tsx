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
  adminListCronRuns,
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
  Timer,
  CheckCircle2,
  XCircle,
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

      <Tabs defaultValue="shoes" className="w-full">
        <div className="border-b border-white/5 bg-stone-950/60 px-5 py-3">
          <TabsList className="bg-white/5">
            <TabsTrigger value="shoes" className="gap-2">
              <Footprints className="h-3.5 w-3.5" /> Shoes
            </TabsTrigger>
            <TabsTrigger value="care" className="gap-2">
              <Wrench className="h-3.5 w-3.5" /> Care Products
            </TabsTrigger>
            <TabsTrigger value="observability" className="gap-2">
              <Activity className="h-3.5 w-3.5" /> Observability
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="shoes" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
            {/* Sidebar: asset list */}
            <aside className="border-r border-white/5 p-4 lg:h-[calc(100vh-130px)] lg:overflow-y-auto">
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
        </TabsContent>

        <TabsContent value="care" className="mt-0">
          <main className="p-5 lg:p-8">
            <CareToolsAdmin />
          </main>
        </TabsContent>

        <TabsContent value="observability" className="mt-0">
          <main className="p-5 lg:p-8">
            <ObservabilityAdmin />
          </main>
        </TabsContent>
      </Tabs>

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

// ── Care Products (care_tools catalog) ────────────────────────

function CareToolsAdmin() {
  const qc = useQueryClient();
  const { data: tools, isLoading } = useQuery({
    queryKey: ["admin", "careTools"],
    queryFn: () => adminListCareTools(),
  });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const upsert = useMutation({
    mutationFn: (d: any) => adminUpsertCareTool({ data: d }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "careTools"] });
      setAdding(false);
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (d: { tool_id: string; active: boolean }) =>
      adminSetCareToolActive({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "careTools"] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">
            Catalog · Care Products
          </p>
          <h2 className="mt-1 font-serif text-3xl leading-tight">Care Tools</h2>
          <p className="mt-2 max-w-xl font-mono text-[11px] text-muted-foreground">
            The products Bos' Kọ́nà ships and references in care sessions. Mark old SKUs
            inactive when superseded — owners' historical records stay intact.
          </p>
        </div>
        <button
          onClick={() => {
            setAdding(true);
            setEditingId(null);
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-bronze px-4 py-2 text-sm font-bold text-stone-950"
        >
          <Plus className="h-4 w-4" /> New tool
        </button>
      </div>

      {adding && (
        <CareToolForm
          onSubmit={(v) => upsert.mutate(v)}
          onCancel={() => setAdding(false)}
          busy={upsert.isPending}
        />
      )}

      {isLoading ? (
        <p className="font-mono text-xs text-muted-foreground">Loading…</p>
      ) : tools && tools.length > 0 ? (
        <div className="space-y-2">
          {tools.map((t: any) =>
            editingId === t.tool_id ? (
              <CareToolForm
                key={t.tool_id}
                initial={t}
                onSubmit={(v) => upsert.mutate(v)}
                onCancel={() => setEditingId(null)}
                busy={upsert.isPending}
              />
            ) : (
              <div
                key={t.tool_id}
                className={`flex items-center gap-4 rounded-xl border p-4 transition ${
                  t.active
                    ? "border-white/10 bg-white/[0.02]"
                    : "border-white/5 bg-white/[0.01] opacity-60"
                }`}
              >
                <Wrench className="h-4 w-4 text-bronze" />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base leading-tight">{t.tool_name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    {t.tool_id} · {t.tool_type} · weight {t.kfi_weight}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] text-bronze/80">
                    {tagUrl(t.tool_id)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tagUrl(t.tool_id));
                    toast.success("Tag URL copied — write this to the NFC chip");
                  }}
                  className="rounded-md border border-bronze/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-bronze hover:bg-bronze/10"
                >
                  Copy tag URL
                </button>

                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] ${
                    t.active
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-white/10 text-muted-foreground"
                  }`}
                >
                  {t.active ? "Active" : "Discontinued"}
                </span>
                <button
                  onClick={() => setEditingId(t.tool_id)}
                  className="rounded-md border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-white/5"
                >
                  Edit
                </button>
                <button
                  onClick={() =>
                    toggle.mutate({ tool_id: t.tool_id, active: !t.active })
                  }
                  className="rounded-md border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-white/5"
                >
                  {t.active ? "Retire" : "Reactivate"}
                </button>
              </div>
            ),
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            No care tools yet
          </p>
        </div>
      )}
    </div>
  );
}

function CareToolForm({
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  initial?: any;
  onSubmit: (v: any) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [v, setV] = useState({
    tool_id: initial?.tool_id ?? "",
    tool_name: initial?.tool_name ?? "",
    tool_type: initial?.tool_type ?? "",
    kfi_weight: initial?.kfi_weight ?? 1,
    active: initial?.active ?? true,
  });
  const editing = !!initial;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...v, kfi_weight: Number(v.kfi_weight) });
      }}
      className="mb-4 grid gap-3 rounded-xl border border-bronze/30 bg-bronze/5 p-4 sm:grid-cols-2"
    >
      {field(
        "Tool ID (slug)",
        <input
          required
          disabled={editing}
          className={inputCls + " disabled:opacity-60"}
          value={v.tool_id}
          placeholder="airform_v2"
          onChange={(e) => setV({ ...v, tool_id: e.target.value })}
        />,
      )}
      {field(
        "Display name",
        <input
          required
          className={inputCls}
          value={v.tool_name}
          placeholder="AirForm v2"
          onChange={(e) => setV({ ...v, tool_name: e.target.value })}
        />,
      )}
      {field(
        "Type",
        <input
          required
          className={inputCls}
          value={v.tool_type}
          placeholder="conditioner / brush / airform / cloth"
          onChange={(e) => setV({ ...v, tool_type: e.target.value })}
        />,
      )}
      {field(
        "KFI weight (0–10)",
        <input
          type="number"
          step="0.1"
          min="0"
          max="10"
          className={inputCls}
          value={v.kfi_weight}
          onChange={(e) => setV({ ...v, kfi_weight: e.target.value as any })}
        />,
      )}
      <label className="flex items-center gap-2 sm:col-span-2">
        <input
          type="checkbox"
          checked={v.active}
          onChange={(e) => setV({ ...v, active: e.target.checked })}
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Active (available in current catalog)
        </span>
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-bronze px-4 py-2 text-sm font-bold text-stone-950 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {busy ? "Saving…" : editing ? "Save" : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Observability (wear_events + care_insights, read-only) ────

function ObservabilityAdmin() {
  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">
          Read-only · System health
        </p>
        <h2 className="mt-1 font-serif text-3xl leading-tight">Observability</h2>
        <p className="mt-2 max-w-2xl font-mono text-[11px] text-muted-foreground">
          Watch the system work. Tune the stress formula and CareWhisper prompts based
          on real owner activity — never edit or delete owner data from here.
        </p>
      </div>

      <Tabs defaultValue="wear">
        <TabsList className="mb-4 bg-white/5">
          <TabsTrigger value="wear" className="gap-2">
            <Footprints className="h-3.5 w-3.5" /> Wear events
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Sparkles className="h-3.5 w-3.5" /> Care insights
          </TabsTrigger>
          <TabsTrigger value="cron" className="gap-2">
            <Timer className="h-3.5 w-3.5" /> Cron runs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wear">
          <WearEventsFeed />
        </TabsContent>
        <TabsContent value="insights">
          <CareInsightsFeed />
        </TabsContent>
        <TabsContent value="cron">
          <CronRunsFeed />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function maskPhone(p?: string | null) {
  if (!p) return "—";
  if (p.length < 6) return p;
  return `${p.slice(0, 4)}…${p.slice(-3)}`;
}

function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return `${d.toLocaleDateString(undefined, { month: "short", day: "2-digit" })} ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

function WearEventsFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "wearEvents"],
    queryFn: () => adminListWearEvents({ data: { limit: 100 } }),
  });

  if (isLoading) return <p className="font-mono text-xs text-muted-foreground">Loading…</p>;
  if (!data || data.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-8 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        No wear events recorded yet
      </div>
    );

  return (
    <>
      <StressStatsPanel events={data} />
      {renderWearTable(data)}
    </>
  );
}

function renderWearTable(data: any[]) {
  return (

    <div className="overflow-hidden rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Started</th>
            <th className="px-3 py-2">Asset</th>
            <th className="px-3 py-2">Owner</th>
            <th className="px-3 py-2">Mode</th>
            <th className="px-3 py-2">Weather</th>
            <th className="px-3 py-2 text-right">Rain</th>
            <th className="px-3 py-2 text-right">Stress</th>
            <th className="px-3 py-2">Duration</th>
          </tr>
        </thead>
        <tbody>
          {data.map((w: any) => {
            const cond = w.weather_snapshot?.condition ?? "—";
            const temp = w.weather_snapshot?.temp_c;
            const dur = w.ended_at
              ? `${Math.round((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000)}m`
              : "open";
            const rain = w.rain_probability ?? 0;
            return (
              <tr key={w.id} className="border-t border-white/5">
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  {fmtDateTime(w.started_at)}
                </td>
                <td className="px-3 py-2">
                  <p className="font-serif text-[13px] leading-tight">
                    {w.assets?.model_name ?? "—"}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    {w.assets?.serial ?? "—"}
                  </p>
                </td>
                <td className="px-3 py-2 font-mono text-[11px]">{maskPhone(w.owner_phone)}</td>
                <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  {w.transport_mode}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                    {rain > 0.4 ? (
                      <CloudRain className="h-3 w-3 text-sky-300" />
                    ) : (
                      <Cloud className="h-3 w-3" />
                    )}
                    {cond}
                    {typeof temp === "number" ? ` · ${Math.round(temp)}°` : ""}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-[11px]">
                  {Math.round(rain * 100)}%
                </td>
                <td className="px-3 py-2 text-right font-mono text-[11px] text-bronze">
                  {w.effective_stress != null ? Number(w.effective_stress).toFixed(2) : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{dur}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StressStatsPanel({ events }: { events: any[] }) {
  const closed = events.filter((e) => e.effective_stress != null);
  const stresses = closed.map((e) => Number(e.effective_stress)).sort((a, b) => a - b);
  const avg = stresses.length ? stresses.reduce((a, b) => a + b, 0) / stresses.length : 0;
  const p = (q: number) =>
    stresses.length ? stresses[Math.min(stresses.length - 1, Math.floor(stresses.length * q))] : 0;

  const byMode = new Map<string, { count: number; sum: number }>();
  for (const e of closed) {
    const k = e.transport_mode ?? "unknown";
    const cur = byMode.get(k) ?? { count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += Number(e.effective_stress);
    byMode.set(k, cur);
  }

  const rainEvents = events.filter((e) => (e.rain_probability ?? 0) > 0.4);
  const humidities = events
    .map((e) => Number(e.weather_snapshot?.humidity))
    .filter((n) => Number.isFinite(n));
  const avgHumidity = humidities.length
    ? humidities.reduce((a, b) => a + b, 0) / humidities.length
    : null;

  const open = events.length - closed.length;
  const maxStress = stresses.length ? stresses[stresses.length - 1] : 1;
  const buckets = [0, 0.5, 1, 1.5, 2, 3, 5];
  const hist = buckets.map((lo, i) => {
    const hi = buckets[i + 1] ?? Infinity;
    return {
      label: hi === Infinity ? `${lo}+` : `${lo}–${hi}`,
      count: stresses.filter((s) => s >= lo && s < hi).length,
    };
  });
  const histMax = Math.max(1, ...hist.map((b) => b.count));

  return (
    <div className="mb-4 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-bronze">
          Effective stress · last {events.length} events
        </p>
        <div className="mt-2 flex items-baseline gap-4">
          <div>
            <p className="font-serif text-3xl leading-none text-foreground">{avg.toFixed(2)}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              avg
            </p>
          </div>
          <div>
            <p className="font-serif text-lg leading-none">{p(0.5).toFixed(2)}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              p50
            </p>
          </div>
          <div>
            <p className="font-serif text-lg leading-none">{p(0.9).toFixed(2)}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              p90
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="font-mono text-[10px] text-muted-foreground">
              {closed.length} closed · {open} open
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              max {maxStress.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-end gap-1.5">
          {hist.map((b) => (
            <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-bronze/60"
                style={{ height: `${(b.count / histMax) * 60 + 2}px` }}
                title={`${b.count} events`}
              />
              <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-muted-foreground">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-bronze">
          By transport mode
        </p>
        <ul className="mt-3 space-y-2">
          {[...byMode.entries()].map(([mode, s]) => (
            <li key={mode} className="flex items-center justify-between font-mono text-[11px]">
              <span className="uppercase tracking-[0.2em] text-muted-foreground">{mode}</span>
              <span className="text-foreground">
                {(s.sum / s.count).toFixed(2)}{" "}
                <span className="text-muted-foreground">avg · {s.count}</span>
              </span>
            </li>
          ))}
          {byMode.size === 0 && (
            <li className="font-mono text-[10px] text-muted-foreground">No closed events</li>
          )}
        </ul>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-bronze">
          Weather signal
        </p>
        <div className="mt-3 space-y-2 font-mono text-[11px]">
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-[0.2em] text-muted-foreground">Rain &gt; 40%</span>
            <span>
              {rainEvents.length}{" "}
              <span className="text-muted-foreground">
                / {events.length} ({Math.round((rainEvents.length / events.length) * 100)}%)
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-[0.2em] text-muted-foreground">Avg humidity</span>
            <span>
              {avgHumidity != null ? `${Math.round(avgHumidity)}%` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-[0.2em] text-muted-foreground">
              Rain avg stress
            </span>
            <span>
              {rainEvents.filter((e) => e.effective_stress != null).length
                ? (
                    rainEvents
                      .filter((e) => e.effective_stress != null)
                      .reduce((a, e) => a + Number(e.effective_stress), 0) /
                    rainEvents.filter((e) => e.effective_stress != null).length
                  ).toFixed(2)
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


function CareInsightsFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "careInsights"],
    queryFn: () => adminListCareInsights({ data: { limit: 100 } }),
  });

  if (isLoading) return <p className="font-mono text-xs text-muted-foreground">Loading…</p>;
  if (!data || data.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-8 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        No insights generated yet
      </div>
    );

  const KIND_META: Record<string, { label: string; color: string }> = {
    post_wear: { label: "Post-wear", color: "text-sky-300" },
    pre_wear_trigger: { label: "Pre-wear", color: "text-amber-300" },
    preventive: { label: "Preventive", color: "text-emerald-300" },
    maintenance_overdue: { label: "Overdue", color: "text-terracotta" },
  };

  return (
    <div className="space-y-2">
      {data.map((i: any) => {
        const meta = KIND_META[i.kind] ?? { label: i.kind, color: "text-muted-foreground" };
        const shown = !!i.shown_at;
        return (
          <div
            key={i.id}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`font-mono text-[9px] uppercase tracking-[0.3em] ${meta.color}`}>
                  {meta.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {i.assets?.model_name ?? "—"} · {i.assets?.serial ?? "—"}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  · {maskPhone(i.owner_phone)}
                </span>
                <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                  {shown ? (
                    <Eye className="h-3 w-3 text-emerald-300" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                  {fmtDateTime(i.created_at)}
                </span>
              </div>
              <p className="mt-1.5 font-serif text-sm leading-snug text-foreground">{i.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function fmtDuration(ms?: number | null) {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function CronRunsFeed() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "cronRuns"],
    queryFn: () => adminListCronRuns({ data: { limit: 50 } }),
    refetchInterval: 30_000,
  });

  if (isLoading)
    return <p className="font-mono text-xs text-muted-foreground">Loading…</p>;
  if (!data || data.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-8 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        No scheduled jobs registered
      </div>
    );

  // Summary per job
  const byJob = new Map<
    number,
    {
      jobname: string | null;
      schedule: string | null;
      active: boolean | null;
      runs: typeof data;
    }
  >();
  for (const r of data) {
    const key = r.jobid;
    if (!byJob.has(key)) {
      byJob.set(key, {
        jobname: r.jobname,
        schedule: r.schedule,
        active: r.active,
        runs: [],
      });
    }
    if (r.runid != null) byJob.get(key)!.runs.push(r);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {byJob.size} job{byJob.size === 1 ? "" : "s"} · {data.filter((r) => r.runid != null).length} recent runs
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-md border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition hover:bg-white/5 disabled:opacity-50"
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {Array.from(byJob.entries()).map(([jobid, job]) => {
        const lastRun = job.runs[0];
        const successCount = job.runs.filter((r) => r.status === "succeeded").length;
        const failCount = job.runs.filter(
          (r) => r.status && r.status !== "succeeded",
        ).length;
        return (
          <div
            key={jobid}
            className="overflow-hidden rounded-xl border border-white/10"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${job.active ? "bg-emerald-400" : "bg-muted-foreground/40"}`}
                  />
                  <span className="font-serif text-base">
                    {job.jobname ?? `job #${jobid}`}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {job.schedule ?? "—"} · id {jobid}
                </p>
              </div>
              <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.2em]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> {successCount}
                </span>
                <span
                  className={`flex items-center gap-1 ${failCount ? "text-rose-400" : "text-muted-foreground/60"}`}
                >
                  <XCircle className="h-3 w-3" /> {failCount}
                </span>
                <span className="text-muted-foreground">
                  last{" "}
                  {lastRun ? fmtDateTime(lastRun.start_time) : "never"}
                </span>
              </div>
            </div>

            {job.runs.length === 0 ? (
              <div className="px-4 py-6 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                No runs recorded yet
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {job.runs.slice(0, 10).map((r) => {
                  const ok = r.status === "succeeded";
                  return (
                    <div
                      key={r.runid ?? Math.random()}
                      className="grid grid-cols-[auto,1fr,auto,auto] items-center gap-3 px-4 py-2.5"
                    >
                      {ok ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-rose-400" />
                      )}
                      <span className="truncate font-mono text-[11px] text-foreground/80">
                        {r.return_message ?? r.status ?? "—"}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {fmtDuration(r.duration_ms)}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {fmtDateTime(r.start_time)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

