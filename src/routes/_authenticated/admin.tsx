import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { exportAllExcel, exportAllTxt, exportExcel, exportTxt, exportZip, type AppRow } from "@/lib/export-utils";
import { FileText, FileSpreadsheet, Package, Trash2, Search, Shield } from "lucide-react";
import { resolveProfileImage } from "@/lib/profile-image";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminPanel });

function AdminPanel() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard" });
  }, [loading, isAdmin, navigate]);

  const refresh = async () => {
    setFetching(true);
    const { data } = await supabase.from("recruitment_applications").select("*").order("created_at", { ascending: false });
    const rows = (data as AppRow[]) ?? [];
    setApps(rows);
    const entries = await Promise.all(
      rows.filter((r) => r.profile_image_url).map(async (r) => [r.id, await resolveProfileImage(r.profile_image_url)] as const),
    );
    setImageUrls(Object.fromEntries(entries.filter(([, u]) => u)) as Record<string, string>);
    setFetching(false);
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return apps.filter((a) =>
      [a.full_name, a.in_game_name, a.game_uid, a.email, a.district].some((f) => f?.toLowerCase().includes(q))
    );
  }, [apps, query]);

  const toggleSelect = (id: string) =>
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const remove = async (id: string) => {
    const { error } = await supabase.from("recruitment_applications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refresh();
  };

  const selectedApps = apps.filter((a) => selected.has(a.id));

  if (loading || !isAdmin) return <div className="text-center text-muted-foreground">Checking access…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold gradient-text"><Shield className="h-7 w-7" /> Admin Panel</h1>
          <p className="text-sm text-muted-foreground">{apps.length} application{apps.length !== 1 && "s"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportAllTxt(apps)} disabled={!apps.length}>
            <FileText className="mr-2 h-4 w-4" /> All TXT
          </Button>
          <Button variant="outline" onClick={() => exportAllExcel(apps)} disabled={!apps.length}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> All Excel
          </Button>
          <Button variant="outline" disabled={!selectedApps.length} onClick={() => selectedApps.forEach(exportTxt)}>
            Selected TXT ({selectedApps.length})
          </Button>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, IGN, UID, email, district…" className="pl-9" />
        </div>
      </div>

      {fetching ? (
        <div className="text-center text-muted-foreground">Loading…</div>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-card/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={(v) => setSelected(v ? new Set(filtered.map((a) => a.id)) : new Set())} /></th>
                <th className="p-3">IGN</th>
                <th className="p-3">Full Name</th>
                <th className="p-3">District</th>
                <th className="p-3">Contact</th>
                <th className="p-3">New Team</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-border/30 hover:bg-card/30">
                  <td className="p-3"><Checkbox checked={selected.has(a.id)} onCheckedChange={() => toggleSelect(a.id)} /></td>
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-2">
                      {a.profile_image_url && <img src={a.profile_image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                      {a.in_game_name}
                    </div>
                  </td>
                  <td className="p-3">{a.full_name}</td>
                  <td className="p-3">{a.district}</td>
                  <td className="p-3">{a.contact_number}</td>
                  <td className="p-3">{a.join_new_team ? <Badge className="bg-primary">Yes</Badge> : <Badge variant="outline">No</Badge>}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="TXT" onClick={() => exportTxt(a)}><FileText className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Excel" onClick={() => exportExcel(a)}><FileSpreadsheet className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="ZIP" onClick={() => exportZip(a)}><Package className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {a.in_game_name}?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(a.id)} className="bg-destructive">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No applications</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
