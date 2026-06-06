import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { resolveProfileImage } from "@/lib/profile-image";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/profile")({ component: Profile });

interface App {
  id: string; full_name: string; in_game_name: string; game_uid: string; district: string;
  full_location: string; date_of_birth: string; email: string; contact_number: string;
  whatsapp_number: string; socials: Record<string, string>; join_new_team: boolean;
  future_plan: string; dedication: string; active_time: string; profile_image_url: string | null;
  created_at: string;
}

function Profile() {
  const { user, isAdmin } = useAuth();
  const [app, setApp] = useState<App | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("recruitment_applications").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setApp(data as App | null);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <div className="text-center text-muted-foreground">Loading…</div>;

  if (!app) {
    return (
      <div className="glass mx-auto max-w-xl rounded-2xl p-10 text-center">
        <h1 className="text-2xl font-bold gradient-text">No application yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">Fill out the join form to get started.</p>
        <Link to="/dashboard" className="mt-6 inline-flex rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground btn-glow">
          Go to Join Form
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {app.profile_image_url && (
            <img src={app.profile_image_url} alt={app.full_name} className="h-28 w-28 rounded-xl object-cover btn-glow" />
          )}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold gradient-text">{app.in_game_name}</h1>
            <p className="text-sm text-muted-foreground">{app.full_name}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge variant="outline">UID: {app.game_uid}</Badge>
              <Badge variant="outline">{app.district}</Badge>
              {app.join_new_team && <Badge className="bg-primary">Wants new team</Badge>}
              {isAdmin && <Badge className="bg-accent">Admin</Badge>}
            </div>
          </div>
          <Link to="/dashboard"><Button variant="outline">Edit</Button></Link>
        </div>
      </div>

      <div className="glass grid gap-4 rounded-2xl p-6 sm:grid-cols-2">
        <Info label="Location" value={app.full_location} />
        <Info label="Date of Birth" value={app.date_of_birth} />
        <Info label="Email" value={app.email} />
        <Info label="Contact" value={app.contact_number} />
        <Info label="WhatsApp" value={app.whatsapp_number} />
        <Info label="Active Time" value={app.active_time} />
      </div>

      {Object.keys(app.socials || {}).length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase text-primary">Socials</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(app.socials).map(([k, v]) => (
              <Badge key={k} variant="outline" className="text-sm">{k}: {v}</Badge>
            ))}
          </div>
        </div>
      )}

      <Section title="Future Plan" body={app.future_plan} />
      <Section title="Dedication" body={app.dedication} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="mb-2 text-sm font-semibold uppercase text-primary">{title}</h3>
      <p className="whitespace-pre-wrap text-sm text-foreground/90">{body}</p>
    </div>
  );
}
