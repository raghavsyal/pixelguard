// src/pages/MyArtworks.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Grid, Card, CardContent, CardActions, Typography,
  Button, Chip, Skeleton, Alert, TextField, InputAdornment,
} from "@mui/material";
import SearchRoundedIcon       from "@mui/icons-material/SearchRounded";
import VerifiedRoundedIcon     from "@mui/icons-material/VerifiedRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import BrushRoundedIcon        from "@mui/icons-material/BrushRounded";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

function ArtworkCard({ art, onViewCert, onScan }) {
  const violations = art.violations || [];
  const highRisk   = violations.filter(v => v.risk === "High Risk").length;
  const status     = violations.length === 0 ? "clean"
                   : highRisk > 0 ? "high" : "medium";

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Color band */}
      <Box sx={{
        height: 6,
        bgcolor: status === "clean" ? "#34A853" : status === "high" ? "#EA4335" : "#FBBC05",
        borderRadius: "16px 16px 0 0",
      }} />

      <CardContent sx={{ flex: 1, p: 2.5 }}>
        {/* Status chip */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
          <Chip
            size="small"
            icon={status === "clean"
              ? <VerifiedRoundedIcon fontSize="small" />
              : <WarningAmberRoundedIcon fontSize="small" />}
            label={status === "clean" ? "Protected" : `${violations.length} violation${violations.length > 1 ? "s" : ""}`}
            sx={{
              bgcolor: status === "clean" ? "#E6F4EA" : status === "high" ? "#FCE8E6" : "#FEF3C7",
              color:   status === "clean" ? "#34A853" : status === "high" ? "#EA4335" : "#B45309",
              fontWeight: 600, fontSize: "0.7rem",
            }}
          />
          <Typography variant="caption">{art.registered_at_str?.slice(0, 10)}</Typography>
        </Box>

        {/* Title */}
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5, color: "#202124" }} noWrap>
          {art.artwork_title}
        </Typography>
        <Typography variant="caption" sx={{ display: "block", mb: 1.5, color: "#5F6368" }} noWrap>
          {art.artwork_desc || "No description"}
        </Typography>

        {/* Hashes */}
        <Box sx={{ bgcolor: "#F8F9FA", borderRadius: 2, p: 1.5 }}>
          <Typography variant="caption" sx={{ color: "#5F6368", display: "block" }}>
            Asset ID: <strong>{art.asset_id}</strong>
          </Typography>
          <Typography variant="caption" sx={{ color: "#5F6368", display: "block", mt: 0.5 }} noWrap>
            SHA-256: {art.sha256?.slice(0, 20)}...
          </Typography>
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0, gap: 1 }}>
        <Button size="small" variant="outlined" onClick={() => onViewCert(art)}
          sx={{ flex: 1, borderRadius: 2 }}>
          Certificate
        </Button>
        <Button size="small" variant="contained" onClick={() => onScan(art)}
          sx={{ flex: 1, borderRadius: 2 }}>
          Scan
        </Button>
      </CardActions>
    </Card>
  );
}

export default function MyArtworks() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [artworks,  setArtworks]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");

  const STREAMLIT_URL = process.env.REACT_APP_STREAMLIT_URL || "http://localhost:8501";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const q    = query(collection(db, "artworks"), where("owner_email", "==", user.email));
        const snap = await getDocs(q);
        setArtworks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { setError("Could not load artworks."); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const filtered = artworks.filter(a =>
    a.artwork_title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 600, color: "#202124" }}>My Artworks</Typography>
          <Typography variant="body2" sx={{ color: "#5F6368" }}>
            {artworks.length} artwork{artworks.length !== 1 ? "s" : ""} registered
          </Typography>
        </Box>
        <Button
          variant="contained" startIcon={<BrushRoundedIcon />}
          onClick={() => navigate("/upload")}
        >
          Register new artwork
        </Button>
      </Box>

      {/* Search */}
      <TextField
        fullWidth placeholder="Search your artworks..."
        value={search} onChange={e => setSearch(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ color: "#5F6368" }} /></InputAdornment> }}
        sx={{ mb: 3, maxWidth: 400 }}
        size="small"
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Grid container spacing={2}>
          {[1,2,3].map(i => <Grid item xs={12} sm={6} md={4} key={i}><Skeleton height={220} sx={{ borderRadius: 2 }} /></Grid>)}
        </Grid>
      ) : filtered.length === 0 ? (
        <Card sx={{ p: 4, textAlign: "center" }}>
          <BrushRoundedIcon sx={{ fontSize: 48, color: "#E0E0E0", mb: 1 }} />
          <Typography variant="h4" sx={{ color: "#5F6368", mb: 1 }}>
            {search ? "No artworks match your search." : "No artworks registered yet."}
          </Typography>
          {!search && (
            <Button variant="contained" sx={{ mt: 1 }}
              onClick={() => window.location.href = `${STREAMLIT_URL}?page=upload&email=${user?.email}&name=${user?.name}`}>
              Register your first artwork
            </Button>
          )}
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(art => (
            <Grid item xs={12} sm={6} md={4} key={art.id}>
              <ArtworkCard
                art={art}
                onViewCert={(a) => navigate(`/certificates?id=${a.asset_id}`)}
                onScan={(a) => navigate(`/scan?asset_id=${a.asset_id}`)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Layout>
  );
}
