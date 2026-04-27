// src/pages/Upload.js
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Alert, LinearProgress, Divider, Chip, Grid,
} from "@mui/material";
import CloudUploadRoundedIcon  from "@mui/icons-material/CloudUploadRounded";
import FingerprintRoundedIcon  from "@mui/icons-material/FingerprintRounded";
import VerifiedRoundedIcon     from "@mui/icons-material/VerifiedRounded";
import DownloadRoundedIcon     from "@mui/icons-material/DownloadRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import WarningRoundedIcon      from "@mui/icons-material/WarningRounded";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import { registerArtwork, getCertificateUrl } from "../api";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export default function Upload() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [file,          setFile]          = useState(null);
  const [preview,       setPreview]       = useState(null);
  const [artworkTitle,  setArtworkTitle]  = useState("");
  const [artworkDesc,   setArtworkDesc]   = useState("");
  const [loading,       setLoading]       = useState(false);
  const [loadingMsg,    setLoadingMsg]    = useState("");
  const [error,         setError]         = useState("");
  const [blocked,       setBlocked]       = useState(null);   // originality block
  const [result,        setResult]        = useState(null);   // success result

  // ── drag & drop ────────────────────────────────────────────────────────────
  const [dragging, setDragging] = useState(false);

  const handleFile = (f) => {
    if (!f || !ACCEPTED.includes(f.type)) {
      setError("Please upload a PNG, JPG, or WEBP file.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
    setResult(null);
    setBlocked(null);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true);  };
  const onDragLeave = ()  => setDragging(false);

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!file)         { setError("Please upload an artwork file."); return; }
    if (!artworkTitle) { setError("Please enter an artwork title."); return; }

    setLoading(true);
    setError("");
    setBlocked(null);
    setResult(null);

    try {
      setLoadingMsg("Verifying originality — scanning the web for prior art...");
      // Small delay so user sees the message before API call
      await new Promise(r => setTimeout(r, 300));

      setLoadingMsg("Generating fingerprint and registering on Firebase...");
      const data = await registerArtwork({
        file,
        artworkTitle,
        artworkDesc,
        ownerEmail:  user.email,
        artistName:  user.name,
      });
      setResult(data);
    } catch (err) {
      // Originality block (409)
      if (err?.detail?.blocked) {
        setBlocked(err.detail);
      } else {
        setError(err?.detail?.message || err?.detail || "Something went wrong. Check your API connection.");
      }
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  // ── success view ───────────────────────────────────────────────────────────
  if (result) {
    return (
      <Layout>
        <Box sx={{ maxWidth: 640, mx: "auto" }}>
          <Card sx={{ border: "1px solid #C8E6C9" }}>
            {/* Green header */}
            <Box sx={{ background: "linear-gradient(135deg, #34A853, #0D9488)", p: 3, textAlign: "center" }}>
              <VerifiedRoundedIcon sx={{ color: "#fff", fontSize: 48, mb: 1 }} />
              <Typography variant="h3" sx={{ color: "#fff", fontWeight: 700 }}>
                Artwork Registered!
              </Typography>
            </Box>

            <CardContent sx={{ p: 3 }}>
              {/* Result fields */}
              {[
                ["Asset ID",            result.asset_id],
                ["Registered At (UTC)", result.timestamp],
                ["SHA-256 (first 24)",  result.sha256?.slice(0, 24) + "..."],
                ["Perceptual Hash",     result.phash],
              ].map(([label, val]) => (
                <Box key={label} sx={{ display: "flex", gap: 2, py: 1.25, borderBottom: "1px solid #F1F3F4" }}>
                  <Typography variant="caption" sx={{ color: "#5F6368", fontWeight: 600, minWidth: 160 }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#202124", fontFamily: "monospace", wordBreak: "break-all" }}>
                    {val}
                  </Typography>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              {/* Verify link */}
              <Box sx={{ bgcolor: "#E8F0FE", borderRadius: 2, p: 2, mb: 2 }}>
                <Typography variant="caption" sx={{ color: "#1A73E8", fontWeight: 600, display: "block", mb: 0.5 }}>
                  🔗 Public verification link
                </Typography>
                <Typography variant="caption" sx={{ color: "#1565C0", wordBreak: "break-all" }}>
                  {result.verify_url}
                </Typography>
              </Box>

              {/* Actions */}
              <Button
                fullWidth variant="contained" size="large"
                startIcon={<DownloadRoundedIcon />}
                href={getCertificateUrl(result.asset_id)}
                target="_blank"
                sx={{ mb: 1.5, borderRadius: 3 }}
              >
                Download Ownership Certificate (PDF)
              </Button>

              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Button
                  fullWidth variant="outlined"
                  onClick={() => navigate("/artworks")}
                  sx={{ borderRadius: 3 }}
                >
                  View My Artworks
                </Button>
                <Button
                  fullWidth variant="outlined"
                  onClick={() => { setResult(null); setFile(null); setPreview(null); setArtworkTitle(""); setArtworkDesc(""); }}
                  sx={{ borderRadius: 3 }}
                >
                  Register Another
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Layout>
    );
  }

  // ── main form ──────────────────────────────────────────────────────────────
  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" sx={{ fontWeight: 600, color: "#202124" }}>Register Artwork</Typography>
        <Typography variant="body2" sx={{ color: "#5F6368" }}>
          Upload your artwork to generate a tamper-proof ownership certificate.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left — form */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 3 }}>

              {/* Drag & drop zone */}
              <Box
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => document.getElementById("file-input").click()}
                sx={{
                  border: `2px dashed ${dragging ? "#1A73E8" : "#E0E0E0"}`,
                  borderRadius: 3,
                  p: 4,
                  textAlign: "center",
                  cursor: "pointer",
                  bgcolor: dragging ? "#E8F0FE" : "#FAFAFA",
                  transition: "all 0.2s",
                  mb: 3,
                  "&:hover": { borderColor: "#1A73E8", bgcolor: "#F3F7FF" },
                }}
              >
                <input
                  id="file-input" type="file" hidden
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
                <CloudUploadRoundedIcon sx={{ fontSize: 40, color: file ? "#34A853" : "#BDBDBD", mb: 1 }} />
                {file ? (
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#34A853" }}>
                    {file.name}
                  </Typography>
                ) : (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "#5F6368" }}>
                      Drag & drop your artwork here
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#BDBDBD" }}>
                      or click to browse · PNG, JPG, WEBP
                    </Typography>
                  </>
                )}
              </Box>

              <TextField
                fullWidth label="Artwork title *"
                placeholder="e.g. Monsoon Dreams #3"
                value={artworkTitle}
                onChange={e => { setArtworkTitle(e.target.value); setError(""); }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth multiline rows={3}
                label="Brief description"
                placeholder="Digital illustration in teal and gold, woman in saree..."
                value={artworkDesc}
                onChange={e => setArtworkDesc(e.target.value)}
                sx={{ mb: 3 }}
              />

              {error   && <Alert severity="error"   sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

              {/* Originality block warning */}
              {blocked && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}
                  icon={<WarningRoundedIcon />}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Registration Blocked — Prior Art Found
                  </Typography>
                  <Typography variant="body2">
                    Identical copies of this artwork already exist on the web.
                    PixelGuard only issues certificates for original, unpublished work.
                  </Typography>
                  {blocked.prior_art_url && (
                    <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                      Found at: <a href={blocked.prior_art_url} target="_blank" rel="noreferrer">{blocked.prior_art_url.slice(0, 60)}...</a>
                    </Typography>
                  )}
                </Alert>
              )}

              {/* Progress */}
              {loading && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: "#5F6368", display: "block", mb: 1 }}>
                    {loadingMsg}
                  </Typography>
                  <LinearProgress sx={{ borderRadius: 2 }} />
                </Box>
              )}

              <Button
                fullWidth variant="contained" size="large"
                startIcon={<FingerprintRoundedIcon />}
                onClick={handleSubmit}
                disabled={loading || !file || !artworkTitle}
                sx={{ py: 1.5, borderRadius: 3 }}
              >
                {loading ? "Processing..." : "Generate Ownership Certificate"}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Right — preview + info */}
        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1.5 }}>Preview</Typography>
              {preview ? (
                <Box
                  component="img" src={preview} alt="preview"
                  sx={{ width: "100%", borderRadius: 2, objectFit: "contain", maxHeight: 280 }}
                />
              ) : (
                <Box sx={{ height: 180, bgcolor: "#F8F9FA", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography variant="body2" sx={{ color: "#BDBDBD" }}>
                    Your artwork will appear here
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          <Card sx={{ bgcolor: "#E8F0FE", boxShadow: "none" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#1A73E8", mb: 1 }}>
                What happens when you register
              </Typography>
              {[
                "Web scanned for prior art before registering",
                "SHA-256 + pHash fingerprint generated",
                "Saved to Firebase with server timestamp",
                "PDF certificate issued for download",
                "Public verification link created",
              ].map((t, i) => (
                <Box key={i} sx={{ display: "flex", gap: 1, mb: 0.75 }}>
                  <Typography variant="caption" sx={{ color: "#1A73E8", fontWeight: 700 }}>✓</Typography>
                  <Typography variant="caption" sx={{ color: "#1565C0" }}>{t}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
}