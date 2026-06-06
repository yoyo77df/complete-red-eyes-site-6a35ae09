import { supabase } from "@/integrations/supabase/client";

const BUCKET = "esports-profiles";

/** Resolve a stored profile image path to a short-lived signed URL. */
export async function resolveProfileImage(path: string | null | undefined, ttlSeconds = 3600): Promise<string | null> {
  if (!path) return null;
  // Backwards-compat: if a legacy full URL slipped in, return null (db migration strips these).
  if (/^(https?:|data:|\/\/)/i.test(path)) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttlSeconds);
  return data?.signedUrl ?? null;
}

/** Fetch the raw image bytes for a stored path (used by ZIP export). */
export async function fetchProfileImageBlob(path: string | null | undefined): Promise<Blob | null> {
  if (!path || /^(https?:|data:|\/\/)/i.test(path)) return null;
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) return null;
  return data;
}
