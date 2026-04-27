// src/components/Layout.js
import React from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import TopBar  from "./TopBar";

export default function Layout({ children }) {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#F8F9FA" }}>
      <Sidebar />
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <TopBar />
        <Box component="main" sx={{ flex: 1, mt: "64px", p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
