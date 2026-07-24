import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";

// 🔥 POTVRDENIE NOVEJ OTA VERZIE – MUSÍ BEŽAŤ SKÔR AKO REACT
if (Capacitor.isNativePlatform()) {
  CapacitorUpdater.notifyAppReady().catch(err => {
    console.error("Capgo notify failed:", err);
  });
}

const isElectron = navigator.userAgent.toLowerCase().includes('electron');

if (!Capacitor.isNativePlatform() && !isElectron && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('PWA service worker registration failed:', err);
    });
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
