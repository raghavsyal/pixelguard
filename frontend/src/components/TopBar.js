// src/components/TopBar.js
import React from "react";
import { AppBar, Toolbar, InputBase, Box, Avatar, Tooltip } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useAuth } from "../context/AuthContext";

export default function TopBar() {
  const { user } = useAuth();

  return (
    <AppBar position="fixed" elevation={0} sx={{
      zIndex: (theme) => theme.zIndex.drawer + 1,
      backgroundColor: "#fff",
      borderBottom: "1px solid #E0E0E0",
      ml: "240px",
      width: "calc(100% - 240px)",
    }}>
      <Toolbar sx={{ gap: 2, minHeight: "64px !important" }}>
        {/* Search bar */}
        <Box sx={{
          flex: 1, maxWidth: 480,
          display: "flex", alignItems: "center", gap: 1,
          backgroundColor: "#F1F3F4",
          borderRadius: 24, px: 2, py: 0.75,
        }}>
          <SearchRoundedIcon sx={{ color: "#5F6368", fontSize: 20 }} />
          <InputBase
            placeholder="Search artworks..."
            sx={{ fontSize: "0.9rem", color: "#202124", flex: 1 }}
          />
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Avatar */}
        <Tooltip title={user?.email || ""}>
          <Avatar sx={{
            width: 36, height: 36,
            bgcolor: "#1A73E8", fontSize: "0.85rem",
            cursor: "pointer",
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </Avatar>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
