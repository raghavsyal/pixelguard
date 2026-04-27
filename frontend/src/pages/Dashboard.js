// src/pages/Dashboard.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Grid, Card, CardContent, Typography, Button,
  Chip, Avatar, List, ListItem, ListItemAvatar,
  ListItemText, Divider, Skeleton, Alert,
} from "@mui/material";
import BrushRoundedIcon        from "@mui/icons-material/BrushRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import VerifiedRoundedIcon     from "@mui/icons-material/VerifiedRounded";
import SearchRoundedIcon       from "@mui/icons-material/SearchRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

function StatCard({ label, value, icon, color, loading }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5 }}>
        <Avatar sx={{ bgcolor: color + "20", width: 48, height: 48 }}>
          {React.cloneElement(icon, { sx: { color } })}
        </Avatar>
        <Box>
          {loading
            ? <Skeleton width={60} height={36} />
            : <Typography variant="h2" sx={{ fontWeight: 700, color: "#202124" }}>{value}</Typography>
          }
          <Typography variant="caption" sx={{ color: "#5F6368" }}>{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [artworks,   setArtworks]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const q    = query(collection(db, "artworks"), where("owner_email", "==", user.email));
        const snap = await getDocs(q);
        setArtworks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        setError("Could not load data. Check your Firebase connection.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const totalArtworks  = artworks.length;
  const allViolations  = artworks.flatMap(a => a.violations || []);
  const highRisk       = allViolations.filter(v => v.risk === "High Risk").length;
  const protected_     = artworks.filter(a => !(a.violations || []).length).length;

  // Activity feed — last 5 events across all artworks
  const activity = artworks.flatMap(a => [
    { type: "registered", ts: a.registered_at_str, title: a.artwork_title, id: a.asset_id },
    ...(a.violations || []).map(v => ({
      type: "violation", ts: v.first_seen || a.registered_at_str,
      title: a.artwork_title, url: v.url, id: a.asset_id,
    })),
  ]).sort((a, b) => (b.ts || "").localeCompare(a.ts || "")).slice(0, 6);

  const STREAMLIT_URL = process.env.REACT_APP_STREAMLIT_URL || "http://localhost:8501";

  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" sx={{ color: "#202124", fontWeight: 600 }}>
          Welcome back, {user?.name?.split(" ")[0]} 👋
        </Typography>
        <Typography variant="body2" sx={{ color: "#5F6368", mt: 0.5 }}>
          Here's an overview of your artwork protection status.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Stats row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Total artworks",   value: totalArtworks, icon: <BrushRoundedIcon />,        color: "#1A73E8" },
          { label: "Protected",        value: protected_,    icon: <VerifiedRoundedIcon />,      color: "#34A853" },
          { label: "Violations found", value: allViolations.length, icon: <WarningAmberRoundedIcon />, color: "#EA4335" },
          { label: "High risk",        value: highRisk,      icon: <WarningAmberRoundedIcon />,  color: "#FBBC05" },
        ].map((s, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <StatCard {...s} loading={loading} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Activity feed */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>Recent activity</Typography>
              {loading
                ? [1,2,3].map(i => <Skeleton key={i} height={56} sx={{ mb: 1 }} />)
                : activity.length === 0
                  ? <Typography variant="body2" sx={{ color: "#5F6368", py: 2, textAlign: "center" }}>
                      No activity yet. Upload your first artwork to get started.
                    </Typography>
                  : <List disablePadding>
                      {activity.map((a, i) => (
                        <React.Fragment key={i}>
                          <ListItem disablePadding sx={{ py: 1 }}>
                            <ListItemAvatar>
                              <Avatar sx={{
                                width: 36, height: 36,
                                bgcolor: a.type === "violation" ? "#FCE8E6" : "#E6F4EA",
                              }}>
                                {a.type === "violation"
                                  ? <WarningAmberRoundedIcon sx={{ color: "#EA4335", fontSize: 18 }} />
                                  : <VerifiedRoundedIcon     sx={{ color: "#34A853", fontSize: 18 }} />
                                }
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={a.type === "violation"
                                ? `Violation detected — ${a.title}`
                                : `Artwork registered — ${a.title}`
                              }
                              secondary={a.ts?.slice(0, 10) || ""}
                              primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 500 }}
                              secondaryTypographyProps={{ fontSize: "0.75rem" }}
                            />
                            <Chip
                              label={a.type === "violation" ? "Violation" : "Registered"}
                              size="small"
                              sx={{
                                bgcolor: a.type === "violation" ? "#FCE8E6" : "#E6F4EA",
                                color:   a.type === "violation" ? "#EA4335" : "#34A853",
                                fontWeight: 500, fontSize: "0.7rem",
                              }}
                            />
                          </ListItem>
                          {i < activity.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
              }
            </CardContent>
          </Card>
        </Grid>

        {/* Quick actions */}
        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>Quick actions</Typography>
              <Button
                fullWidth variant="contained" size="large"
                startIcon={<BrushRoundedIcon />}
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate("/upload")}
                sx={{ mb: 1.5, justifyContent: "flex-start", px: 2.5 }}
              >
                Register new artwork
              </Button>
              <Button
                fullWidth variant="outlined" size="large"
                startIcon={<SearchRoundedIcon />}
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate("/scan")}
                sx={{ mb: 1.5, justifyContent: "flex-start", px: 2.5 }}
              >
                Scan for violations
              </Button>
              <Button
                fullWidth variant="text" size="large"
                startIcon={<WarningAmberRoundedIcon />}
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate("/violations")}
                sx={{ justifyContent: "flex-start", px: 2.5, color: "#EA4335" }}
              >
                View all violations
              </Button>
            </CardContent>
          </Card>

          {/* Protection tip */}
          <Card sx={{ bgcolor: "#E8F0FE", boxShadow: "none" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#1A73E8", mb: 0.5 }}>
                💡 Pro tip
              </Typography>
              <Typography variant="body2" sx={{ color: "#1565C0", lineHeight: 1.6 }}>
                Run a scan immediately after posting new artwork online — the sooner you detect theft, the stronger your DMCA claim.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
}