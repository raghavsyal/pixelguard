// src/components/Sidebar.js
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Box, Typography, Avatar, Divider, Tooltip,
} from "@mui/material";
import DashboardRoundedIcon   from "@mui/icons-material/DashboardRounded";
import BrushRoundedIcon        from "@mui/icons-material/BrushRounded";
import SearchRoundedIcon       from "@mui/icons-material/SearchRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import VerifiedRoundedIcon     from "@mui/icons-material/VerifiedRounded";
import GavelRoundedIcon        from "@mui/icons-material/GavelRounded";
import LogoutRoundedIcon       from "@mui/icons-material/LogoutRounded";
import ShieldRoundedIcon       from "@mui/icons-material/ShieldRounded";
import { useAuth } from "../context/AuthContext";

const DRAWER_WIDTH = 240;

const navItems = [
  { label: "Dashboard",    icon: <DashboardRoundedIcon />,   path: "/dashboard"    },
  { label: "My Artworks",  icon: <BrushRoundedIcon />,        path: "/artworks"     },
  { label: "Register Art", icon: <VerifiedRoundedIcon />,     path: "/upload"       },
  { label: "Scan Internet",icon: <SearchRoundedIcon />,       path: "/scan"         },
  { label: "Violations",   icon: <WarningAmberRoundedIcon />, path: "/violations"   },
  { label: "Certificates", icon: <VerifiedRoundedIcon />,     path: "/certificates" },
  { label: "DMCA Report",  icon: <GavelRoundedIcon />,        path: "/dmca"         },
];

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <Drawer variant="permanent" sx={{
      width: DRAWER_WIDTH, flexShrink: 0,
      "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
    }}>
      {/* Logo */}
      <Box sx={{ px: 2.5, py: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: "10px",
          background: "linear-gradient(135deg, #1A73E8, #0D9488)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <ShieldRoundedIcon sx={{ color: "#fff", fontSize: 20 }} />
        </Box>
        <Typography variant="h4" sx={{ color: "#202124", letterSpacing: "-0.3px" }}>
          PixelGuard
        </Typography>
      </Box>

      <Divider sx={{ mx: 2, mb: 1 }} />

      {/* Nav items */}
      <List sx={{ px: 1.5, flex: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 3,
                  py: 1,
                  backgroundColor: active ? "#E8F0FE" : "transparent",
                  color: active ? "#1A73E8" : "#5F6368",
                  "&:hover": { backgroundColor: active ? "#E8F0FE" : "#F1F3F4" },
                }}
              >
                <ListItemIcon sx={{
                  minWidth: 36,
                  color: active ? "#1A73E8" : "#5F6368",
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    fontWeight: active ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ mx: 2 }} />

      {/* User + logout */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "#1A73E8", fontSize: "0.8rem" }}>
            {user?.name?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: "hidden" }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: "#202124" }} noWrap>
              {user?.name}
            </Typography>
            <Typography variant="caption" noWrap sx={{ display: "block" }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>
        <ListItemButton
          onClick={handleLogout}
          sx={{ borderRadius: 3, py: 0.75, color: "#5F6368",
                "&:hover": { backgroundColor: "#FCE8E6", color: "#EA4335" } }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Sign out"
            primaryTypographyProps={{ fontSize: "0.875rem" }} />
        </ListItemButton>
      </Box>
    </Drawer>
  );
}