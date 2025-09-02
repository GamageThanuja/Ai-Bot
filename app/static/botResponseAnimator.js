// botResponseAnimator.js
// Reveals bot response with character-by-character typing animation like ChatGPT

export function showBotResponseSteps(botText, contentDiv, charDelay = 5) {
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

  // Group steps into chunks of 3
  const stepGroups = [];
  for (let i = 0; i < steps.length; i += 3) {
    stepGroups.push(steps.slice(i, i + 3));
  }

  let currentGroupIndex = 0;

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

  function showStepGroup(stepGroup, isFirstGroup = false) {
    let stepIndex = 0;
    
    function showNextStepInGroup() {
      if (stepIndex < stepGroup.length) {
        const stepText = stepGroup[stepIndex];
        const targetDiv = isFirstGroup && stepIndex === 0 ? contentDiv : createNewBotMessage();
        
        typeText(stepText, targetDiv, () => {
          stepIndex++;
          if (stepIndex < stepGroup.length) {
            // More steps in this group, show next step after short delay
            setTimeout(showNextStepInGroup, 50);
          } else {
            // Group completed, check if there are more groups
            if (currentGroupIndex < stepGroups.length - 1) {
              // More groups available, show Next button
              showNextButton(targetDiv);
            }
          }
        });
      }
    }
    
    showNextStepInGroup();
  }

  function showNextButton(lastContentDiv) {
    // Create a container for the Next button positioned below the bot message
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.alignItems = "flex-start";
    buttonContainer.style.gap = "8px";
    buttonContainer.style.marginTop = "8px";
    buttonContainer.style.marginBottom = "8px";
    buttonContainer.style.alignSelf = "flex-start";
    buttonContainer.style.maxWidth = "75%";
    
    // Create a spacer div to mimic the avatar space
    const avatarSpacer = document.createElement("div");
    avatarSpacer.style.width = "29px";
    avatarSpacer.style.height = "1px";
    avatarSpacer.style.flexShrink = "0";
    
    // Create button wrapper
    const buttonWrapper = document.createElement("div");
    buttonWrapper.style.display = "flex";
    buttonWrapper.style.justifyContent = "flex-end";
    buttonWrapper.style.width = "100%";
    
    const nextButton = document.createElement("button");
    nextButton.textContent = "Next";
    nextButton.style.background = "#007bff";
    nextButton.style.color = "white";
    nextButton.style.border = "none";
    nextButton.style.padding = "4px 10px";
    nextButton.style.borderRadius = "4px";
    nextButton.style.cursor = "pointer";
    nextButton.style.fontSize = "11px";
    nextButton.style.fontWeight = "500";
    nextButton.style.transition = "background-color 0.2s";
    nextButton.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
    
    nextButton.onmouseover = () => {
      nextButton.style.background = "#0056b3";
    };
    nextButton.onmouseout = () => {
      nextButton.style.background = "#007bff";
    };
    
    nextButton.onclick = () => {
      // Remove the button container
      buttonContainer.remove();
      
      // Move to next group
      currentGroupIndex++;
      showStepGroup(stepGroups[currentGroupIndex]);
    };
    
    buttonWrapper.appendChild(nextButton);
    buttonContainer.appendChild(avatarSpacer);
    buttonContainer.appendChild(buttonWrapper);
    
    // Get the chat box and insert the button container
    const chatBox = lastContentDiv.parentElement.parentElement;
    chatBox.appendChild(buttonContainer);
    
    // Scroll to show the button
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // Start showing the first group of steps
  showStepGroup(stepGroups[currentGroupIndex], true);
}