// src/pages/DMCA.js
import React, { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, Button, Alert,
  Checkbox, FormControlLabel, Divider, Chip, LinearProgress,
  Grid, ToggleButtonGroup, ToggleButton,
} from "@mui/material";
import GavelRoundedIcon        from "@mui/icons-material/GavelRounded";
import DownloadRoundedIcon     from "@mui/icons-material/DownloadRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleRoundedIcon  from "@mui/icons-material/CheckCircleRounded";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import { generateDmca } from "../api";

const RISK_STYLES = {
  "High Risk":   { bg: "#FCE8E6", color: "#C62828" },
  "Medium Risk": { bg: "#FEF3C7", color: "#92400E" },
  "Low Risk":    { bg: "#E6F4EA", color: "#1B5E20" },
};

export default function DMCA() {
  const { user } = useAuth();

  const [scanData,    setScanData]    = useState(null);
  const [violations,  setViolations]  = useState([]);
  const [filter,      setFilter]      = useState(["Action Needed", "Pending Review"]);
  const [confirmed,   setConfirmed]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [downloaded,  setDownloaded]  = useState(false);

  // Load scan results from sessionStorage (set by Scan page)
  useEffect(() => {
    const raw = sessionStorage.getItem("pg_scan_results");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setScanData(data);
        setViolations(data.violations || []);
      } catch { /* ignore */ }
    }
  }, []);

  const filteredViolations = violations.filter(v =>
    filter.includes(v.status || "Pending Review")
  );

  const handleDownload = async () => {
    if (!confirmed) { setError("Please confirm the good-faith statement first."); return; }
    if (filteredViolations.length === 0) { setError("No violations selected to include."); return; }

    setLoading(true);
    setError("");

    try {
      const blob = await generateDmca({
        artistName:   user.name,
        artworkTitle: scanData?.artwork_title || "Unknown",
        assetId:      scanData?.asset_id      || "",
        certTs:       scanData?.cert_ts        || "",
        violations:   filteredViolations,
      });

      // Trigger browser download
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = `PixelGuard_DMCA_${scanData?.asset_id || "report"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (e) {
      setError(e?.detail || "Failed to generate report. Check your API connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" sx={{ fontWeight: 600, color: "#202124" }}>DMCA Report</Typography>
        <Typography variant="body2" sx={{ color: "#5F6368" }}>
          Generate a ready-to-send copyright takedown document. You always review before anything is sent.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left — violations list + config */}
        <Grid item xs={12} md={7}>

          {/* Artwork info */}
          {scanData && (
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1.5 }}>Artwork details</Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#5F6368", fontWeight: 600 }}>Title</Typography>
                    <Typography variant="body2">{scanData.artwork_title || "—"}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#5F6368", fontWeight: 600 }}>Asset ID</Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{scanData.asset_id || "—"}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#5F6368", fontWeight: 600 }}>Registered</Typography>
                    <Typography variant="body2">{scanData.cert_ts?.slice(0, 10) || "—"}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Violation filter */}
          {violations.length > 0 && (
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Violations to include
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#1A73E8", fontWeight: 600 }}>
                    {filteredViolations.length} selected
                  </Typography>
                </Box>

                {/* Status filter */}
                <ToggleButtonGroup
                  value={filter} onChange={(_, v) => v.length > 0 && setFilter(v)}
                  size="small" sx={{ mb: 2, flexWrap: "wrap", gap: 0.5 }}
                >
                  {["Pending Review", "Action Needed", "Monitoring", "Ignored"].map(s => (
                    <ToggleButton key={s} value={s}
                      sx={{ borderRadius: "8px !important", px: 1.5, textTransform: "none", fontSize: "0.75rem" }}>
                      {s}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                {/* Violation cards */}
                <Box sx={{ maxHeight: 320, overflow: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
                  {filteredViolations.map((v, i) => {
                    const rs = RISK_STYLES[v.risk] || RISK_STYLES["Low Risk"];
                    return (
                      <Box key={i} sx={{
                        p: 1.5, borderRadius: 2,
                        border: `1px solid ${rs.bg}`,
                        borderLeft: `3px solid ${rs.color}`,
                        bgcolor: "#FAFAFA",
                      }}>
                        <Box sx={{ display: "flex", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                          <Chip label={v.risk} size="small"
                            sx={{ bgcolor: rs.bg, color: rs.color, fontWeight: 700, fontSize: "0.65rem" }} />
                          <Chip label={v.platform || "Other"} size="small" variant="outlined" sx={{ fontSize: "0.65rem" }} />
                          <Chip label={`${v.similarity}%`} size="small" sx={{ bgcolor: "#F1F3F4", fontSize: "0.65rem" }} />
                        </Box>
                        <Typography variant="caption" sx={{ color: "#1A73E8", wordBreak: "break-all", display: "block" }}>
                          {v.url?.slice(0, 70)}{v.url?.length > 70 ? "..." : ""}
                        </Typography>
                        {v.gemini_summary && (
                          <Typography variant="caption" sx={{ color: "#5F6368", display: "block", mt: 0.5, fontStyle: "italic" }}>
                            {v.gemini_summary.slice(0, 120)}...
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          )}

          {violations.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No scan results found. Run a scan first on the <strong>Scan for Violations</strong> page.
              Your results will automatically appear here.
            </Alert>
          )}
        </Grid>

        {/* Right — confirm + generate */}
        <Grid item xs={12} md={5}>
          <Card sx={{ position: { md: "sticky" }, top: { md: 80 } }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>Generate report</Typography>

              {/* Claimant */}
              <Box sx={{ bgcolor: "#F8F9FA", borderRadius: 2, p: 2, mb: 2 }}>
                <Typography variant="caption" sx={{ color: "#5F6368", fontWeight: 600, display: "block", mb: 0.5 }}>
                  Claimant
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{user?.name}</Typography>
                <Typography variant="caption" sx={{ color: "#5F6368" }}>{user?.email}</Typography>
              </Box>

              {/* What's included */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "#5F6368", display: "block", mb: 1 }}>
                  Report will include
                </Typography>
                {[
                  "Your name and contact details",
                  `${filteredViolations.length} violation URL${filteredViolations.length !== 1 ? "s" : ""}`,
                  "Similarity scores and platform",
                  "Gemini AI analysis (where available)",
                  "Platform-specific DMCA links",
                ].map((item, i) => (
                  <Box key={i} sx={{ display: "flex", gap: 1, mb: 0.5 }}>
                    <CheckCircleRoundedIcon sx={{ fontSize: 14, color: "#34A853", mt: 0.2 }} />
                    <Typography variant="caption" sx={{ color: "#5F6368" }}>{item}</Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Warning */}
              <Box sx={{ bgcolor: "#FEF3C7", borderRadius: 2, p: 1.5, mb: 2 }}>
                <Typography variant="caption" sx={{ color: "#92400E", fontWeight: 600, display: "block", mb: 0.25 }}>
                  ⚠️ Important
                </Typography>
                <Typography variant="caption" sx={{ color: "#78350F", lineHeight: 1.6 }}>
                  PixelGuard never auto-sends takedowns. You review and send this report yourself.
                  Filing a false DMCA claim can have legal consequences.
                </Typography>
              </Box>

              {/* Good faith checkbox */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={confirmed}
                    onChange={e => { setConfirmed(e.target.checked); setError(""); }}
                    sx={{ color: "#1A73E8", "&.Mui-checked": { color: "#1A73E8" } }}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: "#5F6368", lineHeight: 1.5 }}>
                    I have a good faith belief that the use of the material is not authorised
                    by the copyright owner, its agent, or the law.
                  </Typography>
                }
                sx={{ mb: 2, alignItems: "flex-start" }}
              />

              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: "0.8rem" }}>{error}</Alert>}

              {loading && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

              {downloaded && (
                <Alert severity="success" sx={{ mb: 2, borderRadius: 2, fontSize: "0.8rem" }}>
                  Report downloaded! Send it along with your ownership certificate to the platform's DMCA team.
                </Alert>
              )}

              <Button
                fullWidth variant="contained" size="large"
                startIcon={loading ? null : <DownloadRoundedIcon />}
                onClick={handleDownload}
                disabled={loading || !confirmed || filteredViolations.length === 0}
                sx={{
                  py: 1.5, borderRadius: 3,
                  bgcolor: "#EA4335",
                  "&:hover": { bgcolor: "#C62828" },
                  "&.Mui-disabled": { bgcolor: "#FFCDD2", color: "#fff" },
                }}
              >
                {loading ? "Generating..." : "Download DMCA Report PDF"}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
}