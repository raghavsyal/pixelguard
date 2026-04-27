// src/pages/Certificates.js
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box, Card, CardContent, Typography, Button,
  Divider, Alert, Skeleton, Chip, Grid,
} from "@mui/material";
import VerifiedRoundedIcon  from "@mui/icons-material/VerifiedRounded";
import DownloadRoundedIcon  from "@mui/icons-material/DownloadRounded";
import LinkRoundedIcon      from "@mui/icons-material/LinkRounded";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

function CertCard({ art }) {
  const verifyUrl = `${window.location.origin}?verify=${art.asset_id}`;
  const STREAMLIT_URL = process.env.REACT_APP_STREAMLIT_URL || "http://localhost:8501";

  return (
    <Card sx={{
      border: "1px solid #E0E0E0",
      maxWidth: 600, mx: "auto",
    }}>
      {/* Header */}
      <Box sx={{
        background: "linear-gradient(135deg, #1A73E8 0%, #0D9488 100%)",
        p: 3, textAlign: "center",
      }}>
        <VerifiedRoundedIcon sx={{ color: "#fff", fontSize: 40, mb: 1 }} />
        <Typography variant="h3" sx={{ color: "#fff", fontWeight: 700 }}>
          PixelGuard Certificate
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mt: 0.5 }}>
          Digital Artwork Ownership Certificate
        </Typography>
      </Box>

      <CardContent sx={{ p: 3 }}>
        {/* Fields */}
        {[
          ["Artist / Creator",   art.artist_name],
          ["Artwork Title",      art.artwork_title],
          ["Asset ID",           art.asset_id],
          ["Registered (UTC)",   art.registered_at_str?.slice(0, 19).replace("T"," ")],
          ["SHA-256 Hash",       art.sha256],
          ["Perceptual Hash",    art.phash],
          ["Owner Email",        art.owner_email],
        ].map(([label, val]) => (
          <Box key={label} sx={{ display: "flex", gap: 2, py: 1.25, borderBottom: "1px solid #F1F3F4" }}>
            <Typography variant="caption" sx={{ color: "#5F6368", fontWeight: 600, minWidth: 130 }}>
              {label}
            </Typography>
            <Typography variant="caption" sx={{
              color: "#202124", wordBreak: "break-all",
              fontFamily: label.includes("Hash") || label.includes("ID") ? "monospace" : "inherit",
            }}>
              {val || "—"}
            </Typography>
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />

        {/* Verified badge */}
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Chip
            icon={<VerifiedRoundedIcon />}
            label="Verified & Timestamped by PixelGuard AI Protection System"
            sx={{ bgcolor: "#E6F4EA", color: "#34A853", fontWeight: 600, py: 0.5 }}
          />
        </Box>

        {/* Note */}
        <Box sx={{ bgcolor: "#F8F9FA", borderRadius: 2, p: 2, mb: 2 }}>
          <Typography variant="caption" sx={{ color: "#5F6368", lineHeight: 1.7, display: "block" }}>
            This certificate is timestamped by Firebase (Google Cloud) servers and cannot be backdated.
            The SHA-256 hash is a unique cryptographic fingerprint of the original file.
            The perceptual hash identifies visually similar copies even after editing.
          </Typography>
        </Box>

        {/* Verify link */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, bgcolor: "#E8F0FE", borderRadius: 2, mb: 2 }}>
          <LinkRoundedIcon sx={{ color: "#1A73E8", fontSize: 18 }} />
          <Typography variant="caption" sx={{ color: "#1A73E8", wordBreak: "break-all" }}>
            Public verify link: {verifyUrl}
          </Typography>
        </Box>

        {/* Download button — goes to Streamlit for PDF */}
        <Button
          fullWidth variant="contained" size="large"
          startIcon={<DownloadRoundedIcon />}
          href={`${process.env.REACT_APP_API_URL}/api/certificate/${art.asset_id}`}
          sx={{ borderRadius: 3 }}
        >
          Download PDF Certificate
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Certificates() {
  const { user }         = useAuth();
  const [params]         = useSearchParams();
  const targetId         = params.get("id");
  const [artworks,  setArtworks]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [selected,  setSelected]  = useState(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        if (targetId) {
          const snap = await getDoc(doc(db, "artworks", targetId));
          if (snap.exists()) {
            setArtworks([{ id: snap.id, ...snap.data() }]);
            setSelected({ id: snap.id, ...snap.data() });
          }
        } else {
          const q    = query(collection(db, "artworks"), where("owner_email", "==", user.email));
          const snap = await getDocs(q);
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setArtworks(list);
          if (list.length > 0) setSelected(list[0]);
        }
      } catch (e) { setError("Could not load certificates."); }
      finally { setLoading(false); }
    };
    load();
  }, [user, targetId]);

  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" sx={{ fontWeight: 600, color: "#202124" }}>Certificates</Typography>
        <Typography variant="body2" sx={{ color: "#5F6368" }}>
          Your ownership certificates — verifiable proof of creation.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Skeleton height={400} sx={{ borderRadius: 2 }} />
      ) : artworks.length === 0 ? (
        <Alert severity="info">No certificates yet. Register an artwork to generate your first one.</Alert>
      ) : (
        <Grid container spacing={3}>
          {/* Artwork selector */}
          {artworks.length > 1 && (
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h4" sx={{ mb: 1.5, fontWeight: 600 }}>Select artwork</Typography>
                  {artworks.map(a => (
                    <Box
                      key={a.id}
                      onClick={() => setSelected(a)}
                      sx={{
                        p: 1.5, borderRadius: 2, cursor: "pointer", mb: 1,
                        bgcolor: selected?.id === a.id ? "#E8F0FE" : "#F8F9FA",
                        border: selected?.id === a.id ? "1px solid #1A73E8" : "1px solid transparent",
                        "&:hover": { bgcolor: "#E8F0FE" },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500, color: "#202124" }} noWrap>
                        {a.artwork_title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#5F6368" }}>
                        {a.asset_id}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Certificate display */}
          <Grid item xs={12} md={artworks.length > 1 ? 9 : 12}>
            {selected && <CertCard art={selected} />}
          </Grid>
        </Grid>
      )}
    </Layout>
  );
}
