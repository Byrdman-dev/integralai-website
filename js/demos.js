// =========================================================================
// Shared chat helpers
// =========================================================================
function scrollToBottom(container){
  container.scrollTop = container.scrollHeight;
}

function appendMessage(container, { from, html, avatar }){
  const msg = document.createElement('div');
  msg.className = `chat-msg ${from}`;
  msg.innerHTML = `
    <div class="chat-avatar">${avatar}</div>
    <div class="chat-bubble">${html}</div>
  `;
  container.appendChild(msg);
  scrollToBottom(container);
  return msg;
}

function appendTyping(container, avatar){
  const msg = document.createElement('div');
  msg.className = 'chat-msg bot typing-msg';
  msg.innerHTML = `
    <div class="chat-avatar">${avatar}</div>
    <div class="chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>
  `;
  container.appendChild(msg);
  scrollToBottom(container);
  return msg;
}

function wait(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

// =========================================================================
// RAG Knowledge Assistant demo
// =========================================================================
(function initRagDemo(){
  const chatWindow = document.getElementById('ragChat');
  const form = document.getElementById('ragForm');
  const input = document.getElementById('ragInput');
  const suggestions = document.getElementById('ragSuggestions');

  const knowledgeBase = [
    {
      keywords: ['service', 'offer', 'do you do', 'help with'],
      answer: 'IntegralAI offers six core services: AI workflow automation, RAG knowledge assistants, AI customer service &amp; voice receptionists, intelligent document processing, custom AI applications, and business system integrations.',
      source: 'Services'
    },
    {
      keywords: ['start', 'begin', 'process', 'first step', 'kick off'],
      answer: 'Every project starts with a free strategy and discovery conversation where we learn your workflows and challenges before proposing any solution.',
      source: 'Process — Step 1'
    },
    {
      keywords: ['small business', 'medium', 'sme', 'size of business', 'small and medium'],
      answer: "Yes — IntegralAI is built specifically for small and medium-sized businesses. We tailor every solution instead of selling one-size-fits-all AI products.",
      source: 'About'
    },
    {
      keywords: ['what is rag', 'rag assistant', 'retrieval', 'what does rag mean', 'rag stand for'],
      answer: 'RAG stands for Retrieval-Augmented Generation — an AI pattern where a system retrieves relevant information from your own documents, then uses that context to generate accurate, grounded answers instead of relying on a general model’s memory alone. This chat is a simplified example of that pattern.',
      source: 'RAG Knowledge Assistants'
    },
    {
      keywords: ['price', 'cost', 'pricing', 'how much', 'budget'],
      answer: 'Pricing depends on the scope of the engagement, from a single automation to a full custom application. Book a free consultation and we’ll scope it together.',
      source: 'Contact'
    },
    {
      keywords: ['receptionist', 'voice', 'phone', 'call', 'customer service'],
      answer: 'Our AI voice receptionists answer calls, handle FAQs and routine requests 24/7, and route anything that needs a human straight to your team.',
      source: 'AI Customer Service'
    },
    {
      keywords: ['document', 'invoice', 'paperwork', 'form', 'contract', 'extraction'],
      answer: 'Intelligent document processing extracts, classifies, and routes information from invoices, forms, and contracts automatically, cutting manual review down to just the exceptions that need it.',
      source: 'Document Processing'
    },
    {
      keywords: ['integrat', 'existing software', 'crm', 'current tools', 'connect'],
      answer: 'We integrate directly with the tools you already use — CRMs, scheduling software, help desks, ERPs, and custom internal systems — instead of asking you to replace them.',
      source: 'Business System Integrations'
    },
    {
      keywords: ['support', 'after launch', 'maintenance', 'ongoing'],
      answer: 'Support doesn’t stop at deployment. We monitor, refine, and support every solution after launch as your needs evolve.',
      source: 'Process — Step 5'
    },
    {
      keywords: ['contact', 'reach', 'email', 'get in touch'],
      answer: 'You can reach IntegralAI directly at davis.nettech@gmail.com or through the contact form on this site.',
      source: 'Contact'
    }
  ];

  function findAnswer(question){
    const q = question.toLowerCase();
    let best = null;
    let bestScore = 0;

    knowledgeBase.forEach(entry => {
      let score = 0;
      entry.keywords.forEach(k => { if (q.includes(k)) score += k.split(' ').length; });
      if (score > bestScore){ bestScore = score; best = entry; }
    });

    if (best) return best;
    return {
      answer: "I don't have that in this demo's small FAQ knowledge base — but a real RAG assistant built for your business would search your full documentation and give you a grounded answer with sources, not a guess.",
      source: 'No match found'
    };
  }

  async function handleQuestion(question){
    appendMessage(chatWindow, { from: 'user', avatar: 'You', html: escapeHtml(question) });

    suggestions.querySelectorAll('.chip').forEach(c => c.disabled = true);
    const typingEl = appendTyping(chatWindow, 'AI');
    await wait(650 + Math.random() * 500);
    typingEl.remove();

    const { answer, source } = findAnswer(question);
    appendMessage(chatWindow, {
      from: 'bot',
      avatar: 'AI',
      html: `${answer}<span class="source-chip">Source: ${source}</span>`
    });
    suggestions.querySelectorAll('.chip').forEach(c => c.disabled = false);
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    input.value = '';
    handleQuestion(value);
  });

  suggestions.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => handleQuestion(chip.dataset.q));
  });
})();

