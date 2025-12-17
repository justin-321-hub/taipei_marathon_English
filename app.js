/**
 * app.js — Frontend Chat Logic (English Version)
 * ---------------------------------------------------------
 * Key Features:
 * 1) Basic message handling (User/Bot)
 * 2) No-login multi-user support via localStorage clientId
 * 3) Thinking animation control
 * 4) Backend API integration with English response request
 * 5) HTML rendering support for rich text responses
 * 6) Auto-retry mechanism for error code 200
 * 7) Auto-retry when response contains "Search Results" and "Html"
 */

"use strict";

/* =========================
   Backend API Configuration
   ========================= */
const API_BASE = "https://taipei-marathon-server.onrender.com";
const api = (p) => `${API_BASE}${p}`;

/* =========================
   Client ID Management
   ========================= */
const CID_KEY = "fourleaf_client_id";
let clientId = localStorage.getItem(CID_KEY);
if (!clientId) {
  clientId =
    (crypto.randomUUID && crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(36
