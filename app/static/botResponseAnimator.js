// botResponseAnimator.js
// Reveals bot response line by line in the chat box

export function showBotResponseSteps(botText, chatBox, messageClass = "message bot", delay = 1200) {
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

  let currentStep = 0;
  let botMsg = null;
  let nextBtn = null;

  function showStep(stepText) {
    botMsg = document.createElement("div");
    botMsg.className = messageClass;
    botMsg.style.background = "#e4e6eb";
    botMsg.style.borderRadius = "12px";
    botMsg.style.padding = "12px 16px";
    botMsg.style.marginBottom = "8px";
    botMsg.style.maxWidth = "400px";
    chatBox.appendChild(botMsg);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Format lines with bullet points if they start with '-'
    const lines = stepText.split("\n");
    let currentLine = 0;
    let ul = null;

    function revealNextLine() {
      if (currentLine < lines.length) {
        const line = lines[currentLine];
        if (line.trim().startsWith("-")) {
          if (!ul) {
            ul = document.createElement("ul");
            ul.style.margin = "8px 0 0 18px";
            ul.style.padding = "0";
            ul.style.listStyleType = "disc";
            botMsg.appendChild(ul);
          }
          const li = document.createElement("li");
          li.textContent = line.replace(/^\s*-\s*/, "");
          li.style.marginBottom = "4px";
          ul.appendChild(li);
        } else {
          const p = document.createElement("p");
          p.textContent = line;
          p.style.margin = "0 0 4px 0";
          botMsg.appendChild(p);
        }
        chatBox.scrollTop = chatBox.scrollHeight;
        currentLine++;
        setTimeout(revealNextLine, delay);
      } else {
        // Show Next button if more steps remain
        if (currentStep < steps.length - 1) {
          nextBtn = document.createElement("button");
          nextBtn.textContent = "Next";
          nextBtn.style.marginTop = "6px";
          nextBtn.style.display = "block";
          nextBtn.style.background = "#1a73e8";
          nextBtn.style.color = "#fff";
          nextBtn.style.border = "none";
          nextBtn.style.borderRadius = "6px";
          nextBtn.style.fontSize = "13px";
          nextBtn.style.padding = "4px 14px";
          nextBtn.style.cursor = "pointer";
          nextBtn.style.width = "fit-content";
          nextBtn.style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)";
          botMsg.insertAdjacentElement("afterend", nextBtn);
          nextBtn.onclick = () => {
            nextBtn.remove();
            currentStep++;
            showStep(steps[currentStep]);
          };
          chatBox.scrollTop = chatBox.scrollHeight;
        }
      }
    }
    revealNextLine();
  }

  showStep(steps[currentStep]);
}
