import { showBotResponseSteps } from "/static/botResponseAnimator.js";

const chatBox  = document.getElementById("chat-box");
const inputEl  = document.getElementById("user-input");
const sendBtn  = document.getElementById("send-btn");
const robotGif = document.getElementById("robot-gif");

// Welcome message
const welcomeContainer = document.getElementById("welcome-container");
const welcomeTextEl    = document.getElementById("welcome-text");
const WELCOME_MSG = "Hey, It's LIA, your Intelligent Agent. Wondering how I can supercharge your business? Or maybe you just want to know more about me? Shoot your questions my way!";

let welcomeTimeoutId = null;
let welcomeTypingTimer = null;
let welcomeCanceled = false;
let welcomeStarted  = false;

// ---- Helper to create bot message with avatar and optional typing dots ----
function createBotMessage() {
  const botMsg = document.createElement("div");
  botMsg.className = "message bot";
  botMsg.style.display = "flex";
  botMsg.style.alignItems = "flex-start";
  botMsg.style.gap = "8px";
  botMsg.style.background = "transparent";
  botMsg.style.padding = "0";
  
  // Create avatar element
  const avatar = document.createElement("img");
  avatar.className = "bot-avatar";
  avatar.src = "/static/AI Logo-01.png";
  avatar.alt = "HotelMate bot";
  avatar.style.width = "29px";
  avatar.style.height = "29px";
  avatar.style.borderRadius = "50%";
  avatar.style.objectFit = "cover";
  avatar.style.boxShadow = "0 1px 2px rgba(0,0,0,.12)";
  avatar.style.flexShrink = "0";
  
  // Create content container (will hold either dots or actual message)
  const contentDiv = document.createElement("div");
  contentDiv.className = "bot-content";
  contentDiv.style.background = "#e4e6eb";
  contentDiv.style.color = "#333";
  contentDiv.style.padding = "12px 16px";
  contentDiv.style.borderRadius = "12px";
  contentDiv.style.borderBottomLeftRadius = "0";
  contentDiv.style.lineHeight = "1.5";
  contentDiv.style.whiteSpace = "pre-wrap";
  contentDiv.style.maxWidth = "100%";
  
  // Append avatar and content
  botMsg.appendChild(avatar);
  botMsg.appendChild(contentDiv);
  
  return botMsg;
}

