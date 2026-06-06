import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Settings as SettingsIcon, PowerOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

const MAX_LOGO_BYTES = 200 * 1024 * 1024; // 200 MB

function SettingsPage() {
  const { isAdmin, loading } = useAuth();
  const { settings, refresh } = useSiteSettings();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#DC143C");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [siteDisabled, setSiteDisabled] = useState(false);
  const [disabledMessage, setDisabledMessage] = useState("This form site was off");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !isAdmin) navigate({ to: "/dashboard" }); }, [loading, isAdmin, navigate]);
  useEffect(() => {
    if (settings) {
      setTitle(settings.site_title);
      setPrimaryColor(settings.primary_color);
      setLogoPreview(settings.logo_url);
      setSiteDisabled(settings.site_disabled);
      setDisabledMessage(settings.disabled_message || "This form site was off");
    }
  }, [settings]);

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) return toast.error("Logo must be under 200MB");
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    if (!settings) return;
    setBusy(true);

    let logoPathToSave: string | null = settings.logo_url;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop() || "png";
      const path = `logos/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("site-assets")
        .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
      if (upErr) {
        setBusy(false);
        return toast.error(upErr.message);
      }
      logoPathToSave = path;
    } else if (logoPreview === null) {
      logoPathToSave = null;
    }

    const { error } = await supabase.from("site_settings")
      .update({
        site_title: title,
        primary_color: primaryColor,
        logo_url: logoPathToSave,
        site_disabled: siteDisabled,
        disabled_message: disabledMessage,
      })
      .eq("id", settings.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setLogoFile(null);
    toast.success("Settings updated");
    await refresh();
  };

  if (loading || !isAdmin) return <div className="text-center text-muted-foreground">Checking access…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold gradient-text"><SettingsIcon className="h-7 w-7" /> Site Settings</h1>
        <p className="text-sm text-muted-foreground">Control branding & identity across the entire site.</p>
      </div>

      <div className="glass space-y-5 rounded-2xl p-6">
        <div className="space-y-2">
          <Label>Website Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Primary (Accent) Color</Label>
          <div className="flex items-center gap-3">
            <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-20 p-1" />
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Website Logo</Label>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-primary/40 bg-card">
              {logoPreview ? <img src={logoPreview} alt="logo" className="h-full w-full object-cover" /> : <span className="text-xs text-muted-foreground">No logo</span>}
            </div>
            <div className="space-y-2">
              <Input type="file" accept="image/*" onChange={handleLogo} />
              {logoPreview && <Button variant="ghost" size="sm" onClick={() => { setLogoPreview(null); setLogoFile(null); }}>Remove logo</Button>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">PNG/JPG/SVG/GIF up to 200MB. Shows on navbar.</p>
        </div>

        <Button onClick={save} disabled={busy} size="lg" className="w-full btn-glow">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Settings
        </Button>
      </div>

      <div className="glass space-y-4 rounded-2xl border border-destructive/30 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-destructive">
              <PowerOff className="h-4 w-4" /> Site Kill Switch
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              When ON, the whole site is blocked for everyone except admins.
              Visitors will see only the message below.
            </p>
          </div>
          <Switch checked={siteDisabled} onCheckedChange={setSiteDisabled} />
        </div>
        <div className="space-y-2">
          <Label>Block message</Label>
          <Textarea
            value={disabledMessage}
            onChange={(e) => setDisabledMessage(e.target.value)}
            rows={2}
            placeholder="This form site was off"
          />
        </div>
        <p className="text-xs text-muted-foreground">Don't forget to click <strong>Save Settings</strong> above to apply.</p>
      </div>

      <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
        <h3 className="mb-2 font-semibold text-foreground">Admin Role Management</h3>
        <p>To grant admin access to a user, open the database (Lovable Cloud → user_roles table) and change their role from <code className="rounded bg-card px-1">user</code> to <code className="rounded bg-card px-1">admin</code>. The admin button is only visible to admin users.</p>
      </div>
    </div>
  );
}
