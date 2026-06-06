import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  id: string;
  site_title: string;
  logo_url: string | null;
  theme: string;
  primary_color: string;
  site_disabled: boolean;
  disabled_message: string;
}

interface Ctx {
  settings: SiteSettings | null;
  refresh: () => Promise<void>;
}

const SettingsCtx = createContext<Ctx>({ settings: null, refresh: async () => {} });

async function resolveLogo(raw: string | null): Promise<string | null> {
  if (!raw) return null;
  if (raw.startsWith("http") || raw.startsWith("data:")) return raw;
  const { data } = await supabase.storage.from("site-assets").createSignedUrl(raw, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  const refresh = async () => {
    const { data } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
    if (!data) return;
    const row = data as SiteSettings;
    const resolved = await resolveLogo(row.logo_url);
    setSettings({ ...row, logo_url: resolved });
  };

  useEffect(() => {
    refresh();
    // Re-check periodically and on focus so a kill-switch flip propagates fast.
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!settings) return;
    document.title = settings.site_title;
  }, [settings]);

  return <SettingsCtx.Provider value={{ settings, refresh }}>{children}</SettingsCtx.Provider>;
}

export const useSiteSettings = () => useContext(SettingsCtx);
