// ===================== Header scroll state =====================
const header = document.getElementById('siteHeader');
const backToTop = document.getElementById('backToTop');

function onScroll(){
  const scrolled = window.scrollY > 12;
  header.classList.toggle('scrolled', scrolled);
  backToTop.classList.toggle('show', window.scrollY > 480);
}
document.addEventListener('scroll', onScroll, { passive: true });
onScroll();

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===================== Mobile nav toggle =====================
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');

function closeMobileNav(){
  mainNav.classList.remove('open');
  navToggle.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}

navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  navToggle.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeMobileNav);
});

document.addEventListener('scroll', () => {
  if (mainNav.classList.contains('open')) closeMobileNav();
}, { passive: true });

// ===================== Scroll reveal =====================
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting){
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => revealObserver.observe(el));

// ===================== Hero word rotator =====================
const rotatorWords = ['your workflows.', 'your customer calls.', 'your paperwork.', 'your knowledge base.', 'your existing tools.'];
const rotatorEl = document.getElementById('rotator');
let rotatorIndex = 0;

function cycleRotator(){
  rotatorIndex = (rotatorIndex + 1) % rotatorWords.length;
  rotatorEl.style.opacity = '0';
}

rotatorEl.addEventListener('transitionend', (e) => {
  if (e.propertyName !== 'opacity' || rotatorEl.style.opacity !== '0') return;
  rotatorEl.textContent = rotatorWords[rotatorIndex];
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      rotatorEl.style.opacity = '1';
    });
  });
});

rotatorEl.style.transition = 'opacity .28s ease';
setInterval(cycleRotator, 2800);

// ===================== Stat counters =====================
const statNums = document.querySelectorAll('.stat-num');
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseInt(el.dataset.count, 10);
    const duration = 1200;
    const start = performance.now();
    function tick(now){
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    statObserver.unobserve(el);
  });
}, { threshold: 0.6 });

statNums.forEach(el => statObserver.observe(el));

// ===================== Demo tab switching =====================
const demoTabs = document.querySelectorAll('.demo-tab');
const demoPanels = document.querySelectorAll('.demo-panel');

demoTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    demoTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    demoPanels.forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(tab.dataset.target).classList.add('active');
  });
});

// ===================== Contact form (Formspree) =====================
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
const contactSubmit = document.getElementById('contactSubmit');
const accessKeyInput = contactForm.querySelector('input[name="access_key"]');

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (accessKeyInput.value === 'YOUR_ACCESS_KEY') {
    formStatus.textContent = 'Contact form is not fully set up yet — Web3Forms access key is missing.';
    formStatus.className = 'form-status error';
    return;
  }

  contactSubmit.disabled = true;
  formStatus.textContent = 'Sending…';
  formStatus.className = 'form-status';

  try {
    const payload = Object.fromEntries(new FormData(contactForm));
    const response = await fetch(contactForm.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (response.ok && result.success) {
      formStatus.textContent = "Thanks — your message is on its way. We'll be in touch soon.";
      formStatus.className = 'form-status success';
      contactForm.reset();
    } else {
      formStatus.textContent = 'Something went wrong sending your message. Please email us directly instead.';
      formStatus.className = 'form-status error';
    }
  } catch (err) {
    formStatus.textContent = 'Network error — please try again or email us directly.';
    formStatus.className = 'form-status error';
  } finally {
    contactSubmit.disabled = false;
  }
});

// ===================== Footer year =====================
document.getElementById('year').textContent = new Date().getFullYear();
