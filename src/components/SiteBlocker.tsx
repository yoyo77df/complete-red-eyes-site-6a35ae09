import { useAuth } from "@/hooks/use-auth";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

export function SiteBlocker({ children }: { children: ReactNode }) {
  const { settings } = useSiteSettings();
  const { isAdmin, loading } = useAuth();

  // While auth resolves, don't flash the block screen for an admin.
  if (settings?.site_disabled && !loading && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="glass max-w-md rounded-2xl p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15">
            <Lock className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">Site Offline</h1>
          <p className="mt-3 text-muted-foreground">
            {settings.disabled_message || "This form site was off"}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
