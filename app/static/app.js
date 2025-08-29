import { showBotResponseSteps } from "/static/botResponseAnimator.js";

const chatBox  = document.getElementById("chat-box");
const inputEl  = document.getElementById("user-input");
const sendBtn  = document.getElementById("send-btn");
const robotGif = document.getElementById("robot-gif");
const typingEl = document.getElementById("typing-indicator");

// NEW refs
const welcomeContainer = document.getElementById("welcome-container");
const welcomeTextEl    = document.getElementById("welcome-text");
const WELCOME_MSG = "Hey, It’s LIA, your Intelligent Agent. Wondering how I can supercharge your business? Or maybe you just want to know more about me? Shoot your questions my way!";

let welcomeTimeoutId = null;
let welcomeTypingTimer = null;
let welcomeCanceled = false;
let welcomeStarted  = false;

// ---- Typing indicator helpers --------------------------------------------
function showTyping() {
  typingEl.classList.remove("hidden");
  chatBox.appendChild(typingEl);
  chatBox.scrollTop = chatBox.scrollHeight;
}
function hideTyping() {
  typingEl.classList.add("hidden");
}

// ---- Send button enable/disable -------------------------------------------
function syncSendDisabled() {
  sendBtn.disabled = inputEl.textContent.trim() === "";
}
syncSendDisabled();

// ---- Welcome flow (above input) -------------------------------------------
function startWelcome() {
  if (welcomeStarted || welcomeCanceled) return;
  welcomeStarted = true;

  if (robotGif) robotGif.style.display = "none";
  if (!welcomeContainer || !welcomeTextEl) return;

  welcomeContainer.classList.remove("hidden");

  // Show typing indicator for 2 seconds, then start welcome animation
  welcomeContainer.appendChild(typingEl);
  typingEl.classList.remove("hidden");

  setTimeout(() => {
    typingEl.classList.add("hidden");
    welcomeTextEl.textContent = "";
    const chars = [...WELCOME_MSG];
    let i = 0;
    const SPEED = 26; // ms per char
    welcomeTypingTimer = setInterval(() => {
      if (welcomeCanceled) {
        cleanupWelcome(true);
        return;
      }
      if (i < chars.length) {
        welcomeTextEl.textContent += chars[i++];
      } else {
        clearInterval(welcomeTypingTimer);
        welcomeTypingTimer = null;
      }
    }, SPEED);
  }, 2000);
}

function cancelWelcomeIfPending() {
  if (welcomeTimeoutId) {
    clearTimeout(welcomeTimeoutId);
    welcomeTimeoutId = null;
  }
  if (!welcomeStarted) {
    welcomeCanceled = true;
    if (robotGif) robotGif.style.display = "none";
  } else {
    cleanupWelcome(true);
  }
}

function cleanupWelcome(hide = false) {
  if (welcomeTypingTimer) {
    clearInterval(welcomeTypingTimer);
    welcomeTypingTimer = null;
  }
  typingEl.classList.add("hidden");
  if (hide && !welcomeContainer.classList.contains("hidden")) {
    welcomeContainer.classList.add("hidden");
  }
  welcomeTextEl.textContent = "";
  if (robotGif) robotGif.style.display = "none";
  welcomeCanceled = true;
}

// Start the 2s timer once DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  welcomeTimeoutId = setTimeout(startWelcome, 2000);
});

// If the user starts typing before 2s, cancel the welcome + hide GIF
inputEl.addEventListener("input", () => {
  syncSendDisabled();
  if (inputEl.textContent.trim() !== "") {
    cancelWelcomeIfPending();
  }
});

// ---- Send message ----------------------------------------------------------
async function sendMessage() {
  const userText = inputEl.textContent.trim();
  if (!userText) return;

  // Cancel/hide welcome on first send
  cancelWelcomeIfPending();

  // Add user message
  const userMsg = document.createElement("div");
  userMsg.className = "message user";
  userMsg.textContent = userText;
  chatBox.appendChild(userMsg);

  // Clear input + keep UI tidy
  inputEl.textContent = "";
  syncSendDisabled();
  chatBox.scrollTop = chatBox.scrollHeight;

  // Show typing while fetching
  showTyping();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: userText })
    });

    const data = await res.json();
    const botText = data.response || "Sorry, I couldn't understand that.";

    hideTyping();
    showBotResponseSteps(botText, chatBox);
  } catch (err) {
    hideTyping();
    const errMsg = document.createElement("div");
    errMsg.className = "message bot";
    errMsg.textContent = "Network error. Please try again.";
    chatBox.appendChild(errMsg);
  } finally {
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// Events
sendBtn.addEventListener("click", () => {
  if (!sendBtn.disabled) sendMessage();
});
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});