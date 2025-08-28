// botResponseAnimator.js
// Reveals bot response line by line in the chat box

export function showBotResponseLineByLine(botText, chatBox, messageClass = "message bot", delay = 500) {
  const lines = botText.split("\n");
  let currentLine = 0;

  function revealNextLine() {
    if (currentLine < lines.length) {
      const botMsg = document.createElement("div");
      botMsg.className = messageClass;
      botMsg.textContent = lines[currentLine];
      chatBox.appendChild(botMsg);
      chatBox.scrollTop = chatBox.scrollHeight;
      currentLine++;
      setTimeout(revealNextLine, delay);
    }
  }

  revealNextLine();
}
