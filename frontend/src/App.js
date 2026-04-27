// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme/theme";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login        from "./pages/Login";
import Dashboard    from "./pages/Dashboard";
import MyArtworks   from "./pages/MyArtworks";
import Upload       from "./pages/Upload";
import Scan         from "./pages/Scan";
import Violations   from "./pages/Violations";
import Certificates from "./pages/Certificates";
import DMCA         from "./pages/DMCA";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard"    element={<PrivateRoute><Dashboard    /></PrivateRoute>} />
      <Route path="/artworks"     element={<PrivateRoute><MyArtworks   /></PrivateRoute>} />
      <Route path="/upload"       element={<PrivateRoute><Upload       /></PrivateRoute>} />
      <Route path="/scan"         element={<PrivateRoute><Scan         /></PrivateRoute>} />
      <Route path="/violations"   element={<PrivateRoute><Violations   /></PrivateRoute>} />
      <Route path="/certificates" element={<PrivateRoute><Certificates /></PrivateRoute>} />
      <Route path="/dmca"         element={<PrivateRoute><DMCA         /></PrivateRoute>} />
      <Route path="*"             element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}