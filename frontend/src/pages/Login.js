// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Card, CardContent, Typography, TextField,
  Button, Alert, Divider, List, ListItem,
  ListItemIcon, ListItemText,
} from "@mui/material";
import ShieldRoundedIcon      from "@mui/icons-material/ShieldRounded";
import FingerprintRoundedIcon from "@mui/icons-material/FingerprintRounded";
import SearchRoundedIcon      from "@mui/icons-material/SearchRounded";
import GavelRoundedIcon       from "@mui/icons-material/GavelRounded";
import VerifiedRoundedIcon    from "@mui/icons-material/VerifiedRounded";
import { useAuth } from "../context/AuthContext";

const features = [
  { icon: <FingerprintRoundedIcon sx={{ color: "#1A73E8" }} />, text: "Tamper-proof ownership certificates with Firebase timestamps" },
  { icon: <SearchRoundedIcon     sx={{ color: "#34A853" }} />, text: "AI-powered web scanning for stolen or edited copies" },
  { icon: <VerifiedRoundedIcon   sx={{ color: "#0D9488" }} />, text: "Gemini AI explains each violation in plain language" },
  { icon: <GavelRoundedIcon      sx={{ color: "#EA4335" }} />, text: "One-click DMCA report generation for takedowns" },
];

export default function Login() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const isValidEmail = (e) => /^[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}$/.test(e);

  const handleSubmit = () => {
    if (!name.trim())         { setError("Please enter your name."); return; }
    if (!isValidEmail(email)) { setError("Please enter a valid email address."); return; }
    login(name.trim(), email);
    navigate("/dashboard");
  };

  return (
    <Box sx={{
      minHeight: "100vh", backgroundColor: "#F8F9FA",
      display: "flex", alignItems: "center", justifyContent: "center",
      p: 2,
    }}>
      <Box sx={{ width: "100%", maxWidth: 960, display: "flex", gap: 4, alignItems: "stretch" }}>

        {/* Left — branding */}
        <Box sx={{ flex: 1, display: { xs: "none", md: "flex" }, flexDirection: "column", justifyContent: "center", pr: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: "14px",
              background: "linear-gradient(135deg, #1A73E8, #0D9488)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <ShieldRoundedIcon sx={{ color: "#fff", fontSize: 26 }} />
            </Box>
            <Typography variant="h2" sx={{ color: "#202124", fontWeight: 600 }}>
              PixelGuard
            </Typography>
          </Box>

          <Typography variant="h3" sx={{ color: "#202124", mb: 1, fontWeight: 500 }}>
            Protect your digital art.
          </Typography>
          <Typography variant="body1" sx={{ color: "#5F6368", mb: 3, lineHeight: 1.7 }}>
            The only free tool that proves you made it <em>and</em> finds who stole it.
            Built for independent creators, powered by Google AI.
          </Typography>

          <List dense disablePadding>
            {features.map((f, i) => (
              <ListItem key={i} disablePadding sx={{ mb: 1 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>{f.icon}</ListItemIcon>
                <ListItemText
                  primary={f.text}
                  primaryTypographyProps={{ fontSize: "0.875rem", color: "#5F6368" }}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Right — login card */}
        <Card sx={{ flex: 1, maxWidth: 420 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h3" sx={{ mb: 0.5, fontWeight: 600, color: "#202124" }}>
              Sign in
            </Typography>
            <Typography variant="body2" sx={{ color: "#5F6368", mb: 3 }}>
              Enter your details to access your dashboard. No password needed — this is a demo session.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

            <TextField
              fullWidth label="Your name or artist handle"
              placeholder="e.g. Priya Sharma"
              value={name} onChange={(e) => { setName(e.target.value); setError(""); }}
              sx={{ mb: 2 }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <TextField
              fullWidth label="Email address"
              placeholder="e.g. priya@gmail.com"
              type="email"
              value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
              sx={{ mb: 3 }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />

            <Button
              fullWidth variant="contained" size="large"
              onClick={handleSubmit}
              sx={{ py: 1.5, fontSize: "0.95rem", borderRadius: 3 }}
            >
              Enter PixelGuard →
            </Button>

            <Divider sx={{ my: 3 }} />

            <Typography variant="caption" sx={{ color: "#5F6368", display: "block", textAlign: "center" }}>
              Your email is used only as a session identifier. No account is created.
              Data is stored securely in Google Firebase Firestore.
            </Typography>
          </CardContent>
        </Card>

      </Box>
    </Box>
  );
}
