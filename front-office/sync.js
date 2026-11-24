// Regenerates the static site from the root project: node front-office/sync.js [public URL]
// Also called by the server from the back-office « Site vitrine » section (generate()).
const fs = require('node:fs');
const path = require('node:path');
const { uploadNameFromUrl } = require('../storage');
const infoPage = require('./info-page');

const ROOT = path.join(__dirname, '..');
const OUT = __dirname;
const SITE_NAME = 'Prime Cars';
const DEFAULT_WALLPAPER = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2200&q=90';
const HERO_IMAGE = `<div class="hero"><img src="${DEFAULT_WALLPAPER}" alt="Voiture sportive photographiée de trois quarts">`;
const IMAGE_MIME_TYPES = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
// SEO texts and contact details, editable in the back-office (data/static-site.json); these are the fallbacks.
const DEFAULT_SETTINGS = {
  siteUrl: '',
  title: 'Prime Cars — Voitures neuves et d’occasion de France et des Émirats arabes unis à Tunis',
  description: 'Prime Cars sélectionne des voitures neuves et d’occasion en France et aux Émirats arabes unis et les livre jusqu’à Tunis : Mercedes, BMW, Audi, Porsche, Volkswagen. Accompagnement à chaque étape.',
  contact: { phone: '+971543280723', phoneDisplay: '+971 54 328 0723', whatsapp: '+971543280723', email: 'contact@example.com' },
  // Import cost estimate (TND, insurance in % of the vehicle value), editable in the back-office.
  shipping: { france: 4500, dubai: 8500, suv: 1500, insuranceRate: 1, support: 1200 },
  // « Export seul » (customer's own vehicle, not in the catalogue): separate rates, plus optional customs clearance.
  exportShipping: { france: 5500, dubai: 9500, suv: 1500, insuranceRate: 1, support: 1800, customs: 900 },
  wallpaperImage: '',
  defaultWallpaperImage: DEFAULT_WALLPAPER
};