// ---- Helper to add typing dots to a content div ----
function addTypingDots(contentDiv) {
  contentDiv.innerHTML = '';
  contentDiv.style.display = "flex";
  contentDiv.style.alignItems = "center";
  contentDiv.style.gap = "4px";
  contentDiv.style.padding = "12px 16px";
  
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.width = "8px";
    dot.style.height = "8px";
    dot.style.background = "#000000";
    dot.style.borderRadius = "50%";
    dot.style.animation = "bounce 1.5s infinite ease-in-out";
    dot.style.animationDelay = `${i * 0.15}s`;
    contentDiv.appendChild(dot);
  }
  
  // Add keyframes if not already present
  if (!document.querySelector('#typing-animation-style')) {
    const style = document.createElement('style');
    style.id = 'typing-animation-style';
    style.textContent = `
      @keyframes bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
        40% { transform: translateY(-12px); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ---- Helper to clear typing dots and set text content ----
function replaceDotsWithContent(contentDiv, text) {
  contentDiv.innerHTML = '';
  contentDiv.style.display = "block";
  contentDiv.textContent = text;
}

// ---- Send button enable/disable -------------------------------------------
function syncSendDisabled() {
  sendBtn.disabled = inputEl.textContent.trim() === "";
}
syncSendDisabled();

// ---- Welcome flow -------------------------------------------
function showRobotGif() {
  if (robotGif && !welcomeCanceled) {
    // Create a container div for bottom-left positioning
    const gifContainer = document.createElement("div");
    gifContainer.id = "gif-container";
    gifContainer.style.position = "fixed";
    gifContainer.style.bottom = "90px"; // Above input field with proper spacing
    gifContainer.style.left = "20px";
    gifContainer.style.zIndex = "100";
    
    robotGif.style.display = "block";
    gifContainer.appendChild(robotGif);
    document.body.appendChild(gifContainer);
  }
}

function hideRobotGif() {
  const gifContainer = document.getElementById("gif-container");
  if (gifContainer) {
    gifContainer.remove();
  }
  if (robotGif) {
    robotGif.style.display = "none";
  }
}

function startWelcome() {
  if (welcomeCanceled) return;
  welcomeStarted = true;

  // Hide robot GIF as we transition to welcome message
  hideRobotGif();

  // Create a special welcome container at the bottom left
  const welcomeWrapper = document.createElement("div");
  welcomeWrapper.id = "welcome-wrapper";
  welcomeWrapper.style.position = "fixed";
  welcomeWrapper.style.bottom = "90px"; // Same position as GIF
  welcomeWrapper.style.left = "20px";
  welcomeWrapper.style.zIndex = "100";
  welcomeWrapper.style.maxWidth = "400px";
  
  // Create welcome message with avatar and typing dots
  const welcomeMsg = createBotMessage();
  const welcomeContent = welcomeMsg.querySelector('.bot-content');
  welcomeWrapper.appendChild(welcomeMsg);
  document.body.appendChild(welcomeWrapper);
  
  // Show typing dots initially
  addTypingDots(welcomeContent);

  // After 2 seconds, replace dots with actual welcome text
  setTimeout(() => {
    // Replace dots with empty text to start typing animation
    replaceDotsWithContent(welcomeContent, "");
    
    // Start typing animation
    const chars = [...WELCOME_MSG];
    let i = 0;
    const SPEED = 26; // ms per char
    welcomeTypingTimer = setInterval(() => {
      if (i < chars.length) {
        welcomeContent.textContent += chars[i++];
      } else {
        clearInterval(welcomeTypingTimer);
        welcomeTypingTimer = null;
        // Welcome message stays visible throughout the entire chat
      }
    }, SPEED);
  }, 2000);
}

function cancelWelcomeIfPending() {
  // Only cancel if welcome hasn't started yet
  if (!welcomeStarted) {
    if (welcomeTimeoutId) {
      clearTimeout(welcomeTimeoutId);
      welcomeTimeoutId = null;
    }
    welcomeCanceled = true;
    hideRobotGif();
  }
  // If welcome has started, let it continue and stay visible
}

// Start the flow once DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  // Show robot GIF immediately
  showRobotGif();
  
  // After 3 seconds, hide GIF and start welcome message
  welcomeTimeoutId = setTimeout(startWelcome, 3000);
});

// If the user starts typing before the welcome message appears, cancel it
inputEl.addEventListener("input", () => {
  syncSendDisabled();
  if (inputEl.textContent.trim() !== "" && !welcomeStarted) {
    cancelWelcomeIfPending();
  }
  // If welcome has started, it stays visible throughout the chat
});

// ---- Send message ----------------------------------------------------------
async function sendMessage() {
  const userText = inputEl.textContent.trim();
  if (!userText) return;

  // Cancel GIF/welcome only if it hasn't started displaying yet
  if (!welcomeStarted) {
    cancelWelcomeIfPending();
  }
  // If welcome has already started, it remains visible

  // Add user message
  const userMsg = document.createElement("div");
  userMsg.className = "message user";
  userMsg.textContent = userText;
  chatBox.appendChild(userMsg);

  // Clear input + keep UI tidy
  inputEl.textContent = "";
  syncSendDisabled();
  chatBox.scrollTop = chatBox.scrollHeight;

  // Create bot message with avatar and typing dots
  const botMsg = createBotMessage();
  const botContent = botMsg.querySelector('.bot-content');
  chatBox.appendChild(botMsg);
  
  // Show typing dots
  addTypingDots(botContent);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: userText })
    });

    const data = await res.json();
    const botText = data.response || "Sorry, I couldn't understand that.";

    // Replace typing dots with actual response
    replaceDotsWithContent(botContent, "");
    
    // Use showBotResponseSteps with the content div
    showBotResponseSteps(botText, botContent);
    
  } catch (err) {
    // Replace typing dots with error message
    replaceDotsWithContent(botContent, "Network error. Please try again.");
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