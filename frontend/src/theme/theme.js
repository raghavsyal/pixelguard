// src/theme/theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary:   { main: "#1A73E8", contrastText: "#fff" },
    secondary: { main: "#0D9488" },
    error:     { main: "#EA4335" },
    warning:   { main: "#FBBC05" },
    success:   { main: "#34A853" },
    background:{ default: "#F8F9FA", paper: "#FFFFFF" },
    text:      { primary: "#202124", secondary: "#5F6368" },
  },
  typography: {
    fontFamily: "'Roboto', 'Inter', sans-serif",
    h1: { fontSize: "2rem",   fontWeight: 600 },
    h2: { fontSize: "1.5rem", fontWeight: 500 },
    h3: { fontSize: "1.25rem",fontWeight: 500 },
    h4: { fontSize: "1.1rem", fontWeight: 500 },
    body1: { fontSize: "0.95rem" },
    body2: { fontSize: "0.85rem" },
    caption: { fontSize: "0.75rem", color: "#5F6368" },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 24,
          fontWeight: 500,
          boxShadow: "none",
          "&:hover": { boxShadow: "0 1px 3px rgba(0,0,0,0.15)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            transform: "translateY(-1px)",
            transition: "all 0.2s ease",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: "none", backgroundColor: "#F8F9FA" },
      },
    },
  },
});

export default theme;
