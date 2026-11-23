// "Link in bio" page (info/index.html) + QR code pointing to it (qr/qr-code.svg, printable card qr/index.html).
// Called by sync.js generate(); the social accounts come from the back-office « Réseaux sociaux » page.
const QRCode = require('qrcode');
const { profileUrl, normalizeProfile } = require('../social-links');

const PLACEHOLDER_URL = 'https://example.com';
const esc = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ICONS = {
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8.2h2.8l.4-3.3h-3.2V8.4c0-.9.3-1.6 1.6-1.6h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.3h2.8V22z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 20.5l1.3-4.2A8.6 8.6 0 1 1 8 19.4z"/><path d="M9 8.8c.2 2.6 3.4 5.8 6.2 6.2l1-1.3-1.8-1-1 .8a5 5 0 0 1-2.9-2.9l.8-1-1-1.8z" fill="currentColor" stroke="none"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2.5"/><path d="m22 7-10 6L2 7"/></svg>',
  car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>'
};

// FR / EN / AR texts; the chosen language is shared with the main site (localStorage « primecars-lang »).
const DICT = {
  tagline: ['Voitures neuves et d’occasion · France & Émirats → Tunis', 'New & used cars · France & UAE → Tunis', 'سيارات جديدة ومستعملة · فرنسا والإمارات ← تونس'],
  hello: ['Bienvenue chez Prime Cars 👋', 'Welcome to Prime Cars 👋', 'مرحبًا بكم في Prime Cars 👋'],
  site: ['Découvrir nos véhicules', 'Browse our vehicles', 'اكتشف سياراتنا'],
  siteSub: ['Catalogue, importation et conseils', 'Catalogue, import and advice', 'الكتالوج والاستيراد والنصائح'],
  follow: ['Suivez-nous', 'Follow us', 'تابعونا'],
  contact: ['Contactez-nous', 'Contact us', 'اتصلوا بنا'],
  soon: ['Bientôt disponible', 'Coming soon', 'قريبًا'],
  igSub: ['Photos et arrivages', 'Photos and new arrivals', 'صور ووصول السيارات'],
  fbSub: ['Actualités et avis', 'News and reviews', 'الأخبار والآراء'],
  ttSub: ['Vidéos et lives', 'Videos and lives', 'فيديوهات وبث مباشر'],
  whatsapp: ['WhatsApp', 'WhatsApp', 'واتساب'],
  call: ['Appeler', 'Call', 'اتصال'],
  email: ['E-mail', 'Email', 'البريد'],
  rights: ['Tous droits réservés', 'All rights reserved', 'جميع الحقوق محفوظة']
};
const t = key => DICT[key][0];

function infoUrl(siteUrl) {
  return `${siteUrl || PLACEHOLDER_URL}/info/`;
}

function socialAccounts(social = {}) {
  return [
    ['instagram', 'Instagram', social.instagramUsername, 'igSub'],
    ['facebook', 'Facebook', social.facebookUrl, 'fbSub'],
    ['tiktok', 'TikTok', social.tiktokUsername, 'ttSub']
  ].map(([platform, label, value, sub]) => {
    const href = profileUrl(platform, value);
    const handle = href && platform !== 'facebook' ? `@${normalizeProfile(platform, value)}` : '';
    return { platform, label, href, handle, sub };
  });
}

