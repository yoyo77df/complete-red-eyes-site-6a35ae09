import JSZip from "jszip";
import * as XLSX from "xlsx";
import { fetchProfileImageBlob } from "./profile-image";

export interface AppRow {
  id: string;
  user_id: string;
  full_name: string;
  in_game_name: string;
  game_uid: string;
  district: string;
  full_location: string;
  date_of_birth: string;
  email: string;
  contact_number: string;
  whatsapp_number: string;
  role: string;
  socials: Record<string, string>;
  join_new_team: boolean;
  future_plan: string;
  dedication: string;
  active_time: string;
  profile_image_url: string | null;
  created_at: string;
}

export function toTxt(app: AppRow): string {
  const socialLines = Object.entries(app.socials || {}).map(([k, v]) => `  ${k}: ${v}`).join("\n") || "  (none)";
  return `=== ESPORTS APPLICATION ===
Submitted: ${app.created_at}

[BASIC INFO]
Full Name:        ${app.full_name}
In-Game Name:     ${app.in_game_name}
Game UID:         ${app.game_uid}
District:         ${app.district}
Full Location:    ${app.full_location}
Date of Birth:    ${app.date_of_birth}
Email:            ${app.email}
Contact Number:   ${app.contact_number}
WhatsApp:         ${app.whatsapp_number}
Active Time:      ${app.active_time}
Join New Team:    ${app.join_new_team ? "Yes" : "No"}

[SOCIALS]
${socialLines}

[FUTURE PLAN]
${app.future_plan}

[DEDICATION]
${app.dedication}

[IMAGE]
${app.profile_image_url ? "(attached in zip export)" : "(none)"}
`;
}

function safeName(s: string) { return s.replace(/[^a-z0-9-_]/gi, "_"); }

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function exportTxt(app: AppRow) {
  downloadBlob(new Blob([toTxt(app)], { type: "text/plain" }), `${safeName(app.in_game_name)}.txt`);
}

export function exportAllTxt(apps: AppRow[]) {
  const body = apps.map(toTxt).join("\n\n----------\n\n");
  downloadBlob(new Blob([body], { type: "text/plain" }), `all-applications-${Date.now()}.txt`);
}

export async function exportZip(app: AppRow) {
  const zip = new JSZip();
  zip.file(`${safeName(app.in_game_name)}.txt`, toTxt(app));
  if (app.profile_image_url) {
    try {
      const blob = await fetchProfileImageBlob(app.profile_image_url);
      if (blob) {
        const ext = (blob.type.split("/")[1] ?? "jpg").split("+")[0];
        zip.file(`${safeName(app.in_game_name)}.${ext}`, blob);
      }
    } catch { /* ignore image fetch failure */ }
  }
  const out = await zip.generateAsync({ type: "blob" });
  downloadBlob(out, `${safeName(app.in_game_name)}.zip`);
}

export function exportExcel(app: AppRow) {
  const flat: Record<string, string | boolean> = {
    full_name: app.full_name, in_game_name: app.in_game_name, game_uid: app.game_uid,
    district: app.district, full_location: app.full_location, date_of_birth: app.date_of_birth,
    email: app.email, contact_number: app.contact_number, whatsapp_number: app.whatsapp_number,
    active_time: app.active_time, join_new_team: app.join_new_team, role: app.role,
    future_plan: app.future_plan, dedication: app.dedication,
    socials: JSON.stringify(app.socials), has_profile_image: app.profile_image_url ? "yes" : "no",
    submitted_at: app.created_at,
  };
  const ws = XLSX.utils.json_to_sheet([flat]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Application");
  XLSX.writeFile(wb, `${safeName(app.in_game_name)}.xlsx`);
}

export function exportAllExcel(apps: AppRow[]) {
  const rows = apps.map((a) => ({
    full_name: a.full_name, in_game_name: a.in_game_name, game_uid: a.game_uid,
    district: a.district, full_location: a.full_location, date_of_birth: a.date_of_birth,
    email: a.email, contact_number: a.contact_number, whatsapp_number: a.whatsapp_number,
    active_time: a.active_time, join_new_team: a.join_new_team, role: a.role,
    socials: JSON.stringify(a.socials), submitted_at: a.created_at,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Applications");
  XLSX.writeFile(wb, `all-applications-${Date.now()}.xlsx`);
}
