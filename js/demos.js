// =========================================================================
// Shared chat helpers
// =========================================================================
const ICON_VOLUME_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
const ICON_VOLUME_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
const ICON_PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

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

  const TRANSFORMERS_CDN_URL = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
  const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
  const EMBEDDINGS_URL = 'js/data/rag-embeddings.json';

  // Created lazily on first use and reused for the rest of the session —
  // not initialized on page load. transformers.js caches the model weights
  // themselves via the browser Cache API by default; we don't touch that.
  let embedderPromise = null;
  function getEmbedder(){
    if (!embedderPromise){
      embedderPromise = import(TRANSFORMERS_CDN_URL)
        .then(({ pipeline }) => pipeline('feature-extraction', EMBEDDING_MODEL));
    }
    return embedderPromise;
  }

  let knowledgeBasePromise = null;
  function getKnowledgeBase(){
    if (!knowledgeBasePromise){
      knowledgeBasePromise = fetch(EMBEDDINGS_URL).then(res => res.json());
    }
    return knowledgeBasePromise;
  }

  // cosineSimilarity/findBestMatch/matchQuestion/SIMILARITY_THRESHOLD come
  // from js/rag-match.js (loaded before this script), which keeps the pure
  // matching logic unit-testable without loading the actual model.
  async function findAnswer(question){
    const embedder = await getEmbedder();
    const [output, knowledgeBase] = await Promise.all([
      embedder(question, { pooling: 'mean', normalize: true }),
      getKnowledgeBase()
    ]);
    const queryEmbedding = Array.from(output.data);
    return matchQuestion(queryEmbedding, knowledgeBase);
  }

  async function handleQuestion(question){
    appendMessage(chatWindow, { from: 'user', avatar: 'You', html: escapeHtml(question) });
    suggestions.querySelectorAll('.chip').forEach(c => c.disabled = true);

    const isFirstLoad = !embedderPromise;
    const statusEl = appendTyping(chatWindow, 'AI');
    if (isFirstLoad){
      statusEl.querySelector('.chat-bubble').innerHTML = 'Loading the on-device matching model (first question only)…';
    }

    const { answer, source } = await findAnswer(question);

    if (!isFirstLoad) await wait(300 + Math.random() * 300);
    statusEl.remove();

    appendMessage(chatWindow, {
      from: 'bot',
      avatar: 'AI',
      html: source ? `${answer}<span class="source-chip">Source: ${source}</span>` : answer
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
    speechToggle.innerHTML = `${ICON_VOLUME_OFF} Voice unsupported`;
    speechToggle.setAttribute('aria-pressed', 'false');
  }

  speechToggle.addEventListener('click', () => {
    voiceOn = !voiceOn;
    speechToggle.setAttribute('aria-pressed', String(voiceOn));
    speechToggle.innerHTML = voiceOn ? `${ICON_VOLUME_ON} Voice on` : `${ICON_VOLUME_OFF} Voice off`;
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
    const typingEl = appendTyping(chatWindow, ICON_PHONE);
    await wait(500 + Math.random() * 400);
    typingEl.remove();
    appendMessage(chatWindow, { from: 'bot', avatar: ICON_PHONE, html });
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
    appendMessage(chatWindow, { from: 'bot', avatar: ICON_PHONE, html: 'Call ended. Press "Start Call" to try again.' });
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
