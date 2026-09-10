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

  const EMBEDDINGS_URL = 'js/data/rag-embeddings.json';

  let knowledgeBasePromise = null;
  function getKnowledgeBase(){
    if (!knowledgeBasePromise){
      knowledgeBasePromise = fetch(EMBEDDINGS_URL).then(res => res.json());
    }
    return knowledgeBasePromise;
  }

  // getEmbedder/isEmbedderLoaded/embedText come from js/embedder.js (shared
  // with the receptionist widget so the model only loads once no matter
  // which widget is opened first). cosineSimilarity/findBestMatch/
  // matchQuestion/SIMILARITY_THRESHOLD come from js/rag-match.js, which
  // keeps the pure matching logic unit-testable without loading the model.
  async function findAnswer(question){
    const [queryEmbedding, knowledgeBase] = await Promise.all([
      embedText(question),
      getKnowledgeBase()
    ]);
    return matchQuestion(queryEmbedding, knowledgeBase);
  }

  async function handleQuestion(question){
    appendMessage(chatWindow, { from: 'user', avatar: 'You', html: escapeHtml(question) });
    suggestions.querySelectorAll('.chip').forEach(c => c.disabled = true);

    const isFirstLoad = !isEmbedderLoaded();
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
  let callConnected = false;

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

  // Tuned by ear against the browser's default voice — adjust here if a
  // different voice ends up sounding better at different values.
  const SPEECH_RATE = 0.97;
  const SPEECH_PITCH = 1.03;
  const SENTENCE_PAUSE_MS = 180;

  let selectedVoice = null;

  function isNaturalVoice(voice){
    return !!voice && /natural|neural/i.test(voice.name);
  }

  function pickBestVoice(voices){
    if (!voices.length) return null;
    const englishVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
    const pool = englishVoices.length ? englishVoices : voices;

    // Best available: any "Natural"/"Neural" voice, e.g. Edge's Online
    // Natural voices. These sound far more natural than classic TTS voices,
    // but the genuinely good-sounding ones are almost always cloud-delivered,
    // not on-device — picking one here means an actual network call happens
    // when the receptionist speaks (the caller-matching/embedding pipeline
    // stays fully local either way; only audio synthesis leaves the device).
    const natural = pool.find(isNaturalVoice);
    if (natural) return natural;

    // Next best: any local (on-device) voice that isn't the plain default.
    const nonDefaultLocal = pool.find(v => v.localService && !v.default);
    if (nonDefaultLocal) return nonDefaultLocal;

    // Fall back to whatever the browser defaults to.
    return pool.find(v => v.default) || pool[0] || null;
  }

  function refreshVoice(){
    if (!supportsSpeech) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) selectedVoice = pickBestVoice(voices);
  }

  if (supportsSpeech){
    refreshVoice();
    // getVoices() is often empty until this fires — a well-known Web
    // Speech API quirk (especially in Chrome), so we can't rely on the
    // synchronous call above alone.
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoice);
  }

  // Splits on sentence-ending punctuation followed by whitespace/end of
  // string, so long answers speak as separate utterances with a natural
  // pause between them instead of one flat run-on line.
  function splitIntoSentences(text){
    const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g);
    if (sentences && sentences.length) return sentences.map(s => s.trim()).filter(Boolean);
    const trimmed = text.trim();
    return trimmed ? [trimmed] : [];
  }

  function speakSentences(sentences, index){
    if (index >= sentences.length) return;
    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    if (selectedVoice) utterance.voice = selectedVoice;
    // Natural/Neural voices already have well-tuned prosody — forcing our
    // rate/pitch tweak onto them tends to make them sound worse, not better,
    // so only apply it to the classic, flatter-sounding voices that need it.
    const useTunedProsody = !isNaturalVoice(selectedVoice);
    utterance.rate = useTunedProsody ? SPEECH_RATE : 1.0;
    utterance.pitch = useTunedProsody ? SPEECH_PITCH : 1.0;
    utterance.onend = () => {
      setTimeout(() => speakSentences(sentences, index + 1), SENTENCE_PAUSE_MS);
    };
    // Interrupting speak() calls cancel() first, which fires an error (not
    // end) on the in-flight utterance in most browsers — swallow it so the
    // chain simply stops instead of continuing to speak after being cut off.
    utterance.onerror = () => {};
    // Chrome/Edge have a long-standing speechSynthesis bug where the first
    // word or two of an utterance gets silently clipped. Pausing and
    // resuming right as playback actually begins forces the engine to
    // restart cleanly instead of dropping the opening words.
    utterance.onstart = () => {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    };
    window.speechSynthesis.speak(utterance);
  }

  function speak(text){
    if (!supportsSpeech || !voiceOn) return;
    window.speechSynthesis.cancel();
    const sentences = splitIntoSentences(text.replace(/&\w+;/g, ' '));
    // cancel() is asynchronous internally even though the call returns
    // immediately — calling speak() again in the same tick races with that
    // cleanup and is a common cause of the next utterance's opening words
    // getting dropped. A short delay lets it settle first.
    setTimeout(() => speakSentences(sentences, 0), 120);
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

  const RECEPTIONIST_EMBEDDINGS_URL = 'js/data/receptionist-embeddings.json';
  let receptionistKnowledgeBasePromise = null;
  function getReceptionistKnowledgeBase(){
    if (!receptionistKnowledgeBasePromise){
      receptionistKnowledgeBasePromise = fetch(RECEPTIONIST_EMBEDDINGS_URL).then(res => res.json());
    }
    return receptionistKnowledgeBasePromise;
  }

  // Topics whose matched question should drive the existing call flow
  // instead of just being spoken as static text.
  const TOPIC_ACTIONS = {
    'Booking': bookingFlow,
    'Business Hours': businessHours,
    'Leave a Message': leaveMessage
  };

  // getEmbedder/isEmbedderLoaded/embedText come from js/embedder.js, shared
  // with the RAG widget so the model only downloads once regardless of
  // which widget is opened first. cosineSimilarity/findBestMatch/
  // matchQuestion/SIMILARITY_THRESHOLD/OUT_OF_SCOPE_ANSWER come from
  // js/rag-match.js — same threshold and out-of-scope behavior as the RAG
  // assistant.
  async function handleCallerQuestion(question){
    let loadingEl = null;
    if (!isEmbedderLoaded()){
      loadingEl = appendTyping(chatWindow, ICON_PHONE);
      loadingEl.querySelector('.chat-bubble').innerHTML = 'Loading the on-device matching model (first question only)…';
    }

    const [queryEmbedding, knowledgeBase] = await Promise.all([
      embedText(question),
      getReceptionistKnowledgeBase()
    ]);
    const { answer, source } = matchQuestion(queryEmbedding, knowledgeBase);

    if (loadingEl) loadingEl.remove();

    const action = TOPIC_ACTIONS[source];
    if (action){
      setOptions([]);
      action();
      return;
    }

    if (source){
      await botSay(answer);
      afterAnswer();
    } else {
      await botSay(OUT_OF_SCOPE_ANSWER);
      bookingFlow();
    }
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
    callConnected = true;
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
    callConnected = false;
    startBtn.disabled = false;
    endBtn.disabled = true;
    callDot.classList.remove('live');
    callStatusText.textContent = 'Not connected';
    appendMessage(chatWindow, { from: 'bot', avatar: ICON_PHONE, html: 'Call ended. Press "Start Call" to try again.' });
  }

  startBtn.addEventListener('click', startCall);
  endBtn.addEventListener('click', endCall);

  // Caller can type a question at any point during an active call, matched
  // semantically instead of needing to click a menu button for it.
  const askForm = document.createElement('form');
  askForm.className = 'chat-input-row';
  askForm.style.display = 'none';
  askForm.innerHTML = `
    <label class="sr-only" for="receptionistAskInput">Ask a question</label>
    <input type="text" id="receptionistAskInput" placeholder="Or type a question…" autocomplete="off">
    <button type="submit" class="btn btn-primary btn-sm">Ask</button>
  `;
  optionsWrap.insertAdjacentElement('afterend', askForm);
  const askInput = askForm.querySelector('input');

  // Free-text input reuses the RAG demo's input pattern via a lightweight inline form
  const freeTextForm = document.createElement('form');
  freeTextForm.className = 'chat-input-row';
  freeTextForm.style.display = 'none';
  freeTextForm.innerHTML = `
    <label class="sr-only" for="receptionistInput">Type your message</label>
    <input type="text" id="receptionistInput" placeholder="Type your message…" autocomplete="off">
    <button type="submit" class="btn btn-primary btn-sm">Send</button>
  `;
  askForm.insertAdjacentElement('afterend', freeTextForm);
  const freeTextInput = freeTextForm.querySelector('input');

  function toggleInputVisibility(){
    freeTextForm.style.display = awaitingFreeText ? 'flex' : 'none';
    askForm.style.display = (callConnected && !awaitingFreeText) ? 'flex' : 'none';
  }

  // Toggle both input rows based on call/free-text state
  window.setInterval(toggleInputVisibility, 200);

  freeTextForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = freeTextInput.value.trim();
    if (!value || !awaitingFreeText) return;
    freeTextInput.value = '';
    userSay(value);
    awaitingFreeText = false;
    botSay('Got it — I’ve logged your message for the team. Anything else I can help with?').then(afterAnswer);
  });

  askForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = askInput.value.trim();
    if (!value || !callConnected || awaitingFreeText) return;
    askInput.value = '';
    userSay(value);
    setOptions([]);
    handleCallerQuestion(value);
  });
})();
