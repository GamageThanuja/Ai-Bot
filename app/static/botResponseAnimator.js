// botResponseAnimator.js
// Reveals bot response with character-by-character typing animation like ChatGPT

export function showBotResponseSteps(botText, contentDiv, charDelay = 25) {
  // Group each step and its details into a single chunk
  // Regex matches: Step X - ... or Step X – ...
  const stepRegex = /(?:Step\s*\d+\s*[–-].*?(?=Step\s*\d+\s*[–-]|$))/gs;
  let steps = [];
  let match;
  while ((match = stepRegex.exec(botText)) !== null) {
    steps.push(match[0].trim());
  }
  // If no matches, fallback to splitting by numbered pattern
  if (steps.length === 0) {
    steps = botText.split(/\n\s*\d+\.\s/).map(s => s.trim()).filter(Boolean);
  }
  
  // If still no steps, treat entire text as one step
  if (steps.length === 0) {
    steps = [botText];
  }

  let currentStep = 0;

  function createNewBotMessage() {
    // Get the chat box and create a new bot message bubble
    const chatBox = contentDiv.parentElement.parentElement;
    
    // Create new bot message structure
    const botMsg = document.createElement("div");
    botMsg.className = "message bot";
    botMsg.style.display = "flex";
    botMsg.style.alignItems = "flex-start";
    botMsg.style.gap = "8px";
    botMsg.style.background = "transparent";
    botMsg.style.padding = "0";
    botMsg.style.marginTop = "12px";
    
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
    
    // Create content container
    const newContentDiv = document.createElement("div");
    newContentDiv.className = "bot-content";
    newContentDiv.style.background = "#e4e6eb";
    newContentDiv.style.color = "#333";
    newContentDiv.style.padding = "12px 16px";
    newContentDiv.style.borderRadius = "12px";
    newContentDiv.style.borderBottomLeftRadius = "0";
    newContentDiv.style.lineHeight = "1.5";
    newContentDiv.style.whiteSpace = "pre-wrap";
    newContentDiv.style.maxWidth = "100%";
    
    // Append avatar and content
    botMsg.appendChild(avatar);
    botMsg.appendChild(newContentDiv);
    
    // Append to chat box
    chatBox.appendChild(botMsg);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    return newContentDiv;
  }

  function typeText(text, targetDiv, callback) {
    // Clear the content div
    targetDiv.innerHTML = '';
    targetDiv.style.display = "block";
    
    const chars = [...text]; // Handle unicode characters properly
    let i = 0;
    
    function typeNextChar() {
      if (i < chars.length) {
        targetDiv.textContent += chars[i];
        i++;
        
        // Auto-scroll during typing
        const chatBox = targetDiv.parentElement.parentElement.parentElement;
        chatBox.scrollTop = chatBox.scrollHeight;
        
        setTimeout(typeNextChar, charDelay);
      } else {
        // Typing complete, call callback after a brief pause
        setTimeout(() => {
          if (callback) callback();
        }, 200);
      }
    }
    
    typeNextChar();
  }

  function showStep(stepText, targetContentDiv) {
    typeText(stepText, targetContentDiv, () => {
      // After this step is complete, show next step if available
      currentStep++;
      if (currentStep < steps.length) {
        // Create new bubble for next step
        const newContentDiv = createNewBotMessage();
        showStep(steps[currentStep], newContentDiv);
      }
    });
  }

  // Start with the first step using the provided contentDiv
  showStep(steps[currentStep], contentDiv);
}