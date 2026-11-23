// Cookie consent banner + Google Analytics 4, inlined into index.html by sync.js when a
// Measurement ID is set in the back-office (config: window.SITE_ANALYTICS).
// gtag.js is only downloaded after the visitor accepts; the choice is kept in localStorage.
(() => {
  const ID = window.SITE_ANALYTICS?.measurementId;
  if (!ID) return;
  const STORAGE_KEY = 'primecars-analytics-consent';
  const TEXTS = {
    fr: { text: 'Nous utilisons Google Analytics pour mesurer l’audience du site, uniquement avec votre accord.', accept: 'Accepter', refuse: 'Refuser', manage: 'Cookies' },
    en: { text: 'We use Google Analytics to measure website traffic, only with your consent.', accept: 'Accept', refuse: 'Decline', manage: 'Cookies' },
    ar: { text: 'نستخدم Google Analytics لقياس عدد زوار الموقع، فقط بموافقتك.', accept: 'قبول', refuse: 'رفض', manage: 'ملفات تعريف الارتباط' }
  };
  const texts = () => TEXTS[document.documentElement.lang] || TEXTS.fr;
  const readChoice = () => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } };
  const saveChoice = value => { try { localStorage.setItem(STORAGE_KEY, value); } catch {} };

  let loaded = false;
  function loadAnalytics() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', ID);
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`;
    document.head.append(script);
  }
  function clearAnalyticsCookies() {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (!/^_ga/.test(name)) continue;
      const domain = location.hostname.split('.').slice(-2).join('.');
      for (const suffix of ['', `; domain=${location.hostname}`, `; domain=.${domain}`]) document.cookie = `${name}=; Max-Age=0; path=/${suffix}`;
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    .consent-banner{position:fixed;z-index:1000;left:16px;right:16px;bottom:16px;max-width:560px;margin-inline:auto;display:flex;align-items:center;gap:16px;padding:16px 18px;background:#0b0b0d;color:#ececef;border:1px solid #2a2a2f;border-radius:6px;box-shadow:0 10px 30px #0006;font-size:13px;line-height:1.5}
    .consent-banner p{margin:0;flex:1}
    .consent-banner div{display:flex;gap:8px;flex-shrink:0}
    .consent-banner button{min-height:40px;padding:8px 14px;border-radius:4px;border:1px solid #3a3a40;background:transparent;color:#fff;font:inherit;font-weight:600;cursor:pointer}
    .consent-banner button[data-consent="granted"]{background:#d90b10;border-color:#d90b10}
    .consent-manage{border:0;background:none;padding:0;color:inherit;font:inherit;text-decoration:underline;cursor:pointer}
    @media(max-width:560px){.consent-banner{flex-direction:column;align-items:stretch}.consent-banner div>button{flex:1}}`;

  let banner = null;
  function renderBanner() {
    if (!banner) return;
    const t = texts();
    banner.querySelector('p').textContent = t.text;
    banner.querySelector('[data-consent="granted"]').textContent = t.accept;
    banner.querySelector('[data-consent="denied"]').textContent = t.refuse;
  }
  function showBanner() {
    if (banner) return;
    banner = document.createElement('div');
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookies');
    banner.dataset.noI18n = '';
    banner.innerHTML = '<p></p><div><button type="button" data-consent="denied"></button><button type="button" data-consent="granted"></button></div>';
    banner.addEventListener('click', event => {
      const choice = event.target.closest('[data-consent]')?.dataset.consent;
      if (!choice) return;
      saveChoice(choice);
      banner.remove();
      banner = null;
      if (choice === 'granted') loadAnalytics();
      else if (loaded) { clearAnalyticsCookies(); location.reload(); }
      else clearAnalyticsCookies();
    });
    renderBanner();
    document.body.append(banner);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.head.append(style);
    const footer = document.querySelector('footer');
    if (footer) {
      const manage = document.createElement('button');
      manage.type = 'button';
      manage.className = 'consent-manage';
      manage.dataset.noI18n = '';
      manage.addEventListener('click', showBanner);
      const label = () => { manage.textContent = texts().manage; };
      label();
      footer.append(manage);
      new MutationObserver(() => { label(); renderBanner(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
    const choice = readChoice();
    if (choice === 'granted') loadAnalytics();
    else if (choice !== 'denied') showBanner();
  });
})();