const readJson = name => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', name), 'utf8'));
const COLOR_MAP = {
  '#172821': '#111113', '#205c47': '#d90b10', '#d8f278': '#e7e8ec', '#758079': '#74767c', '#e1e6e1': '#e4e4e7',
  '#f5f7f3': '#f5f5f6', '#96bc5a': '#ff4d55', '#96b95d': '#9a9ca3', '#081510': '#0a0a0c', '#e4ede6': '#e6e6e9',
  '#2d3435': '#1b1b1e', '#e3e7e2': '#e5e5e8', '#e8f0e7': '#fde8e9', '#609a66': '#d90b10', '#eff3ea': '#f3f3f5',
  '#e1e8d8': '#e4e4e7', '#afc195': '#b8b9bf', '#737f70': '#74767c', '#edf0eb': '#efeff1', '#717a73': '#6f7177',
  '#7a827c': '#77797f', '#e8ebe7': '#ebebed', '#66736a': '#686a70', '#939a94': '#96989e', '#eef3e9': '#f1f1f3',
  '#c9d4cc': '#d2d3d8', '#88a475': '#a0a2a8', '#7c8a77': '#7b7d83', '#70806e': '#707278', '#e0e7d9': '#e3e3e6',
  '#798372': '#797b81', '#ecefeb': '#eeeef0', '#f0f3ed': '#f2f2f4', '#9aa29a': '#9c9ea4', '#f0f4eb': '#f2f2f4',
  '#bdc9bc': '#c3c4c9', '#f4f7f0': '#f5f5f6', '#eef2e9': '#f0f0f2', '#f6f7f3': '#f6f6f7', '#e8eedf': '#ececef',
  '#9caf91': '#a4a6ac', '#69756d': '#6a6c72'
};
function readSettings(saved) {
  if (saved === undefined) {
    saved = {};
    try { saved = readJson('static-site.json'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return { ...DEFAULT_SETTINGS, ...saved, contact: { ...DEFAULT_SETTINGS.contact, ...saved.contact }, shipping: { ...DEFAULT_SETTINGS.shipping, ...saved.shipping }, exportShipping: { ...DEFAULT_SETTINGS.exportShipping, ...saved.exportShipping }, defaultWallpaperImage: DEFAULT_WALLPAPER };
}
// Google Analytics (back-office « Google Analytics » page, data/analytics.json); empty ID = no tracking.
const MEASUREMENT_ID_RE = /^G-[A-Z0-9]{4,12}$/;
function readAnalytics(saved) {
  if (saved === undefined) {
    saved = {};
    try { saved = readJson('analytics.json'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return { measurementId: MEASUREMENT_ID_RE.test(saved.measurementId || '') ? saved.measurementId : '' };
}

async function readSnapshot(storage) {
  const documents = await storage.readMany(['cars.json', 'social.json', 'static-site.json', 'analytics.json']);
  const settings = readSettings(documents['static-site.json']);
  if (typeof settings.wallpaperImage !== 'string') throw new Error('Image de fond invalide dans les réglages du site.');
  let wallpaperDataUrl = '';
  if (settings.wallpaperImage) {
    const name = uploadNameFromUrl(settings.wallpaperImage);
    const image = await storage.getUpload(name);
    if (!image) throw new Error(`Image de fond introuvable : ${name}.`);
    if (image.mimeType !== IMAGE_MIME_TYPES[path.extname(name)] || !Buffer.isBuffer(image.bytes) || !image.bytes.length) {
      throw new Error(`Image de fond invalide : ${name}.`);
    }
    wallpaperDataUrl = `data:${image.mimeType};base64,${image.bytes.toString('base64')}`;
  }
  return {
    data: { cars: documents['cars.json'], social: documents['social.json'] },
    settings,
    analytics: documents['analytics.json'],
    wallpaperDataUrl
  };
}

const escapeAttr = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function renderWallpaper(html, imageUrl) {
  if (!html.includes(HERO_IMAGE)) throw new Error('index.html : image de fond introuvable, mettre à jour sync.js.');
  return html.replace(HERO_IMAGE, () => `<div class="hero"><img src="${escapeAttr(imageUrl)}" alt="">`);
}

// Applies the Prime Cars branding (logo, palette, SEO, contact buttons) to the root index.html template.
// live: page served by the Node server (keeps the /api calls, payment form and /i18n.js);
// otherwise: single self-contained file for the static site (data inlined, no backend).
function renderSite(options = {}, { live = false } = {}) {
  const settings = readSettings(options.settings);
  const analytics = readAnalytics(options.analytics);
  const data = options.data || { cars: readJson('cars.json'), social: readJson('social.json') };
  const wallpaperUrl = live ? settings.wallpaperImage : options.wallpaperDataUrl;
  if (settings.wallpaperImage && !wallpaperUrl) throw new Error('Image de fond manquante pour la génération du site.');
  // "<" escaped so the inlined JSON can never close the <script> tag.
  const dataScript = `<script>window.SITE_DATA = ${JSON.stringify(data, null, 2).replace(/</g, '\\u003c')};</script>`;

  // ---------- SEO & link previews (WhatsApp, Facebook, Messenger, LinkedIn, X…) ----------
  // Optional public URL (command-line argument, SITE_URL variable or back-office setting).
  const SITE_URL = (options.siteUrl || settings.siteUrl || '').replace(/\/$/, '');
  const TITLE = settings.title;
  const DESCRIPTION = settings.description;
  // Social crawlers need an absolute image URL: the home hero photo cropped to 1200×630.
  const PREVIEW_IMAGE = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&h=630&q=80';
  const carImage = car => `https://images.unsplash.com/${encodeURIComponent(car.image)}?auto=format&fit=crop&w=1200&q=80`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AutoDealer', name: SITE_NAME, description: DESCRIPTION, image: PREVIEW_IMAGE,
        ...(SITE_URL && { url: SITE_URL }),
        address: { '@type': 'PostalAddress', addressLocality: 'Tunis', addressCountry: 'TN' },
        areaServed: ['TN', 'FR', 'AE']
      },
      {
        '@type': 'ItemList', name: 'Véhicules disponibles',
        itemListElement: data.cars.filter(car => car.status !== 'sold').map((car, index) => ({
          '@type': 'ListItem', position: index + 1,
          item: {
            '@type': 'Car', name: `${car.name} ${car.trim || ''}`.trim(), brand: { '@type': 'Brand', name: car.brand },
            vehicleModelDate: String(car.year), fuelType: car.fuel, itemCondition: car.kind === 'neuf' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
            mileageFromOdometer: { '@type': 'QuantitativeValue', value: Number(String(car.km).replace(/\s/g, '')) || 0, unitCode: 'KMT' },
            image: carImage(car),
            ...(SITE_URL && { url: `${SITE_URL}/?screen=vehicule&id=${encodeURIComponent(car.id)}` }),
            offers: { '@type': 'Offer', price: car.price, priceCurrency: 'TND', availability: car.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/LimitedAvailability' }
          }
        }))
      }
    ]
  };
  const favicon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#050506"/><path d="M5 21C10 11 22 8 28 13" stroke="#c7c9cf" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M8 24C13 16 22 14 27 17" stroke="#dd0a0d" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>');
  const seoTags = [
    `<meta name="description" content="${escapeAttr(DESCRIPTION)}">`,
    '<meta name="robots" content="index, follow, max-image-preview:large">',
    '<meta name="theme-color" content="#050506">',
    `<link rel="icon" href="${escapeAttr(favicon)}">`,
    ...(SITE_URL ? [`<link rel="canonical" href="${escapeAttr(SITE_URL + '/')}">`, `<meta property="og:url" content="${escapeAttr(SITE_URL + '/')}">`] : []),
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="fr_FR">',
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:title" content="${escapeAttr(TITLE)}">`,
    `<meta property="og:description" content="${escapeAttr(DESCRIPTION)}">`,
    `<meta property="og:image" content="${escapeAttr(PREVIEW_IMAGE)}">`,
    `<meta property="og:image:secure_url" content="${escapeAttr(PREVIEW_IMAGE)}">`,
    '<meta property="og:image:type" content="image/jpeg">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="Voiture sportive blanche dans un garage — Prime Cars">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeAttr(TITLE)}">`,
    `<meta name="twitter:description" content="${escapeAttr(DESCRIPTION)}">`,
    `<meta name="twitter:image" content="${escapeAttr(PREVIEW_IMAGE)}">`,
    `<script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>`
  ].join('\n  ');

  // ---------- Contact: call / WhatsApp / SMS / e-mail (front-office/contact.js) ----------
  const CONTACT = { brand: SITE_NAME, ...settings.contact };
  const phoneHref = escapeAttr(`tel:${CONTACT.phone}`);
  const smsHref = escapeAttr(`sms:${CONTACT.phone}`);
  const whatsappHref = `https://wa.me/${String(CONTACT.whatsapp).replace(/\D/g, '')}`;
  const emailHref = escapeAttr(`mailto:${CONTACT.email}`);
  const contactButtons = [
    `<a class="contact-btn call" data-contact="call" href="${phoneHref}"><i data-lucide="phone"></i> Appeler</a>`,
    `<a class="contact-btn whatsapp" data-contact="whatsapp" href="${whatsappHref}" target="_blank" rel="noopener"><i data-lucide="message-circle"></i> WhatsApp</a>`,
    `<a class="contact-btn" data-contact="sms" href="${smsHref}"><i data-lucide="message-square-text"></i> SMS</a>`,
    `<a class="contact-btn" data-contact="email" href="${emailHref}"><i data-lucide="mail"></i> E-mail</a>`
  ].join('');
  const contactNumber = `<bdi dir="ltr">${escapeAttr(CONTACT.phoneDisplay)}</bdi>`;
  const CONTACT_CSS = `
    .contact-card{margin-top:18px;padding-top:18px;border-top:1px solid var(--line)}
    .contact-card>strong{display:block;font-size:13px}
    .contact-number{display:block;font-size:12px;color:var(--muted);margin:4px 0 12px}
    .contact-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .contact-btn{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 14px;border:1px solid var(--line);border-radius:4px;background:#fff;color:var(--ink);font-weight:600;font-size:12px;white-space:nowrap}
    .contact-btn:hover{border-color:var(--ink)}
    .contact-btn svg{width:16px;height:16px}
    .contact-btn.call{background:var(--ink);border-color:var(--ink);color:#fff}
    .contact-btn.whatsapp{background:#25d366;border-color:#25d366;color:#fff}
    .contact-banner{display:flex;align-items:center;justify-content:space-between;gap:24px;margin:40px 0 10px;padding:28px 32px;background:#0b0b0d;color:#fff;border-radius:6px}
    .contact-banner h3{font-size:22px;margin-bottom:6px;color:#fff}
    .contact-banner p{color:#c9cad0;font-size:13px;max-width:460px;line-height:1.7}
    .contact-banner .contact-actions{grid-template-columns:repeat(4,auto)}
    .contact-banner .contact-btn{background:transparent;color:#fff;border-color:#3a3a40}
    .contact-banner .contact-btn.call{background:var(--green);border-color:var(--green)}
    .contact-banner .contact-btn.whatsapp{background:#25d366;border-color:#25d366}
    .footer-contact{display:flex;flex-wrap:wrap;gap:6px 14px}
    .footer-contact a{display:inline-flex;align-items:center;gap:5px;color:var(--ink);font-weight:600}
    .footer-contact svg{width:13px;height:13px;color:var(--green)}
    @media(max-width:720px){.contact-banner{flex-direction:column;align-items:stretch;padding:22px}.contact-banner .contact-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}`;

  // ---------- PrimeCar theme: logo (front-office/assets/logo.jpg) + black / red / silver palette ----------
  const LOGO = `data:image/jpeg;base64,${fs.readFileSync(path.join(OUT, 'assets', 'logo.jpg')).toString('base64')}`;
  const THEME_CSS = `<style>
    header{background:#050506;color:#ececef}
    .topline{background:#000;border-bottom:1px solid #1c1c20}
    .nav{border-bottom-color:#1c1c20}
    .logo-img{display:block;background:#000 url("${LOGO}") center/contain no-repeat}
    .brand-logo{width:190px;height:60px;mix-blend-mode:screen}
    .footer-logo{width:126px;height:40px;border-radius:6px;flex-shrink:0}
    .links a{color:#d4d5da}.links a:hover,.links a.active{color:#fff}
    .links.mobile-open{background:#0b0b0d}
    .nav-actions .text-link,.menu-toggle{color:#fff}
    .nav-actions .text-link{white-space:nowrap}
    @media(max-width:1240px){.nav-actions>a:first-child{display:none}}
    .hero .eyebrow{color:#ff3b41}
    .lang-switch button[aria-pressed="true"]{background:var(--green);color:#fff}
    @media(max-width:720px){.brand-logo{width:152px;height:48px}}
    @media(max-width:420px){.brand-logo{width:126px;height:40px}}${CONTACT_CSS}
  </style>`;

  // Static version = single self-contained file: data inlined, API calls replaced, deposit form hidden (no payment server).
  const REPLACEMENTS = [
    ...(live ? [] : [['<script src="/social-links.js"></script>', `<script>\n${fs.readFileSync(path.join(ROOT, 'social-links.js'), 'utf8').replace(/<\/script/gi, '<\\/script')}\n</script>`]]),
    ['</head>', live ? `  ${THEME_CSS}\n</head>` : `  ${THEME_CSS}\n  ${dataScript}\n</head>`],
    ['<title>ALLANI Auto — Votre prochaine destination</title>', `<title>${escapeAttr(TITLE)}</title>\n  ${seoTags}`],
    ...(live ? [] : [
      ["(await fetch('/api/cars').then(response=>response.ok?response.json():[]).catch(()=>[]))", 'window.SITE_DATA.cars'],
      ["await fetch('/api/social').then(response=>response.json()).catch(()=>({posts:[]}))", 'window.SITE_DATA.social'],
      ["fetch('/api/payment-config')", 'Promise.reject()'],
      ["const EXPORT_API='/api/export-requests';", "const EXPORT_API='';"]
    ]),
    // Rebranding: ALLANI Auto -> Prime Cars, with the PrimeCar logo
    ['<span class="brandmark"><b></b><b></b></span>ALLANI<small>AUTO</small>', '<span class="logo-img brand-logo" aria-hidden="true"></span>'],
    ['<a href="?screen=accueil" style="font-family:Manrope;font-size:17px;font-weight:800;color:var(--ink)">ALLANI <span style="font-size:9px;font-weight:500">AUTO</span></a>', '<a href="?screen=accueil" class="logo-img footer-logo" aria-label="ALLANI Auto, accueil"></a>'],
    ['LIVE ALLANI AUTO', 'LIVE PRIME CARS'],
    ['LA SÉLECTION ALLANI', 'LA SÉLECTION PRIME CARS'],
    ['ALLANI Auto', 'Prime Cars'],
    // Contact buttons: vehicle page (message mentions the car), import page, footer
    ['<a href="?screen=livraison#project" class="btn light"><i data-lucide="message-circle"></i> Échanger avec un conseiller</a>', `$&<div class="contact-card" data-contact-car><strong>Contactez-nous directement</strong><span class="contact-number">${contactNumber}</span><div class="contact-actions">${contactButtons}</div></div>`],
    ['<div class="faq" id="faq">', `<div class="contact-banner" id="contact"><div><h3>Une question ? Parlons-en.</h3><p>Appelez-nous, écrivez-nous sur WhatsApp, par SMS ou par e-mail : un conseiller vous répond rapidement.</p></div><div class="contact-actions">${contactButtons}</div></div>$&`],
    ['<span>Concept de marque · 2026</span></footer>', `<span class="footer-contact"><a data-contact="call" href="${phoneHref}"><i data-lucide="phone"></i> ${contactNumber}</a><a data-contact="whatsapp" href="${whatsappHref}" target="_blank" rel="noopener"><i data-lucide="message-circle"></i> WhatsApp</a><a data-contact="sms" href="${smsHref}"><i data-lucide="message-square-text"></i> SMS</a><a data-contact="email" href="${emailHref}"><i data-lucide="mail"></i> E-mail</a></span>$&`]
  ];

  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  if (settings.wallpaperImage) html = renderWallpaper(html, wallpaperUrl);
  for (const [search, replacement] of REPLACEMENTS) {
    if (!html.includes(search)) throw new Error(`index.html : code introuvable, mettre à jour sync.js : ${search}`);
    // "$&" in a replacement stands for the searched text (to insert content before/after it).
    html = html.split(search).join(replacement.split('$&').join(search));
  }
  if (/allani/i.test(html)) throw new Error('index.html : il reste une mention « ALLANI » non remplacée.');
  // Language switcher (FR / EN / AR): the server version loads /i18n.js, the single-file demo inlines it.
  const I18N_TAG = '<script src="/i18n.js"></script>';
  if (!html.includes(I18N_TAG)) throw new Error(`index.html : code introuvable, mettre à jour sync.js : ${I18N_TAG}`);
  if (!live) {
    const i18n = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
    html = html.replace(I18N_TAG, () => `<script>\n${i18n}</script>`);
  }
  const contactScript = fs.readFileSync(path.join(OUT, 'contact.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
  html = html.replace('</head>', () => `  <script>\nwindow.SITE_CONTACT = ${JSON.stringify(CONTACT).replace(/</g, '\\u003c')};\nwindow.SITE_SHIPPING = ${JSON.stringify(settings.shipping)};\nwindow.SITE_EXPORT_SHIPPING = ${JSON.stringify(settings.exportShipping)};\n${contactScript}</script>\n</head>`);
  if (analytics.measurementId) {
    const analyticsScript = fs.readFileSync(path.join(OUT, 'analytics.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
    html = html.replace('</head>', () => `  <script>\nwindow.SITE_ANALYTICS = ${JSON.stringify(analytics)};\n${analyticsScript}</script>\n</head>`);
  }
  html = html
    .replace(/#[0-9a-f]{6}(?=[0-9a-f]{2}\b|\b)/gi, color => COLOR_MAP[color.toLowerCase()] || color)
    .replace(/rgba\(8,21,16,/g, 'rgba(10,10,12,');
  return { html, settings, analytics, data, siteUrl: SITE_URL, logo: LOGO };
}

function renderLiveSite(options = {}) {
  return renderSite(options, { live: true }).html;
}

function renderLiveInfoPage(options = {}) {
  const settings = readSettings(options.settings);
  const logo = `data:image/jpeg;base64,${fs.readFileSync(path.join(OUT, 'assets', 'logo.jpg')).toString('base64')}`;
  return infoPage.renderInfoPage({
    settings,
    social: options.social || readJson('social.json'),
    logo,
    siteUrl: (options.siteUrl || settings.siteUrl || '').replace(/\/$/, '')
  });
}

function generate(options = {}) {
  const { html, settings, analytics, data, siteUrl: SITE_URL, logo: LOGO } = renderSite(options);
  const i18n = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
  const demoSettings = { ...settings, wallpaperImage: options.wallpaperDataUrl || '' };
  const admin = renderAdmin({ snapshot: { ...data, staticSite: demoSettings, analytics }, i18n, logo: LOGO });
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  fs.mkdirSync(path.join(OUT, 'allani'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'allani', 'index.html'), admin);
  // « Link in bio » page + QR code pointing to it (front-office/info-page.js).
  const qrSvg = infoPage.renderQrSvg(infoPage.infoUrl(SITE_URL), { logo: LOGO });
  fs.mkdirSync(path.join(OUT, 'info'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'info', 'index.html'), infoPage.renderInfoPage({ settings, social: data.social, logo: LOGO, siteUrl: SITE_URL }));
  fs.mkdirSync(path.join(OUT, 'qr'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'qr', 'qr-code.svg'), qrSvg);
  fs.writeFileSync(path.join(OUT, 'qr', 'index.html'), infoPage.renderQrCard({ social: data.social, logo: LOGO, siteUrl: SITE_URL, qrSvg }));
  return { generatedAt: new Date().toISOString() };
}

function renderAdmin({ snapshot, i18n, logo }) {
  const isStatic = snapshot !== undefined;
  const staticAdminData = isStatic ? JSON.stringify(snapshot).replace(/</g, '\\u003c') : '';
  const demoApi = isStatic ? fs.readFileSync(path.join(OUT, 'demo-admin.js'), 'utf8').replace(/<\/script/gi, '<\\/script') : '';
  let admin = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8').replace(/\r\n/g, '\n');
  admin = admin.replace(/#[0-9a-f]{6}(?=[0-9a-f]{2}\b|\b)/gi, color => COLOR_MAP[color.toLowerCase()] || color)
    .replaceAll('ALLANI Auto', 'Prime Cars').replaceAll('ALLANI AUTO', 'PRIME CARS');
  const adminTranslations = fs.readFileSync(path.join(OUT, 'admin-i18n.js'), 'utf8');
  const adminI18n = i18n.replace('  const norm =', `${adminTranslations}\n  const norm =`)
    .replace("if (params.has('lang')) { params.set('lang', lang); history.replaceState(history.state, '', `?${params}${location.hash}`); }", "const currentParams = new URLSearchParams(location.search); if (currentParams.has('lang')) { currentParams.set('lang', lang); history.replaceState(history.state, '', `?${currentParams}${location.hash}`); }");
  const adminReplacements = [
    ['<script src="/social-links.js"></script>', `<script>\n${fs.readFileSync(path.join(ROOT, 'social-links.js'), 'utf8').replace(/<\/script/gi, '<\\/script')}\n</script>`],
    ['<header><h1>Prime Cars · Admin</h1><div><a href="/" target="_blank" rel="noopener">Voir le site ↗</a> <button class="light" id="logout" style="margin-left:14px;padding:7px 12px">Déconnexion</button></div></header>', `<header><div class="admin-header-brand"><a href="${isStatic ? '../index.html' : '/'}" class="admin-logo" aria-label="Prime Cars, accueil"></a></div><div class="admin-header-actions"><a href="${isStatic ? '../index.html' : '/'}" target="_blank" rel="noopener">Voir le site ↗</a><span class="lang-switch" data-no-i18n role="group" aria-label="Langue / Language / اللغة"><button type="button" data-lang="fr" lang="fr">FR</button><button type="button" data-lang="en" lang="en">EN</button><button type="button" data-lang="ar" lang="ar">عربي</button></span><button class="light hidden" id="logout" style="margin-left:14px;padding:7px 12px">Déconnexion</button></div></header>`],
    ...(isStatic ? [["      const response = await fetch(url, { credentials: 'same-origin', ...options });\n      const data = await response.json().catch(() => ({}));\n      if (response.status === 401 && url !== '/api/admin/login') { showLogin(); throw new Error('Session expirée.'); }\n      if (!response.ok) throw new Error(data.error || 'Erreur.');\n      return data;", `          return demoAdminApi(url, options);`],
    ['    async function api(url, options = {}) {', `    ${demoApi}
    const demoAdminApi = createDemoAdminApi(${staticAdminData});
    window.addEventListener('pagehide', event => { if (!event.persisted) demoAdminApi.dispose(); });
    async function api(url, options = {}) {`],
    ['    <h2>Connexion</h2>\n    <label for="password">', '    <h2>Connexion</h2>\n    <p class="help" id="demo-login-notice">Démo uniquement : saisissez n’importe quel texte non vide, pas un vrai mot de passe. Cette page n’est pas protégée.</p>\n    <label for="password">'],
    ['<input id="password" type="password" autocomplete="current-password" required>', '<input id="password" type="password" autocomplete="off" aria-describedby="demo-login-notice" required>'],
    ["$('login').addEventListener('submit', async event => {", "$('login').addEventListener('submit', event => {"],
    ["      try { await api('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('password').value }) }); $('password').value = ''; showApp(); }\n      catch (error) { $('login-msg').textContent = error.message; }", "      $('password').value = ''; showApp();"],
    ["$('logout').addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST' }); showLogin(); });", "$('logout').addEventListener('click', () => { showLogin(); });"],
    ["const imgUrl = src => /^\\/uploads\\//.test(src) ? src :", "const imgUrl = src => /^(blob:|data:image\\/|\\/uploads\\/)/.test(src) ? src :"],
    ["      if (!editingId && !selectedPhotos.length) {\n        $('photo-error').textContent = 'Ajoutez au moins une photo.';\n        $('f-photos').focus();\n        return;\n      }\n", ''],
    ['Véhicule ajouté et visible sur le site.', 'Véhicule ajouté à la démo.'],
    ['Réseaux sociaux enregistrés. Pour le site vitrine statique, régénérez puis republiez le dossier front-office.', 'Réseaux sociaux enregistrés dans la démo uniquement.'],
    ['Enregistrement effectué.', 'Modifications enregistrées dans la démo uniquement.'],
    ['Site vitrine régénéré. Republiez le dossier front-office pour le mettre en ligne.', 'Simulation terminée. Aucun fichier publié ni modifié.'],
    ['Suivi activé sur le site vitrine. Republiez le dossier front-office pour le mettre en ligne.', 'ID enregistré dans la démo uniquement. Aucun suivi activé.'],
    ['Suivi désactivé sur le site vitrine. Republiez le dossier front-office.', 'ID effacé dans la démo uniquement. Aucun suivi modifié.'],
    ['Aperçu uniquement. L’annonce sera publiée après enregistrement.', 'Aperçu de démonstration. Aucune annonce ne sera publiée.'],
    ['Enregistrer et régénérer', 'Enregistrer dans la démo'],
    ['Enregistrer et régénérer', 'Enregistrer dans la démo'],
    ['Régénérer avec les données actuelles', 'Simuler la génération'],
    ['<a class="sidebar-site-link" href="/"', '<a class="sidebar-site-link" href="../index.html"'],
    ['<a href="/?screen=vehicule&id=', '<a href="../index.html?screen=vehicule&id='],
    ["    api('/api/admin/me').then(showApp).catch(showLogin);", '    showLogin();']] : []),
    ['</head>', `<style>
    ${isStatic ? '.share-actions { display: none !important; }' : ''}
    header { background: #050506; gap: 16px; }
    .admin-header-brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
    .admin-logo { display: block; width: 150px; height: 48px; flex: 0 0 auto; background: #000 url("${logo}") center/contain no-repeat; }
    .admin-header-actions { display: flex; align-items: center; gap: 18px; }
    header .lang-switch { color: #fff; }
    header .lang-switch button[aria-pressed="true"] { background: #d90b10; color: #fff; }
    html[dir="rtl"] .admin-sidebar { border-right: 0; border-left: 1px solid var(--line); }
    html[dir="rtl"] .admin-nav a { border-left: 0; border-right: 3px solid transparent; border-radius: 4px 0 0 4px; }
    html[dir="rtl"] .admin-nav a:hover, html[dir="rtl"] .admin-nav a:focus-visible, html[dir="rtl"] .admin-nav a.active { border-right-color: var(--green); }
    html[dir="rtl"] th, html[dir="rtl"] td { text-align: right; }
    @media(max-width:600px) { header { flex-wrap: wrap; } .admin-logo { width: 105px; height: 40px; } .admin-header-brand { gap: 8px; } .admin-header-actions { gap: 8px; } }
  </style>\n<script>\n${adminI18n}</script>\n</head>`]
  ];
  for (const [search, replacement] of adminReplacements) {
    if (!admin.includes(search)) throw new Error(`admin.html : code introuvable, mettre à jour sync.js : ${search}`);
    admin = admin.replace(search, () => replacement);
  }
  return admin;
}

function renderLiveAdmin() {
  const i18n = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
  const logo = `data:image/jpeg;base64,${fs.readFileSync(path.join(OUT, 'assets', 'logo.jpg')).toString('base64')}`;
  return renderAdmin({ i18n, logo });
}

if (require.main === module) {
  const envFile = path.join(ROOT, '.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const { storageFromEnvironment } = require('../storage');
  (async () => {
    const storage = storageFromEnvironment(ROOT);
    try {
      await storage.ready();
      const snapshot = await readSnapshot(storage);
      generate({ ...snapshot, siteUrl: process.argv[2] || process.env.SITE_URL });
      console.log('index.html généré (fichier unique)');
      console.log('allani/index.html généré (démo interactive sans backend)');
      console.log('info/index.html et qr/ générés (page liens + QR code)');
      if (!(process.argv[2] || process.env.SITE_URL || snapshot.settings.siteUrl)) console.warn('Attention : adresse du site non configurée, le QR code pointe vers une adresse d’exemple.');
    } finally {
      await storage.close();
    }
  })().catch(error => {
    console.error('Génération impossible :', error.message);
    process.exitCode = 1;
  });
}

module.exports = { generate, renderLiveSite, renderLiveInfoPage, renderLiveAdmin, renderWallpaper, readSnapshot, readSettings, readAnalytics, MEASUREMENT_ID_RE, DEFAULT_SETTINGS };
