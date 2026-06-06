import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BANGLADESH_DISTRICTS } from "@/lib/districts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveProfileImage } from "@/lib/profile-image";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: DashboardForm });

const SOCIAL_PLATFORMS = [
  { key: "discord", label: "Discord", icon: "💬" },
  { key: "youtube", label: "YouTube", icon: "📺" },
  { key: "facebook", label: "Facebook", icon: "📘" },
  { key: "twitter", label: "Twitter", icon: "🐦" },
] as const;

function DashboardForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "", in_game_name: "", game_uid: "", role: "Rusher", district: "", full_location: "",
    date_of_birth: "", email: user?.email ?? "", contact_number: "", whatsapp_number: "",
    join_new_team: "no", future_plan: "", dedication: "", active_time: "",
  });
  const ROLES = ["Rusher", "2nd Rusher", "Sniper", "Bomber", "All Rounder", "Sponsor"] as const;
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("recruitment_applications").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setExistingId(data.id);
        setForm({
          full_name: data.full_name, in_game_name: data.in_game_name, game_uid: data.game_uid,
          role: (data as { role?: string }).role ?? "Rusher",
          district: data.district, full_location: data.full_location,
          date_of_birth: data.date_of_birth, email: data.email,
          contact_number: data.contact_number, whatsapp_number: data.whatsapp_number,
          join_new_team: data.join_new_team ? "yes" : "no",
          future_plan: data.future_plan, dedication: data.dedication, active_time: data.active_time,
        });
        setSocials((data.socials as Record<string, string>) ?? {});
        if (data.profile_image_url) {
          resolveProfileImage(data.profile_image_url).then((url) => { if (url) setImagePreview(url); });
        }
      }
    });
  }, [user]);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleSocial = (key: string) => {
    setSocials((p) => {
      const n = { ...p };
      if (key in n) delete n[key];
      else n[key] = "";
      return n;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      let imagePath: string | undefined;
      if (imageFile) {
        const path = `${user.id}/${Date.now()}-${imageFile.name}`;
        const { error: upErr } = await supabase.storage.from("esports-profiles").upload(path, imageFile, { upsert: true });
        if (upErr) throw upErr;
        imagePath = path;
      }

      const payload = {
        user_id: user.id,
        full_name: form.full_name, in_game_name: form.in_game_name, game_uid: form.game_uid,
        role: form.role,
        district: form.district, full_location: form.full_location,
        date_of_birth: form.date_of_birth, email: form.email,
        contact_number: form.contact_number, whatsapp_number: form.whatsapp_number,
        socials, join_new_team: form.join_new_team === "yes",
        future_plan: form.future_plan, dedication: form.dedication, active_time: form.active_time,
        ...(imagePath ? { profile_image_url: imagePath } : {}),
      };

      const { error } = existingId
        ? await supabase.from("recruitment_applications").update(payload).eq("id", existingId)
        : await supabase.from("recruitment_applications").insert(payload);

      if (error) throw error;
      toast.success(existingId ? "Application updated!" : "Application submitted!");
      navigate({ to: "/profile" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold gradient-text">{existingId ? "Update Application" : "Join the Team"}</h1>
        <p className="text-sm text-muted-foreground">Fill in your esports profile to apply.</p>
      </div>

      <form onSubmit={submit} className="glass space-y-8 rounded-2xl p-6 md:p-8">
        {/* Image */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Profile Image</h2>
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-xl border-2 border-dashed border-primary/40 bg-card">
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Upload className="h-6 w-6" /></div>
              )}
            </div>
            <div>
              <Input type="file" accept="image/*" onChange={handleImage} className="max-w-xs" />
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
            </div>
          </div>
        </section>

        {/* Basic Info */}
        <section className="grid gap-4 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm font-semibold uppercase tracking-wider text-primary">Basic Info</h2>
          <Field label="Full Name" required><Input required value={form.full_name} onChange={(e) => update("full_name", e.target.value)} /></Field>
          <Field label="In-Game Name" required><Input required value={form.in_game_name} onChange={(e) => update("in_game_name", e.target.value)} /></Field>
          <Field label="Game UID" required><Input required value={form.game_uid} onChange={(e) => update("game_uid", e.target.value)} /></Field>
          <Field label="Role" required>
            <Select value={form.role} onValueChange={(v) => update("role", v)}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="District" required>
            <Select value={form.district} onValueChange={(v) => update("district", v)}>
              <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {BANGLADESH_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Full Location" required className="md:col-span-2"><Input required value={form.full_location} onChange={(e) => update("full_location", e.target.value)} /></Field>
          <Field label="Date of Birth" required><Input type="date" required value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} /></Field>
          <Field label="Active Email" required><Input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} /></Field>
          <Field label="Contact Number" required><Input required value={form.contact_number} onChange={(e) => update("contact_number", e.target.value)} /></Field>
          <Field label="WhatsApp Number" required><Input required value={form.whatsapp_number} onChange={(e) => update("whatsapp_number", e.target.value)} /></Field>
        </section>

        {/* Socials */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Social Profiles</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {SOCIAL_PLATFORMS.map((p) => (
              <button key={p.key} type="button" onClick={() => toggleSocial(p.key)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  p.key in socials ? "border-primary bg-primary/20 text-primary" : "border-border bg-card hover:bg-accent/20"
                }`}>
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {Object.entries(socials).map(([key, val]) => {
              const meta = SOCIAL_PLATFORMS.find((s) => s.key === key)!;
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-24 text-sm text-muted-foreground">{meta.icon} {meta.label}</span>
                  <Input value={val} placeholder={`${meta.label} username`} onChange={(e) => setSocials((p) => ({ ...p, [key]: e.target.value }))} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => toggleSocial(key)}><X className="h-4 w-4" /></Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Additional */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">Additional</h2>
          <div>
            <Label>Do you want to join our new team?</Label>
            <RadioGroup value={form.join_new_team} onValueChange={(v) => update("join_new_team", v)} className="mt-2 flex gap-6">
              <label className="flex items-center gap-2"><RadioGroupItem value="yes" /> Yes</label>
              <label className="flex items-center gap-2"><RadioGroupItem value="no" /> No</label>
            </RadioGroup>
          </div>
          <Field label="Future Plan" required><Textarea required rows={3} value={form.future_plan} onChange={(e) => update("future_plan", e.target.value)} /></Field>
          <Field label="Dedication" required><Textarea required rows={3} value={form.dedication} onChange={(e) => update("dedication", e.target.value)} /></Field>
          <Field label="Active Time" required><Input required placeholder="e.g. 8 PM - 12 AM" value={form.active_time} onChange={(e) => update("active_time", e.target.value)} /></Field>
        </section>

        <Button type="submit" disabled={busy} size="lg" className="w-full btn-glow">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existingId ? "Update Application" : "Submit Application"}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, children, required, className }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label} {required && <span className="text-primary">*</span>}</Label>
      {children}
    </div>
  );
}
