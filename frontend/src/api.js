// src/api.js
// All calls to the FastAPI backend go through this file.

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── REGISTER ARTWORK ──────────────────────────────────────────────────────────
export async function registerArtwork({ file, artworkTitle, artworkDesc, ownerEmail, artistName }) {
  const form = new FormData();
  form.append("file",          file);
  form.append("artwork_title", artworkTitle);
  form.append("artwork_desc",  artworkDesc  || "");
  form.append("owner_email",   ownerEmail);
  form.append("artist_name",   artistName);

  const res = await fetch(`${BASE_URL}/api/register`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw data;   // React pages catch this and show the error
  return data;
  // Returns: { asset_id, sha256, phash, timestamp, verify_url }
}

// ── DOWNLOAD CERTIFICATE PDF ──────────────────────────────────────────────────
export function getCertificateUrl(assetId) {
  return `${BASE_URL}/api/certificate/${assetId}`;
}

// ── SCAN ARTWORK ──────────────────────────────────────────────────────────────
export async function scanArtwork({ file, assetId, scanDesc, threshold }) {
  const form = new FormData();
  form.append("file",      file);
  form.append("asset_id",  assetId   || "");
  form.append("scan_desc", scanDesc  || "");
  form.append("threshold", threshold || 60);

  const res  = await fetch(`${BASE_URL}/api/scan`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
  // Returns: { matches, total, high_risk, medium, low }
}

// ── GEMINI ANALYSE ONE MATCH ──────────────────────────────────────────────────
export async function analyseMatch({ artworkDesc, matchUrl, matchTitle, similarity }) {
  const form = new FormData();
  form.append("artwork_desc", artworkDesc);
  form.append("match_url",    matchUrl);
  form.append("match_title",  matchTitle  || "");
  form.append("similarity",   similarity  || 70);

  const res  = await fetch(`${BASE_URL}/api/analyse`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
  // Returns: { summary }
}

// ── GENERATE DMCA PDF ─────────────────────────────────────────────────────────
export async function generateDmca({ artistName, artworkTitle, assetId, certTs, violations }) {
  const form = new FormData();
  form.append("artist_name",   artistName);
  form.append("artwork_title", artworkTitle);
  form.append("asset_id",      assetId  || "");
  form.append("cert_ts",       certTs   || "");
  form.append("violations",    JSON.stringify(violations));

  const res = await fetch(`${BASE_URL}/api/dmca`, { method: "POST", body: form });
  if (!res.ok) {
    const data = await res.json();
    throw data;
  }
  // Return as blob for download
  const blob = await res.blob();
  return blob;
}

// ── GET USER ARTWORKS ─────────────────────────────────────────────────────────
export async function getUserArtworks(email) {
  const res  = await fetch(`${BASE_URL}/api/artworks/${encodeURIComponent(email)}`);
  const data = await res.json();
  if (!res.ok) throw data;
  return data.artworks;
}

// ── VERIFY ARTWORK (public) ───────────────────────────────────────────────────
export async function verifyArtwork(assetId) {
  const res  = await fetch(`${BASE_URL}/api/verify/${assetId}`);
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}
