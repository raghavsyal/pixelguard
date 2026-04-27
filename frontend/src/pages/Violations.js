// src/pages/Violations.js
import React, { useEffect, useState } from "react";
import {
  Box, Card, CardContent, Typography, Chip, Button,
  Alert, Skeleton, Divider, ToggleButtonGroup, ToggleButton,
  Avatar,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import OpenInNewRoundedIcon    from "@mui/icons-material/OpenInNewRounded";
import GavelRoundedIcon        from "@mui/icons-material/GavelRounded";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";

const riskColors = {
  "High Risk":   { bg: "#FCE8E6", text: "#C62828", border: "#FFCDD2" },
  "Medium Risk": { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  "Low Risk":    { bg: "#E6F4EA", text: "#1B5E20", border: "#C8E6C9" },
};

export default function Violations() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [artworks, setArtworks] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [filter,   setFilter]   = useState("All");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const q    = query(collection(db, "artworks"), where("owner_email", "==", user.email));
        const snap = await getDocs(q);
        setArtworks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { setError("Could not load violations."); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  // Flatten all violations with artwork context
  const allViolations = artworks.flatMap(a =>
    (a.violations || []).map(v => ({
      ...v,
      artwork_title: a.artwork_title,
      asset_id:      a.asset_id,
    }))
  );

  const filtered = filter === "All"
    ? allViolations
    : allViolations.filter(v => v.risk === filter);

  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" sx={{ fontWeight: 600, color: "#202124" }}>Violations</Typography>
        <Typography variant="body2" sx={{ color: "#5F6368" }}>
          {allViolations.length} total violation{allViolations.length !== 1 ? "s" : ""} detected across your artworks
        </Typography>
      </Box>

      {/* Filter tabs */}
      <ToggleButtonGroup
        value={filter} exclusive
        onChange={(_, v) => v && setFilter(v)}
        sx={{ mb: 3 }}
        size="small"
      >
        {["All", "High Risk", "Medium Risk", "Low Risk"].map(f => (
          <ToggleButton key={f} value={f} sx={{ borderRadius: "8px !important", px: 2, textTransform: "none" }}>
            {f} {f !== "All" && `(${allViolations.filter(v => v.risk === f).length})`}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        [1,2,3].map(i => <Skeleton key={i} height={120} sx={{ mb: 1.5, borderRadius: 2 }} />)
      ) : filtered.length === 0 ? (
        <Card sx={{ p: 4, textAlign: "center" }}>
          <WarningAmberRoundedIcon sx={{ fontSize: 48, color: "#E0E0E0", mb: 1 }} />
          <Typography variant="h4" sx={{ color: "#5F6368" }}>
            {filter === "All" ? "No violations detected. Your artworks are safe." : `No ${filter} violations.`}
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {filtered.map((v, i) => {
            const rc = riskColors[v.risk] || riskColors["Low Risk"];
            return (
              <Card key={i} sx={{
                border: `1px solid ${rc.border}`,
                borderLeft: `4px solid ${rc.text}`,
                borderRadius: "12px",
                "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
              }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                    <Box sx={{ flex: 1 }}>
                      {/* Risk + platform */}
                      <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
                        <Chip label={v.risk} size="small"
                          sx={{ bgcolor: rc.bg, color: rc.text, fontWeight: 700, fontSize: "0.7rem" }} />
                        <Chip label={v.platform || "Other"} size="small" variant="outlined"
                          sx={{ fontSize: "0.7rem" }} />
                        <Chip label={`${v.similarity}% match`} size="small"
                          sx={{ bgcolor: "#F1F3F4", fontSize: "0.7rem" }} />
                        {v.status && (
                          <Chip label={v.status} size="small"
                            sx={{
                              bgcolor: v.status === "Resolved" ? "#E6F4EA" : "#F1F3F4",
                              color:   v.status === "Resolved" ? "#34A853" : "#5F6368",
                              fontSize: "0.7rem",
                            }} />
                        )}
                      </Box>

                      {/* Artwork title */}
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#202124", mb: 0.5 }}>
                        {v.artwork_title}
                      </Typography>

                      {/* URL */}
                      <Typography variant="caption" sx={{ color: "#1A73E8", wordBreak: "break-all" }}>
                        {v.url?.slice(0, 80)}{v.url?.length > 80 ? "..." : ""}
                      </Typography>

                      {/* Gemini summary */}
                      {v.gemini_summary && (
                        <Box sx={{ mt: 1, p: 1.5, bgcolor: "#F8F9FA", borderRadius: 2 }}>
                          <Typography variant="caption" sx={{ color: "#5F6368", fontWeight: 600 }}>
                            🤖 Gemini AI:
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#5F6368", display: "block", mt: 0.25 }}>
                            {v.gemini_summary}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 130 }}>
                      <Button
                        size="small" variant="outlined"
                        startIcon={<OpenInNewRoundedIcon fontSize="small" />}
                        href={v.url} target="_blank"
                        sx={{ borderRadius: 2, fontSize: "0.75rem" }}
                      >
                        View source
                      </Button>
                      <Button
                        size="small" variant="contained" color="error"
                        startIcon={<GavelRoundedIcon fontSize="small" />}
                        onClick={() => navigate("/dmca")}
                        sx={{ borderRadius: 2, fontSize: "0.75rem" }}
                      >
                        DMCA report
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Layout>
  );
}
