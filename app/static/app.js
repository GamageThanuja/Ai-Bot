import { showBotResponseSteps, stopGeneration } from "/static/botResponseAnimator.js";

const chatBox  = document.getElementById("chat-box");
const inputEl  = document.getElementById("user-input");
const sendBtn  = document.getElementById("send-btn");
const robotGif = document.getElementById("robot-gif");

// Global state for response generation
let isGenerating = false;
let currentStopButton = null;
let messageHistory = new Map(); // Store multiple responses for each user message

// --- Attachments (image only) ---
const fileInput = document.getElementById("file-input");
const attachBtn = document.getElementById("attach-btn");

if (attachBtn && fileInput) {
  attachBtn.addEventListener("click", (e) => {
    e.preventDefault();
    fileInput.click();
  });
}

// Optional: show selected filename as a small pill near the send button
function showSelectedFilePill() {
  const pillId = "file-pill";
  let pill = document.getElementById(pillId);
  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    const name = fileInput.files[0].name;
    if (!pill) {
      pill = document.createElement("span");
      pill.id = pillId;
      pill.style.marginLeft = "8px";
      pill.style.fontSize = "12px";
      pill.style.padding = "2px 8px";
      pill.style.border = "1px solid #d0d5dd";
      pill.style.borderRadius = "9999px";
      pill.style.background = "#fff";
      pill.style.color = "#111827";
      document.getElementById("input-container").insertBefore(pill, sendBtn);
    }
    pill.textContent = name;
  } else if (pill) {
    pill.remove();
  }
}

// Keep Send enabled if there's either text or a selected image
function hasImageSelected() {
  return !!(fileInput && fileInput.files && fileInput.files.length > 0);
}

// ---- Send button enable/disable -------------------------------------------
function syncSendDisabled() {
  const hasText = inputEl.textContent.trim() !== "";
  sendBtn.disabled = !(hasText || hasImageSelected());
}
syncSendDisabled();

if (fileInput) {
  fileInput.addEventListener("change", () => {
    showSelectedFilePill();
    syncSendDisabled();
  });
}

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
    dot.style.background = "#ffffffff";
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