// QR code as SVG: rounded modules, branded finder eyes and the logo in the centre
// (error correction H tolerates the ~4 % of hidden modules).
function renderQrSvg(text, { logo, size = 1024 } = {}) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
  const count = qr.modules.size;
  const quiet = 4;
  const total = count + quiet * 2;
  const isFinder = (x, y) => (x < 7 && y < 7) || (x >= count - 7 && y < 7) || (x < 7 && y >= count - 7);
  const logoW = Math.round(count * 0.34) | 1;
  const logoH = Math.round(logoW * 0.42) | 1;
  const lx = (count - logoW) / 2;
  const ly = (count - logoH) / 2;
  const underLogo = (x, y) => x >= lx - 0.5 && x < lx + logoW + 0.5 && y >= ly - 0.5 && y < ly + logoH + 0.5;
  let dots = '';
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (!qr.modules.get(y, x) || isFinder(x, y) || (logo && underLogo(x, y))) continue;
      dots += `M${x + quiet + 0.33} ${y + quiet + 0.03}h0.34a0.3 0.3 0 0 1 0.3 0.3v0.34a0.3 0.3 0 0 1-0.3 0.3h-0.34a0.3 0.3 0 0 1-0.3-0.3v-0.34a0.3 0.3 0 0 1 0.3-0.3z`;
    }
  }
  const eye = (x, y) => `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.2" fill="none" stroke="#111113" stroke-width="1"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.6" fill="#d90b10"/>`;
  const logoBlock = logo
    ? `<rect x="${lx + quiet - 0.6}" y="${ly + quiet - 0.6}" width="${logoW + 1.2}" height="${logoH + 1.2}" rx="1.4" fill="#fff"/><rect x="${lx + quiet}" y="${ly + quiet}" width="${logoW}" height="${logoH}" rx="1.1" fill="#000"/><image href="${logo}" x="${lx + quiet + 0.3}" y="${ly + quiet + 0.2}" width="${logoW - 0.6}" height="${logoH - 0.4}" preserveAspectRatio="xMidYMid meet"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" role="img" aria-label="QR code : ${esc(text)}" shape-rendering="geometricPrecision">
<rect width="${total}" height="${total}" fill="#fff"/>
<path d="${dots}" fill="#111113"/>
${eye(quiet, quiet)}${eye(quiet + count - 7, quiet)}${eye(quiet, quiet + count - 7)}
${logoBlock}
</svg>
`;
}

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap" rel="stylesheet">';

