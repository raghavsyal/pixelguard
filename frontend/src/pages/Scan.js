// src/pages/Scan.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Card, CardContent, Typography, Button, Alert,
  LinearProgress, Grid, Chip, Divider, Slider, Tabs, Tab,
  Accordion, AccordionSummary, AccordionDetails, CircularProgress,
} from "@mui/material";
import CloudUploadRoundedIcon   from "@mui/icons-material/CloudUploadRounded";
import SearchRoundedIcon        from "@mui/icons-material/SearchRounded";
import ExpandMoreRoundedIcon    from "@mui/icons-material/ExpandMoreRounded";
import CheckCircleRoundedIcon   from "@mui/icons-material/CheckCircleRounded";
import PsychologyRoundedIcon    from "@mui/icons-material/PsychologyRounded";
import OpenInNewRoundedIcon     from "@mui/icons-material/OpenInNewRounded";
import GavelRoundedIcon         from "@mui/icons-material/GavelRounded";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import { scanArtwork, analyseMatch } from "../api";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

const RISK_STYLES = {
  "High Risk":   { bg: "#FCE8E6", color: "#C62828", border: "#FFCDD2" },
  "Medium Risk": { bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" },
  "Low Risk":    { bg: "#E6F4EA", color: "#1B5E20", border: "#C8E6C9" },
};

function MatchCard({ match, index, scanDesc, onStatusChange }) {
  const [analysing, setAnalysing] = useState(false);
  const [summary,   setSummary]   = useState(match.gemini_summary || "");
  const rs = RISK_STYLES[match.risk] || RISK_STYLES["Low Risk"];

  const handleGemini = async () => {
    setAnalysing(true);
    try {
      const data = await analyseMatch({
        artworkDesc: scanDesc,
        matchUrl:    match.url,
        matchTitle:  match.title,
        similarity:  match.similarity,
      });
      setSummary(data.summary);
      match.gemini_summary = data.summary;
    } catch {
      setSummary("Gemini analysis failed. Check your API key.");
    } finally {
      setAnalysing(false);
    }
  };

  const statusColors = {
    "Pending Review": { bg: "#F1F3F4", color: "#5F6368" },
    "Ignored":        { bg: "#F1F3F4", color: "#9E9E9E" },
    "Monitoring":     { bg: "#E8F0FE", color: "#1A73E8" },
    "Action Needed":  { bg: "#FCE8E6", color: "#EA4335" },
  };
  const sc = statusColors[match.status] || statusColors["Pending Review"];

  return (
    <Accordion sx={{
      border: `1px solid ${rs.border}`,
      borderLeft: `4px solid ${rs.color}`,
      borderRadius: "12px !important",
      mb: 1.5, "&:before": { display: "none" }, boxShadow: "none",
    }}>
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, flexWrap: "wrap" }}>
          <Chip label={match.risk} size="small"
            sx={{ bgcolor: rs.bg, color: rs.color, fontWeight: 700, fontSize: "0.7rem" }} />
          <Chip label={match.platform} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
          <Chip label={`${match.similarity}%`} size="small" sx={{ bgcolor: "#F1F3F4", fontSize: "0.7rem" }} />
          <Chip label={match.status} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontSize: "0.7rem" }} />
          <Typography variant="caption" sx={{ color: "#5F6368", ml: "auto", display: { xs: "none", md: "block" } }} noWrap>
            {match.url.slice(0, 50)}...
          </Typography>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ px: 2.5, pb: 2.5 }}>
        {/* Side by side */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "#5F6368", display: "block", mb: 0.5 }}>
              Suspected copy
            </Typography>
            <Box sx={{ bgcolor: "#F8F9FA", borderRadius: 2, overflow: "hidden", height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                src={match.url} alt="match"
                style={{ maxHeight: 150, maxWidth: "100%", objectFit: "contain" }}
                onError={e => { e.target.style.display = "none"; }}
              />
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "#5F6368", display: "block", mb: 0.5 }}>
              Details
            </Typography>
            <Box sx={{ p: 1.5, bgcolor: "#F8F9FA", borderRadius: 2, height: 150, overflow: "auto" }}>
              <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                <strong>Platform:</strong> {match.platform}
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                <strong>Type:</strong> {match.type}
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                <strong>Similarity:</strong> {match.similarity}%
              </Typography>
              {match.title && (
                <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                  <strong>Page:</strong> {match.title}
                </Typography>
              )}
              <Typography variant="caption" sx={{ display: "block", wordBreak: "break-all", color: "#1A73E8" }}>
                {match.url.slice(0, 80)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Open URL */}
        <Button size="small" variant="text"
          startIcon={<OpenInNewRoundedIcon fontSize="small" />}
          href={match.url} target="_blank"
          sx={{ fontSize: "0.75rem", mb: 1.5 }}
        >
          Open source URL
        </Button>

        {/* Gemini */}
        <Box sx={{ mb: 2 }}>
          {summary ? (
            <Box sx={{ bgcolor: "#F8F9FA", borderRadius: 2, p: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#1A73E8" }}>🤖 Gemini AI Analysis</Typography>
              <Typography variant="body2" sx={{ color: "#202124", mt: 0.5, lineHeight: 1.6 }}>{summary}</Typography>
            </Box>
          ) : scanDesc ? (
            <Button size="small" variant="outlined"
              startIcon={analysing ? <CircularProgress size={14} /> : <PsychologyRoundedIcon />}
              onClick={handleGemini} disabled={analysing}
              sx={{ borderRadius: 2, fontSize: "0.75rem" }}
            >
              {analysing ? "Analysing..." : "Analyse with Gemini AI"}
            </Button>
          ) : (
            <Typography variant="caption" sx={{ color: "#BDBDBD" }}>
              Add an artwork description to enable Gemini analysis.
            </Typography>
          )}
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "#5F6368", alignSelf: "center", mr: 0.5 }}>
            Action:
          </Typography>
          {[
            { label: "⚪ Ignore",       status: "Ignored",       border: "#9E9E9E", active: "#9E9E9E" },
            { label: "👁 Monitor",      status: "Monitoring",    border: "#1A73E8", active: "#1A73E8" },
            { label: "⚖️ Take Action", status: "Action Needed", border: "#EA4335", active: "#EA4335" },
          ].map(btn => (
            <Button key={btn.status} size="small"
              variant={match.status === btn.status ? "contained" : "outlined"}
              onClick={() => onStatusChange(index, btn.status)}
              sx={{
                borderRadius: 2, fontSize: "0.72rem", py: 0.4,
                borderColor: btn.border,
                color:  match.status === btn.status ? "#fff" : btn.active,
                bgcolor: match.status === btn.status ? btn.active : "transparent",
                "&:hover": { bgcolor: btn.active + "20" },
              }}
            >
              {btn.label}
            </Button>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

export default function ScanPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [artworks,   setArtworks]   = useState([]);
  const [scanMode,   setScanMode]   = useState("registered");
  const [selectedId, setSelectedId] = useState("");
  const [file,       setFile]       = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [scanDesc,   setScanDesc]   = useState("");
  const [threshold,  setThreshold]  = useState(60);
  const [dragging,   setDragging]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error,      setError]      = useState("");
  const [results,    setResults]    = useState(null);
  const [matches,    setMatches]    = useState([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const q    = query(collection(db, "artworks"), where("owner_email", "==", user.email));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setArtworks(list);
        if (list.length > 0) { setSelectedId(list[0].asset_id); setScanDesc(list[0].artwork_desc || ""); }
      } catch { /* silent */ }
    };
    load();
  }, [user]);

  const selectedArt = artworks.find(a => a.asset_id === selectedId);

  const handleFile = (f) => {
    if (!f || !ACCEPTED.includes(f.type)) { setError("PNG, JPG, or WEBP only."); return; }
    setFile(f); setPreview(URL.createObjectURL(f)); setError("");
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleStatusChange = (index, status) => {
    setMatches(prev => { const u = [...prev]; u[index] = { ...u[index], status }; return u; });
  };

  const handleScan = async () => {
    if (!file) { setError("Upload an artwork file to scan."); return; }
    setLoading(true); setError(""); setResults(null); setMatches([]);
    try {
      setLoadingMsg("Running Cloud Vision Web Detection... (15-30 seconds)");
      const data = await scanArtwork({ file, assetId: scanMode === "registered" ? selectedId : "", scanDesc, threshold });
      setResults(data);
      setMatches(data.matches || []);
    } catch (e) {
      setError(e?.detail || "Scan failed. Check your Vision API key.");
    } finally {
      setLoading(false); setLoadingMsg("");
    }
  };

  const handleGoToDMCA = () => {
    sessionStorage.setItem("pg_scan_results", JSON.stringify({
      violations:    matches,
      asset_id:      scanMode === "registered" ? selectedId : "",
      artwork_title: selectedArt?.artwork_title || "",
      cert_ts:       selectedArt?.registered_at_str || "",
    }));
    navigate("/dmca");
  };

  const actionNeeded = matches.filter(m => m.status === "Action Needed").length;

  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" sx={{ fontWeight: 600, color: "#202124" }}>Scan for Violations</Typography>
        <Typography variant="body2" sx={{ color: "#5F6368" }}>
          Detect unauthorised copies — including AI-edited and watermark-removed versions.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Config panel */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>Configure scan</Typography>

              <Tabs value={scanMode} onChange={(_, v) => { setScanMode(v); setFile(null); setPreview(null); }}
                sx={{ mb: 2, minHeight: 36 }}>
                <Tab value="registered" label="My artworks" sx={{ textTransform: "none", minHeight: 36, fontSize: "0.85rem" }} />
                <Tab value="new"        label="New image"   sx={{ textTransform: "none", minHeight: 36, fontSize: "0.85rem" }} />
              </Tabs>

              {scanMode === "registered" && (
                artworks.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 2, fontSize: "0.8rem" }}>
                    No registered artworks.{" "}
                    <Button size="small" onClick={() => navigate("/upload")}>Register one</Button>
                  </Alert>
                ) : (
                  <Box sx={{ mb: 2, maxHeight: 180, overflow: "auto" }}>
                    {artworks.map(a => (
                      <Box key={a.asset_id} onClick={() => { setSelectedId(a.asset_id); setScanDesc(a.artwork_desc || ""); }}
                        sx={{
                          p: 1.25, borderRadius: 2, cursor: "pointer", mb: 0.75,
                          border: selectedId === a.asset_id ? "1.5px solid #1A73E8" : "1px solid #E0E0E0",
                          bgcolor: selectedId === a.asset_id ? "#E8F0FE" : "#fff",
                          "&:hover": { bgcolor: "#F3F7FF" },
                        }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.82rem" }} noWrap>{a.artwork_title}</Typography>
                        <Typography variant="caption" sx={{ color: "#5F6368", fontSize: "0.72rem" }}>{a.asset_id}</Typography>
                      </Box>
                    ))}
                  </Box>
                )
              )}

              {/* File drop */}
              <Box
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => document.getElementById("scan-input").click()}
                sx={{
                  border: `2px dashed ${dragging ? "#1A73E8" : "#E0E0E0"}`,
                  borderRadius: 2, p: 2, textAlign: "center",
                  cursor: "pointer", bgcolor: dragging ? "#E8F0FE" : "#FAFAFA",
                  mb: 2, "&:hover": { borderColor: "#1A73E8" },
                }}>
                <input id="scan-input" type="file" hidden
                  accept="image/png,image/jpeg,image/webp"
                  onChange={e => handleFile(e.target.files[0])} />
                <CloudUploadRoundedIcon sx={{ fontSize: 24, color: file ? "#34A853" : "#BDBDBD" }} />
                <Typography variant="caption" sx={{ display: "block", color: file ? "#34A853" : "#5F6368", fontWeight: file ? 600 : 400, mt: 0.5 }}>
                  {file ? file.name : "Upload artwork file"}
                </Typography>
              </Box>

              {/* Description */}
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#5F6368", display: "block", mb: 0.75 }}>
                Description <Typography component="span" variant="caption" sx={{ color: "#BDBDBD" }}>(for Gemini)</Typography>
              </Typography>
              <textarea value={scanDesc} onChange={e => setScanDesc(e.target.value)}
                placeholder="Describe your artwork..."
                rows={2}
                style={{
                  width: "100%", boxSizing: "border-box", fontFamily: "Roboto, sans-serif",
                  fontSize: "0.8rem", border: "1px solid #E0E0E0", borderRadius: 8,
                  padding: "8px 10px", resize: "vertical", outline: "none",
                  color: "#202124", marginBottom: 16,
                }}
              />

              {/* Threshold */}
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#5F6368" }}>
                Min similarity: <strong>{threshold}%</strong>
              </Typography>
              <Slider value={threshold} onChange={(_, v) => setThreshold(v)}
                min={40} max={95} step={5} sx={{ color: "#1A73E8", mt: 0.5, mb: 2 }} />

              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: "0.8rem" }}>{error}</Alert>}

              {loading && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: "#5F6368", display: "block", mb: 0.75 }}>{loadingMsg}</Typography>
                  <LinearProgress sx={{ borderRadius: 2 }} />
                </Box>
              )}

              <Button fullWidth variant="contained" size="large"
                startIcon={<SearchRoundedIcon />}
                onClick={handleScan} disabled={loading || !file}
                sx={{ py: 1.25, borderRadius: 3 }}>
                {loading ? "Scanning..." : "Scan the Web"}
              </Button>
            </CardContent>
          </Card>

          {preview && (
            <Card sx={{ mt: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "#5F6368", display: "block", mb: 1 }}>
                  Image being scanned
                </Typography>
                <Box component="img" src={preview} alt="preview"
                  sx={{ width: "100%", borderRadius: 2, objectFit: "contain", maxHeight: 180 }} />
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Results panel */}
        <Grid item xs={12} md={8}>
          {!results && !loading && (
            <Card sx={{ height: "100%", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none", border: "1px dashed #E0E0E0" }}>
              <Box sx={{ textAlign: "center", p: 4 }}>
                <SearchRoundedIcon sx={{ fontSize: 48, color: "#E0E0E0", mb: 1 }} />
                <Typography variant="h4" sx={{ color: "#BDBDBD" }}>Results will appear here</Typography>
                <Typography variant="body2" sx={{ color: "#BDBDBD", mt: 0.5 }}>Configure and run a scan</Typography>
              </Box>
            </Card>
          )}

          {results && (
            <>
              {/* Stats row */}
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {[
                  { label: "Total",      val: results.total,     color: "#202124" },
                  { label: "High Risk",  val: results.high_risk, color: "#EA4335" },
                  { label: "Medium",     val: results.medium,    color: "#B45309" },
                  { label: "Low Risk",   val: results.low,       color: "#34A853" },
                ].map((s, i) => (
                  <Grid item xs={3} key={i}>
                    <Card sx={{ textAlign: "center", py: 1.5, px: 1 }}>
                      <Typography variant="h2" sx={{ fontWeight: 700, color: s.color }}>{s.val}</Typography>
                      <Typography variant="caption" sx={{ color: "#5F6368" }}>{s.label}</Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {matches.length === 0 ? (
                <Card sx={{ p: 3, textAlign: "center" }}>
                  <CheckCircleRoundedIcon sx={{ fontSize: 40, color: "#34A853", mb: 1 }} />
                  <Typography variant="h4" sx={{ color: "#34A853" }}>No matches above threshold</Typography>
                  <Typography variant="body2" sx={{ color: "#5F6368", mt: 0.5 }}>Your artwork appears safe.</Typography>
                </Card>
              ) : (
                <>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                    <Typography variant="body2" sx={{ color: "#5F6368" }}>
                      {matches.length} match{matches.length !== 1 ? "es" : ""} — review each one
                    </Typography>
                    {actionNeeded > 0 && (
                      <Button variant="contained" color="error" size="small"
                        startIcon={<GavelRoundedIcon />} onClick={handleGoToDMCA}
                        sx={{ borderRadius: 2 }}>
                        DMCA Report ({actionNeeded})
                      </Button>
                    )}
                  </Box>

                  {matches.map((m, i) => (
                    <MatchCard key={i} match={m} index={i} scanDesc={scanDesc} onStatusChange={handleStatusChange} />
                  ))}

                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <Button fullWidth variant="contained" color="error"
                      startIcon={<GavelRoundedIcon />} onClick={handleGoToDMCA} sx={{ borderRadius: 3 }}>
                      Generate DMCA Report
                    </Button>
                    <Button fullWidth variant="outlined" onClick={() => navigate("/violations")} sx={{ borderRadius: 3 }}>
                      View All Violations
                    </Button>
                  </Box>
                </>
              )}
            </>
          )}
        </Grid>
      </Grid>
    </Layout>
  );
}