// ---- Stop Generation Functions ----
function showStopButtonInInput() {
  // Hide the send button and show stop button
  sendBtn.style.display = "none";
  
  // Create stop button if it doesn't exist
  let stopBtn = document.getElementById("stop-input-btn");
  if (!stopBtn) {
    stopBtn = document.createElement("button");
    stopBtn.id = "stop-input-btn";
    stopBtn.className = "icon-btn";
    stopBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </svg>
    `;
    stopBtn.style.color = "#ff4757";
    stopBtn.title = "Stop generating";
    
    stopBtn.addEventListener("click", () => {
      stopGeneration();
      hideStopButtonInInput();
      isGenerating = false;
    });
    
    // Insert stop button after send button
    sendBtn.parentNode.insertBefore(stopBtn, sendBtn.nextSibling);
  }
  
  stopBtn.style.display = "inline-flex";
  currentStopButton = stopBtn;
}

function hideStopButtonInInput() {
  // Show the send button again
  sendBtn.style.display = "inline-flex";
  
  // Hide stop button
  const stopBtn = document.getElementById("stop-input-btn");
  if (stopBtn) {
    stopBtn.style.display = "none";
  }
  
  currentStopButton = null;
}

function removeStopButton() {
  hideStopButtonInInput();
}

// ---- Edit Message Functions ----
function createEditButton(userMsg, originalText, hasImage = false) {
  const editBtn = document.createElement("button");
  editBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  `;
  editBtn.className = "edit-btn";
  editBtn.title = "Edit message";
  
  editBtn.addEventListener("click", () => {
    editMessage(userMsg, originalText, hasImage);
  });
  
  userMsg.appendChild(editBtn);
  return editBtn;
}

function editMessage(userMsg, originalText, hasImage) {
  // Store reference to the message being edited
  const messageId = userMsg.dataset.messageId;
  
  // Show edit banner
  showEditBanner(originalText);
  
  // Set the input field with the original text
  inputEl.textContent = originalText;
  
  // Focus the input field and place cursor at the end
  inputEl.focus();
  
  // Place cursor at the end of the text
  const range = document.createRange();
  const selection = window.getSelection();
  range.selectNodeContents(inputEl);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  
  // Update send button state
  syncSendDisabled();
  
  // Store the editing context
  inputEl.dataset.editingMessageId = messageId;
  inputEl.dataset.isEditing = "true";
  
  // Scroll to input field
  inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---- Edit Banner Functions ----
function showEditBanner(originalText) {
  // Remove existing banner if any
  hideEditBanner();
  
  // Create edit banner
  const banner = document.createElement("div");
  banner.id = "edit-banner";
  banner.className = "edit-banner";
  
  banner.innerHTML = `
    <svg class="edit-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
    <span class="edit-banner-text">Edit</span>
    <span class="edit-banner-content">${originalText}</span>
    <button class="edit-banner-close" title="Cancel edit">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
  
  // Add close functionality
  const closeBtn = banner.querySelector(".edit-banner-close");
  closeBtn.addEventListener("click", cancelEdit);
  
  // Insert banner before the input container
  const inputContainer = document.getElementById("input-container");
  inputContainer.parentNode.insertBefore(banner, inputContainer);
  
  // Add class to input container for styling
  inputContainer.classList.add("input-container-editing");
}

function hideEditBanner() {
  const banner = document.getElementById("edit-banner");
  if (banner) {
    banner.remove();
  }
  
  // Remove editing class from input container
  const inputContainer = document.getElementById("input-container");
  inputContainer.classList.remove("input-container-editing");
}

function cancelEdit() {
  // Clear input field
  inputEl.textContent = "";
  
  // Clear editing flags
  delete inputEl.dataset.isEditing;
  delete inputEl.dataset.editingMessageId;
  
  // Hide banner
  hideEditBanner();
  
  // Update send button state
  syncSendDisabled();
}

async function resendMessage(originalUserMsg, newText, hasImage) {
  // Update the original user message text
  const textContent = originalUserMsg.childNodes[0];
  if (textContent && textContent.nodeType === Node.TEXT_NODE) {
    textContent.textContent = newText;
  }
  
  // Find and hide ALL elements that follow this user message until the next user message
  // This includes bot messages AND Next button containers
  let nextElement = originalUserMsg.nextElementSibling;
  let hiddenElements = [];
  
  while (nextElement) {
    if (nextElement.classList.contains("message") && nextElement.classList.contains("user")) {
      // Stop when we reach the next user message
      break;
    }
    
    // Hide bot messages and any other elements (like Next button containers)
    if (nextElement.classList.contains("message") && nextElement.classList.contains("bot")) {
      // Hide bot message
      nextElement.style.display = "none";
      hiddenElements.push(nextElement);
    } else if (nextElement.style && !nextElement.classList.contains("message")) {
      // Hide other elements like Next button containers
      nextElement.style.display = "none";
      hiddenElements.push(nextElement);
    }
    
    nextElement = nextElement.nextElementSibling;
  }
  
  // Create a new bot message for the new response
  const newBotMsg = createBotMessage();
  const botContent = newBotMsg.querySelector('.bot-content');
  
  // Insert the new bot message after the user message
  let insertAfter = originalUserMsg;
  if (hiddenElements.length > 0) {
    // Insert after the last hidden element
    insertAfter = hiddenElements[hiddenElements.length - 1];
  }
  insertAfter.parentNode.insertBefore(newBotMsg, insertAfter.nextSibling);
  
  // Show typing animation
  addTypingDots(botContent);
  chatBox.scrollTop = chatBox.scrollHeight;
  
  // Set generation state and show stop button in input
  isGenerating = true;
  showStopButtonInInput();
  
  try {
    // Send new request
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: newText })
    });
    const data = await res.json();
    
    const newBotText = data.response || "Sorry, I couldn't understand that.";
    
    // Show new response
    replaceDotsWithContent(botContent, "");
    showBotResponseSteps(newBotText, botContent, () => {
      removeStopButton();
      isGenerating = false;
    });
    
  } catch (err) {
    replaceDotsWithContent(botContent, "Network error. Please try again.");
    removeStopButton();
    isGenerating = false;
  }
  
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ---- Response Navigation Functions ----
function addResponseControls(botMsg, messageId) {
  const responses = messageHistory.get(messageId) || [];
  if (responses.length < 2) return;
  
  const controls = document.createElement("div");
  controls.className = "response-controls";
  
  const prevBtn = document.createElement("button");
  prevBtn.className = "response-nav-btn";
  prevBtn.innerHTML = "◀";
  prevBtn.title = "Previous response";
  
  const indicator = document.createElement("span");
  indicator.className = "response-indicator";
  
  const nextBtn = document.createElement("button");
  nextBtn.className = "response-nav-btn";
  nextBtn.innerHTML = "▶";
  nextBtn.title = "Next response";
  
  controls.appendChild(prevBtn);
  controls.appendChild(indicator);
  controls.appendChild(nextBtn);
  
  const botContent = botMsg.querySelector('.bot-content');
  botContent.appendChild(controls);
  
  let currentIndex = responses.length - 1; // Start with the latest response
  
  function updateResponse() {
    const response = responses[currentIndex];
    const contentWithoutControls = botContent.cloneNode(true);
    const controlsInClone = contentWithoutControls.querySelector('.response-controls');
    if (controlsInClone) controlsInClone.remove();
    
    botContent.innerHTML = '';
    botContent.textContent = response.content;
    botContent.appendChild(controls);
    
    indicator.textContent = `${currentIndex + 1}/${responses.length}`;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === responses.length - 1;
  }
  
  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateResponse();
    }
  });
  
  nextBtn.addEventListener("click", () => {
    if (currentIndex < responses.length - 1) {
      currentIndex++;
      updateResponse();
    }
  });
  
  updateResponse();
}

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

  // Create welcome message in the chat-box instead of fixed position
  const welcomeMsg = createBotMessage();
  const welcomeContent = welcomeMsg.querySelector('.bot-content');
  chatBox.appendChild(welcomeMsg);
  
  // Show typing dots initially
  addTypingDots(welcomeContent);
  chatBox.scrollTop = chatBox.scrollHeight;

  // After 2 seconds, replace dots with actual welcome text
  setTimeout(() => {
    // Replace dots with empty text to start typing animation
    replaceDotsWithContent(welcomeContent, "");
    
    // Start character-by-character typing animation (same speed as bot responses)
    const chars = [...WELCOME_MSG];
    let i = 0;
    const SPEED = 5; // ms per char (same as bot responses)
    welcomeTypingTimer = setInterval(() => {
      if (i < chars.length) {
        welcomeContent.textContent += chars[i++];
        chatBox.scrollTop = chatBox.scrollHeight;
      } else {
        clearInterval(welcomeTypingTimer);
        welcomeTypingTimer = null;
        chatBox.scrollTop = chatBox.scrollHeight;
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

function addImagePreview(container, file) {
  const url = URL.createObjectURL(file);
  const img = document.createElement("img");
  img.src = url;
  img.alt = file.name || "attachment";
  img.style.display = "block";
  img.style.maxWidth = "280px";
  img.style.maxHeight = "220px";
  img.style.borderRadius = "10px";
  img.style.marginTop = "8px";
  img.onload = () => URL.revokeObjectURL(url);
  container.appendChild(img);
}

// Start the flow once DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  // Show robot GIF immediately
  showRobotGif();
  
  // After 3 seconds, hide GIF and start welcome message
  welcomeTimeoutId = setTimeout(startWelcome, 3000);
});

// If the user starts typing before the welcome message appears, cancel it
// But allow typing during generation - don't cancel anything during generation
inputEl.addEventListener("input", () => {
  syncSendDisabled();
  if (inputEl.textContent.trim() !== "" && !welcomeStarted && !isGenerating) {
    cancelWelcomeIfPending();
  }
  // Input remains enabled even during generation
});

// ---- Send message ----------------------------------------------------------
async function sendMessage() {
  const userText = inputEl.textContent.trim();
  const hasImage = hasImageSelected();
  if (!userText && !hasImage) return;

  if (!welcomeStarted) {
    cancelWelcomeIfPending();
  }

  // Check if we're editing an existing message
  const isEditing = inputEl.dataset.isEditing === "true";
  const editingMessageId = inputEl.dataset.editingMessageId;
  
  if (isEditing && editingMessageId) {
    // Find the original user message
    const originalUserMsg = document.querySelector(`[data-message-id="${editingMessageId}"]`);
    if (originalUserMsg) {
      // Clear editing flags and hide banner
      delete inputEl.dataset.isEditing;
      delete inputEl.dataset.editingMessageId;
      hideEditBanner();
      
      // Clear input
      inputEl.textContent = "";
      syncSendDisabled();
      
      // Resend with new text
      await resendMessage(originalUserMsg, userText, hasImage);
      return;
    }
  }

  // Normal new message flow
  const userMsg = document.createElement("div");
  userMsg.className = "message user";
  userMsg.textContent = userText || (hasImage ? "(image)" : "");
  
  // Add edit button to user message
  createEditButton(userMsg, userText, hasImage);
  
  chatBox.appendChild(userMsg);

  // Show a small preview if an image is attached
  if (hasImage) {
    addImagePreview(userMsg, fileInput.files[0]);
  }

  // Clear input text and update state
  inputEl.textContent = "";
  syncSendDisabled();
  chatBox.scrollTop = chatBox.scrollHeight;

  // Create bot message with typing dots
  const botMsg = createBotMessage();
  const botContent = botMsg.querySelector('.bot-content');
  chatBox.appendChild(botMsg);
  addTypingDots(botContent);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Set generation state and show stop button in input
  isGenerating = true;
  showStopButtonInInput();

  try {
    let data;
    if (hasImage) {
      const form = new FormData();
      form.append("image", fileInput.files[0]);
      form.append("query", userText);
      const res = await fetch("/chat-image", { method: "POST", body: form });
      data = await res.json();
    } else {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userText })
      });
      data = await res.json();
    }

    const botText = data.response || "Sorry, I couldn't understand that.";
    replaceDotsWithContent(botContent, "");
    
    // Create message ID for tracking responses
    const messageId = Date.now().toString();
    userMsg.dataset.messageId = messageId;
    botMsg.dataset.messageId = messageId;
    
    // Initialize message history
    messageHistory.set(messageId, [{
      content: botText,
      timestamp: Date.now()
    }]);
    
    // Start response animation
    showBotResponseSteps(botText, botContent, () => {
      // Callback when animation completes
      removeStopButton();
      isGenerating = false;
    });
  } catch (err) {
    replaceDotsWithContent(botContent, "Network error. Please try again.");
    removeStopButton();
    isGenerating = false;
  } finally {
    // Reset file input and pill if we sent an image
    if (hasImage) {
      fileInput.value = "";
      showSelectedFilePill();
    }
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