// =========================================================================
// AI Voice Receptionist demo
// =========================================================================
(function initReceptionistDemo(){
  const chatWindow = document.getElementById('receptionistChat');
  const optionsWrap = document.getElementById('receptionistOptions');
  const startBtn = document.getElementById('startCallBtn');
  const endBtn = document.getElementById('endCallBtn');
  const speechToggle = document.getElementById('speechToggle');
  const callDot = document.getElementById('callDot');
  const callStatusText = document.getElementById('callStatusText');

  const supportsSpeech = 'speechSynthesis' in window;
  let voiceOn = supportsSpeech;
  let awaitingFreeText = false;
  let freeTextResolver = null;

  if (!supportsSpeech){
    speechToggle.disabled = true;
    speechToggle.textContent = '🔇 Voice unsupported';
    speechToggle.setAttribute('aria-pressed', 'false');
  }

  speechToggle.addEventListener('click', () => {
    voiceOn = !voiceOn;
    speechToggle.setAttribute('aria-pressed', String(voiceOn));
    speechToggle.textContent = voiceOn ? '🔊 Voice on' : '🔇 Voice off';
    if (!voiceOn) window.speechSynthesis.cancel();
  });

  function speak(text){
    if (!supportsSpeech || !voiceOn) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/&\w+;/g, ' '));
    utterance.rate = 1.02;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  async function botSay(html, { spoken } = {}){
    const typingEl = appendTyping(chatWindow, '☎️');
    await wait(500 + Math.random() * 400);
    typingEl.remove();
    appendMessage(chatWindow, { from: 'bot', avatar: '☎️', html });
    speak(spoken || html.replace(/<[^>]+>/g, ''));
  }

  function userSay(text){
    appendMessage(chatWindow, { from: 'user', avatar: 'You', html: escapeHtml(text) });
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function setOptions(options){
    optionsWrap.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        userSay(opt.label);
        setOptions([]);
        opt.action();
      });
      optionsWrap.appendChild(btn);
    });
  }

  function mainMenu(promptText){
    botSay(promptText).then(() => {
      setOptions([
        { label: 'Book a consultation', action: bookingFlow },
        { label: 'Business hours', action: businessHours },
        { label: 'What services do you offer?', action: servicesInfo },
        { label: 'Leave a message', action: leaveMessage },
      ]);
    });
  }

  function afterAnswer(){
    setOptions([
      { label: 'Back to menu', action: () => mainMenu('Sure — what else can I help with?') },
      { label: "No, that's all", action: endInteraction },
    ]);
  }

  function businessHours(){
    botSay('IntegralAI’s team is reachable Monday through Friday, 9am–5pm Eastern. This AI receptionist, though, is available 24/7 to take your call.')
      .then(afterAnswer);
  }

  function servicesInfo(){
    botSay('We offer AI workflow automation, RAG knowledge assistants, AI customer service &amp; voice receptionists, intelligent document processing, custom AI applications, and business system integrations.')
      .then(afterAnswer);
  }

  function bookingFlow(){
    botSay('I’d be happy to help schedule a free consultation. What day works best for you?').then(() => {
      setOptions(['Monday','Tuesday','Wednesday','Thursday','Friday'].map(day => ({
        label: day,
        action: () => bookingTime(day)
      })));
    });
  }

  function bookingTime(day){
    botSay(`Great, ${day} works. Do you prefer a morning or afternoon time?`).then(() => {
      setOptions([
        { label: 'Morning', action: () => bookingConfirm(day, 'morning') },
        { label: 'Afternoon', action: () => bookingConfirm(day, 'afternoon') },
      ]);
    });
  }

  function bookingConfirm(day, time){
    botSay(`You're all set — I've noted a preference for ${day} ${time}. Someone from IntegralAI will call to confirm the exact time. Anything else I can help with?`)
      .then(afterAnswer);
  }

  function leaveMessage(){
    botSay('Go ahead — type your message below and I’ll make sure the team gets it.').then(() => {
      awaitingFreeText = true;
    });
  }

  function endInteraction(){
    botSay('Thanks for calling IntegralAI — have a great day!').then(() => {
      setTimeout(endCall, 900);
    });
  }

  function startCall(){
    chatWindow.innerHTML = '';
    optionsWrap.innerHTML = '';
    awaitingFreeText = false;
    startBtn.disabled = true;
    endBtn.disabled = false;
    callDot.classList.add('live');
    callStatusText.textContent = 'Connected — IntegralAI Reception';
    mainMenu('Thank you for calling IntegralAI, this is your AI receptionist. How can I help you today?');
  }

  function endCall(){
    window.speechSynthesis && window.speechSynthesis.cancel();
    optionsWrap.innerHTML = '';
    awaitingFreeText = false;
    startBtn.disabled = false;
    endBtn.disabled = true;
    callDot.classList.remove('live');
    callStatusText.textContent = 'Not connected';
    appendMessage(chatWindow, { from: 'bot', avatar: '☎️', html: 'Call ended. Press "Start Call" to try again.' });
  }

  startBtn.addEventListener('click', startCall);
  endBtn.addEventListener('click', endCall);

  // Free-text input reuses the RAG demo's input pattern via a lightweight inline form
  const freeTextForm = document.createElement('form');
  freeTextForm.className = 'chat-input-row';
  freeTextForm.style.display = 'none';
  freeTextForm.innerHTML = `
    <label class="sr-only" for="receptionistInput">Type your message</label>
    <input type="text" id="receptionistInput" placeholder="Type your message…" autocomplete="off">
    <button type="submit" class="btn btn-primary btn-sm">Send</button>
  `;
  optionsWrap.insertAdjacentElement('afterend', freeTextForm);
  const freeTextInput = freeTextForm.querySelector('input');

  function toggleFreeTextVisibility(){
    freeTextForm.style.display = awaitingFreeText ? 'flex' : 'none';
  }

  const originalLeaveMessage = leaveMessage;
  // Wrap leaveMessage to also reveal the free-text input
  window.setInterval(toggleFreeTextVisibility, 200);

  freeTextForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = freeTextInput.value.trim();
    if (!value || !awaitingFreeText) return;
    freeTextInput.value = '';
    userSay(value);
    awaitingFreeText = false;
    botSay('Got it — I’ve logged your message for the team. Anything else I can help with?').then(afterAnswer);
  });
})();