function renderInfoPage({ settings, social, logo, siteUrl }) {
  const contact = settings.contact || {};
  const digits = value => String(value || '').replace(/[^\d+]/g, '');
  const siteHref = siteUrl ? `${siteUrl}/` : '../';
  const accounts = socialAccounts(social);
  const i18nAttrs = key => `data-i18n="${key}"`;
  const socialCards = accounts.map(({ platform, label, href, handle, sub }) => href
    ? `<a class="social ${platform}" href="${esc(href)}" target="_blank" rel="noopener"><span class="ico">${ICONS[platform]}</span><span class="txt"><strong>${label}</strong><small>${handle ? esc(handle) : `<span ${i18nAttrs(sub)}>${t(sub)}</span>`}</small></span><span class="go">${ICONS.arrow}</span></a>`
    : `<div class="social ${platform} off" aria-disabled="true"><span class="ico">${ICONS[platform]}</span><span class="txt"><strong>${label}</strong><small ${i18nAttrs('soon')}>${t('soon')}</small></span></div>`).join('\n      ');
  const contactLinks = [
    contact.whatsapp && ['whatsapp', `https://wa.me/${digits(contact.whatsapp).replace('+', '')}`, 'whatsapp'],
    contact.phone && ['phone', `tel:${digits(contact.phone)}`, 'call'],
    contact.email && ['mail', `mailto:${contact.email}`, 'email']
  ].filter(Boolean).map(([icon, href, key]) => `<a class="chip ${icon}" href="${esc(href)}"${icon === 'whatsapp' ? ' target="_blank" rel="noopener"' : ''}>${ICONS[icon]}<span ${i18nAttrs(key)}>${t(key)}</span></a>`).join('');
  const description = 'Prime Cars : catalogue, Instagram, Facebook, TikTok et contact.';
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>Prime Cars · Liens & réseaux sociaux</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#050506">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Prime Cars · Liens & réseaux sociaux">
  <meta property="og:description" content="${esc(description)}">
  ${siteUrl ? `<meta property="og:url" content="${esc(infoUrl(siteUrl))}">\n  <link rel="canonical" href="${esc(infoUrl(siteUrl))}">` : ''}
  <link rel="icon" href="${logo}">
  ${FONTS}
  <style>
    *{box-sizing:border-box;margin:0}
    :root{--red:#d90b10;--red2:#ff3b41;--ink:#f3f3f5;--mute:#a4a6ac;--card:rgba(255,255,255,.055);--line:rgba(255,255,255,.1)}
    html{background:#050506}
    body{min-height:100vh;font-family:Manrope,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:radial-gradient(120% 60% at 50% -10%,rgba(217,11,16,.35),transparent 60%),radial-gradient(80% 50% at 100% 100%,rgba(217,11,16,.12),transparent 60%),#050506;display:flex;justify-content:center;padding:28px 18px calc(28px + env(safe-area-inset-bottom))}
    main{width:100%;max-width:440px;display:flex;flex-direction:column;gap:22px}
    .cta,.list,footer{animation:in .6s ease both}.list{animation-delay:.08s}footer{animation-delay:.16s}
    @keyframes in{from{opacity:0;transform:translateY(12px)}}
    .lang{align-self:flex-end;display:flex;gap:4px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:3px}
    .lang button{font:700 12px Manrope,sans-serif;color:var(--mute);background:none;border:0;border-radius:999px;padding:6px 11px;cursor:pointer}
    .lang button[aria-pressed="true"]{background:var(--red);color:#fff}
    .brand{text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px}
    .logo{width:min(250px,70vw);aspect-ratio:400/128;background:url("${logo}") center/contain no-repeat;mix-blend-mode:screen}
    h1{font-size:22px;font-weight:800;letter-spacing:-.01em}
    .tagline{color:var(--mute);font-size:14px;line-height:1.5}
    .cta{display:flex;align-items:center;gap:14px;padding:18px;border-radius:20px;color:#fff;text-decoration:none;background:linear-gradient(135deg,#ff3b41,#d90b10 55%,#8f070b);box-shadow:0 14px 40px -12px rgba(217,11,16,.7),inset 0 1px 0 rgba(255,255,255,.25);transition:transform .2s,box-shadow .2s}
    .cta:hover{transform:translateY(-2px);box-shadow:0 18px 46px -12px rgba(217,11,16,.85),inset 0 1px 0 rgba(255,255,255,.25)}
    .cta .ico{width:46px;height:46px;border-radius:14px;background:rgba(0,0,0,.22);display:grid;place-items:center;flex-shrink:0}
    .cta strong{display:block;font-size:17px}.cta small{opacity:.85;font-size:13px}
    .cta .go{margin-inline-start:auto}
    h2{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);display:flex;align-items:center;gap:10px}
    h2::after{content:"";flex:1;height:1px;background:var(--line)}
    .list{display:flex;flex-direction:column;gap:10px}
    .social{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:18px;background:var(--card);border:1px solid var(--line);color:var(--ink);text-decoration:none;backdrop-filter:blur(8px);transition:transform .2s,border-color .2s,background .2s}
    a.social:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.25);background:rgba(255,255,255,.08)}
    .social .ico{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;color:#fff;flex-shrink:0}
    .instagram .ico{background:radial-gradient(circle at 30% 107%,#fdf497 0,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285aeb 90%)}
    .facebook .ico{background:#1877f2}
    .tiktok .ico{background:#000;box-shadow:inset 0 0 0 1px #333;filter:drop-shadow(-1.5px -1px 0 #25f4ee) drop-shadow(1.5px 1px 0 #fe2c55)}
    .social .txt{display:flex;flex-direction:column;gap:2px;min-width:0}
    .social strong{font-size:16px}.social small{color:var(--mute);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .social .go,.cta .go{width:20px;height:20px;opacity:.7;flex-shrink:0}
    .social .go{margin-inline-start:auto}
    .social.off{opacity:.55}
    .social.off small{display:inline-flex;align-items:center;gap:6px}
    .social.off small::before{content:"";width:6px;height:6px;border-radius:50%;background:#f5b800}
    svg{width:22px;height:22px}.go svg{width:20px;height:20px}
    .chips{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px}
    .chip{display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 10px;border-radius:14px;background:var(--card);border:1px solid var(--line);color:var(--ink);font-weight:700;font-size:14px;text-decoration:none;transition:background .2s,border-color .2s}
    .chip:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.25)}
    .chip.whatsapp svg{color:#25d366}.chip.phone svg{color:var(--red2)}.chip.mail svg{color:#e7e8ec}
    .chip svg{width:19px;height:19px}
    footer{text-align:center;color:#6f7177;font-size:12px;padding-top:6px;line-height:1.7}
    footer b{color:#b8b9bf;letter-spacing:.12em}
    [dir="rtl"] .go svg{transform:scaleX(-1)}
    @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
  </style>
</head>
<body>
  <main>
    <div class="lang" role="group" aria-label="Langue / Language / اللغة"><button type="button" data-lang="fr" lang="fr">FR</button><button type="button" data-lang="en" lang="en">EN</button><button type="button" data-lang="ar" lang="ar">عربي</button></div>
    <header class="brand">
      <div class="logo" role="img" aria-label="Prime Cars"></div>
      <h1 ${i18nAttrs('hello')}>${t('hello')}</h1>
      <p class="tagline" ${i18nAttrs('tagline')}>${t('tagline')}</p>
    </header>
    <a class="cta" href="${esc(siteHref)}"><span class="ico">${ICONS.car}</span><span><strong ${i18nAttrs('site')}>${t('site')}</strong><small ${i18nAttrs('siteSub')}>${t('siteSub')}</small></span><span class="go">${ICONS.arrow}</span></a>
    <section class="list" aria-labelledby="follow">
      <h2 id="follow" ${i18nAttrs('follow')}>${t('follow')}</h2>
      ${socialCards}
    </section>
    ${contactLinks ? `<section class="list" aria-labelledby="contact"><h2 id="contact" ${i18nAttrs('contact')}>${t('contact')}</h2><div class="chips">${contactLinks}</div></section>` : ''}
    <footer><b>UAE | TUNISIA</b><br>© ${new Date().getFullYear()} Prime Cars · <span ${i18nAttrs('rights')}>${t('rights')}</span></footer>
  </main>
  <script>
  (function () {
    var DICT = ${JSON.stringify(DICT).replace(/</g, '\\u003c')};
    var LANGS = ['fr', 'en', 'ar'], KEY = 'primecars-lang';
    function apply(lang) {
      var i = LANGS.indexOf(lang); if (i < 0) { lang = 'fr'; i = 0; }
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = DICT[el.dataset.i18n][i]; });
      document.querySelectorAll('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
      try { localStorage.setItem(KEY, lang); } catch (e) {}
    }
    var stored = new URLSearchParams(location.search).get('lang');
    if (!stored) { try { stored = localStorage.getItem(KEY); } catch (e) {} }
    if (!stored) stored = (navigator.language || 'fr').slice(0, 2);
    document.querySelectorAll('[data-lang]').forEach(function (b) { b.addEventListener('click', function () { apply(b.dataset.lang); }); });
    apply(stored);
  })();
  </script>
</body>
</html>
`;
}

function renderQrCard({ social, logo, siteUrl, qrSvg }) {
  const target = infoUrl(siteUrl);
  const shown = target.replace(/^https:\/\//, '').replace(/\/$/, '');
  const icons = socialAccounts(social).map(({ platform, label }) => `<span class="net ${platform}" title="${label}">${ICONS[platform]}</span>`).join('');
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Prime Cars · QR code à imprimer</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="${logo}">
  ${FONTS}
  <style>
    *{box-sizing:border-box;margin:0}
    @page{size:A6 portrait;margin:0}
    body{font-family:Manrope,system-ui,sans-serif;background:#1b1b1e;min-height:100vh;display:flex;flex-direction:column;align-items:center;gap:18px;padding:28px 16px;color:#111113}
    .toolbar{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
    .toolbar a,.toolbar button{font:700 14px Manrope,sans-serif;border:0;border-radius:999px;padding:11px 18px;cursor:pointer;text-decoration:none;background:#fff;color:#111113}
    .toolbar .primary{background:#d90b10;color:#fff}
    .warn{max-width:105mm;background:#fff4cc;color:#5c4300;border-radius:12px;padding:10px 14px;font-size:13px;line-height:1.45}
    .card{width:105mm;height:148mm;background:#fff;border-radius:6mm;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 80px -20px rgba(0,0,0,.6)}
    .top{background:radial-gradient(120% 120% at 50% 0,#3a0306 0,#050506 70%);padding:7mm 8mm 9mm;text-align:center;position:relative}
    .top::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:6mm;background:#fff;border-radius:6mm 6mm 0 0}
    .logo{height:17mm;background:url("${logo}") center/contain no-repeat;mix-blend-mode:screen}
    .body{flex:1;display:flex;flex-direction:column;align-items:center;padding:0 8mm 7mm;text-align:center}
    .scan{font-weight:800;font-size:17pt;letter-spacing:-.01em;margin-top:1mm}
    .scan span{color:#d90b10}
    .sub{color:#5f6167;font-size:8.5pt;margin-top:1mm;line-height:1.4}
    .ar{font-family:"Segoe UI",Tahoma,sans-serif}
    .qr{margin:4mm 0 3mm;padding:2.5mm;border-radius:5mm;background:#fff;box-shadow:0 0 0 .5mm #ececef,0 6mm 14mm -8mm rgba(217,11,16,.45)}
    .qr svg{display:block;width:62mm;height:62mm}
    .nets{display:flex;gap:2.5mm;justify-content:center}
    .net{width:8mm;height:8mm;border-radius:2.4mm;display:grid;place-items:center;color:#fff}
    .net svg{width:4.6mm;height:4.6mm}
    .net.instagram{background:radial-gradient(circle at 30% 107%,#fdf497 0,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285aeb 90%)}
    .net.facebook{background:#1877f2}.net.tiktok{background:#000}
    .url{margin-top:auto;font-size:8pt;font-weight:700;color:#111113;background:#f3f3f5;border-radius:99px;padding:1.6mm 4mm}
    @media print{body{background:none;padding:0;gap:0}.toolbar,.warn{display:none}.card{box-shadow:none;border-radius:0;width:105mm;height:148mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style>
</head>
<body>
  <div class="toolbar"><button class="primary" type="button" onclick="print()">🖨️ Imprimer (A6)</button><a href="qr-code.svg" download="prime-cars-qr-code.svg">⬇️ Télécharger le QR (SVG)</a><a href="${esc(siteUrl ? target : '../info/')}" target="_blank" rel="noopener">👀 Voir la page</a></div>
  ${siteUrl ? '' : `<p class="warn">⚠️ <b>Adresse du site non configurée :</b> ce QR code pointe vers <code>${esc(target)}</code>. Renseignez l’adresse publique dans le back-office (Site vitrine) ou lancez <code>node front-office/sync.js https://votre-site</code>, puis réimprimez.</p>`}
  <article class="card">
    <div class="top"><div class="logo" role="img" aria-label="Prime Cars"></div></div>
    <div class="body">
      <p class="scan">Scannez-moi <span>!</span></p>
      <p class="sub">Nos véhicules & réseaux sociaux · Our cars & socials<br><span class="ar" dir="rtl">سياراتنا وشبكاتنا الاجتماعية</span></p>
      <div class="qr">${qrSvg}</div>
      <div class="nets">${icons}</div>
      <p class="url">${esc(shown)}</p>
    </div>
  </article>
</body>
</html>
`;
}

module.exports = { renderInfoPage, renderQrCard, renderQrSvg, infoUrl, socialAccounts };
