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
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(CID_KEY, clientId);
}

/* =========================
   DOM Elements
   ========================= */
const elMessages = document.getElementById("messages");
const elInput = document.getElementById("txtInput");
const elBtnSend = document.getElementById("btnSend");
const elThinking = document.getElementById("thinking");

/* =========================
   Message State
   ========================= */
const messages = [];

/* =========================
   Utilities
   ========================= */
const uid = () => Math.random().toString(36).slice(2);

function scrollToBottom() {
  elMessages?.scrollTo({ top: elMessages.scrollHeight, behavior: "smooth" });
}

/**
 * Toggle "Thinking" animation state
 */
function setThinking(on) {
  if (!elThinking) return;
  if (on) {
    elThinking.classList.remove("hidden");
    if (elBtnSend) elBtnSend.disabled = true;
    if (elInput) elInput.disabled = true;
  } else {
    elThinking.classList.add("hidden");
    if (elBtnSend) elBtnSend.disabled = false;
    if (elInput) elInput.disabled = false;
    elInput?.focus();
  }
}

/**
 * Smart Question Mark Handling
 */
function processQuestionMarks(text) {
  let result = text;
  // Remove trailing question marks
  result = result.replace(/[?？]\s*$/g, '');
  // Replace internal question marks with newlines
  result = result.replace(/[?？](?=.)/g, '\n');
  // Clean up multiple newlines
  result = result.replace(/\n\s*\n/g, '\n');
  return result.trim();
}

/**
 * HTML Escape (for User Input Safety)
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Check if response contains both "Search Results" and "Html"
 */
function containsSearchResultsAndHtml(text) {
  if (!text || typeof text !== 'string') return false;
  const lowerText = text.toLowerCase();
  return lowerText.includes('search results') && lowerText.includes('html');
}

/* =========================
   Render Messages
   ========================= */
function render() {
  if (!elMessages) return;
  elMessages.innerHTML = "";
  for (const m of messages) {
    const isUser = m.role === "user";
    const row = document.createElement("div");
    row.className = `msg ${isUser ? "user" : "bot"}`;

    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = isUser
      ? 'https://raw.githubusercontent.com/justin-321-hub/taipei_marathon/refs/heads/main/assets/user-avatar.png'
      : 'https://raw.githubusercontent.com/justin-321-hub/taipei_marathon/refs/heads/main/assets/logo.png';
    avatar.alt = isUser ? "You" : "Bot";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    if (isUser) {
      // User message: Escape HTML for security, convert newlines to <br>
      bubble.innerHTML = escapeHtml(m.text).replace(/\n/g, '<br>');
    } else {
      // Bot message: Render HTML directly (Table, List, Link support)
      bubble.innerHTML = m.text;
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    elMessages.appendChild(row);
  }
  scrollToBottom();
}

/* =========================
   Send Logic with Retry
   ========================= */
async function sendText(text, retryCount = 0) {
  const content = (text ?? elInput?.value ?? "").trim();
  if (!content) return;

  const contentToSend = processQuestionMarks(content);

  // Only add user message on first attempt (not on retry)
  if (retryCount === 0) {
    const userMsg = { id: uid(), role: "user", text: content, ts: Date.now() };
    messages.push(userMsg);
    if (elInput) elInput.value = "";
    render();
  }

  setThinking(true);

  try {
    // Send to backend
    const res = await fetch(api("/api/chat"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": clientId,
      },
      body: JSON.stringify({
        text: contentToSend,
        clientId,
        language: "英文",
        role: "user"
      }),
    });

    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { errorRaw: raw };
    }

    // Check for error code 200 (specific error condition)
    if (res.status === 200 && data && (data.error || data.errorRaw || 
        (data.text === "" || data.text === null || data.text === undefined))) {
      throw new Error("ERROR_CODE_200");
    }

    if (!res.ok) {
      if (res.status === 502 || res.status === 404) {
        throw new Error("Network unstable, please try again.");
      }
      const serverMsg = (data && (data.error || data.body || data.message)) ?? raw ?? "unknown error";
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${serverMsg}`);
    }

    // Process Bot Response
    let replyText;
    if (typeof data === "string") {
      replyText = data.trim() || "Please rephrase your question.";
    } else if (data && typeof data === "object") {
      const hasTextField = 'text' in data || 'message' in data;
      if (hasTextField) {
        const textValue = data.text !== undefined ? data.text : data.message;
        if (textValue === "" || textValue === null || textValue === undefined) {
          replyText = "Please rephrase your question.";
        } else {
          replyText = String(textValue).trim() || "Please rephrase your question.";
        }
      } else {
        const isPlainEmptyObject =
          !Array.isArray(data) &&
          Object.keys(data).filter(k => k !== 'clientId').length === 0;
        if (isPlainEmptyObject) {
          replyText = "Network error, please try again.";
        } else {
          replyText = JSON.stringify(data, null, 2);
        }
      }
    } else {
      replyText = "Please rephrase your question.";
    }

    // Check if response contains both "Search Results" and "Html"
    if (containsSearchResultsAndHtml(replyText)) {
      if (retryCount === 0) {
        // First occurrence: Show thinking message and retry
        const thinkingMsg = {
          id: uid(),
          role: "assistant",
          text: "Still thinking, please wait.",
          ts: Date.now(),
        };
        messages.push(thinkingMsg);
        render();

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setThinking(false);
        // Retry with the same content
        return sendText(content, retryCount + 1);
      }
      // Second occurrence: Continue to display the response anyway
    }

    const botMsg = { id: uid(), role: "assistant", text: replyText, ts: Date.now() };
    messages.push(botMsg);
    setThinking(false);
    render();

  } catch (err) {
    setThinking(false);

    // Handle ERROR_CODE_200 with retry logic
    if (err.message === "ERROR_CODE_200") {
      if (retryCount === 0) {
        // First error: Show retry message and retry
        const retryMsg = {
          id: uid(),
          role: "assistant",
          text: "Network is unstable, retrying for you.",
          ts: Date.now(),
        };
        messages.push(retryMsg);
        render();

        // Wait a moment before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Retry with the same content
        return sendText(content, retryCount + 1);
      } else {
        // Second error: Show final error message
        const finalErrorMsg = {
          id: uid(),
          role: "assistant",
          text: "Sorry, the network is currently unstable. Please try again later.",
          ts: Date.now(),
        };
        messages.push(finalErrorMsg);
        render();
        return;
      }
    }

    // Handle other errors
    const friendly = (!navigator.onLine && "You are currently offline. Please check your connection and try again.") || `${err?.message || err}`;
    const botErr = {
      id: uid(),
      role: "assistant",
      text: friendly,
      ts: Date.now(),
    };
    messages.push(botErr);
    render();
  }
}

/* =========================
   Event Listeners
   ========================= */
elBtnSend?.addEventListener("click", () => sendText());
elInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendText();
  }
});

window.addEventListener("load", () => elInput?.focus());

/* =========================
   Initial Welcome Message
   ========================= */
messages.push({
  id: uid(),
  role: "assistant",
  text: "Welcome to the Taipei Marathon Smart Customer Service!<br>I am your assistant. How can I help you today?",
  ts: Date.now(),
});
render();
