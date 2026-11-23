const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

if (fs.existsSync(path.join(__dirname, '.env'))) process.loadEnvFile(path.join(__dirname, '.env'));

const express = require('express');
const multer = require('multer');
const Stripe = require('stripe');
const staticSite = require('./front-office/sync');
const { parseSocialUrl, normalizeProfile } = require('./social-links');
const { storageFromEnvironment, IMAGE_NAME_RE, uploadNameFromUrl } = require('./storage');

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const DEPOSIT_AMOUNT = Number(process.env.DEPOSIT_AMOUNT) || 500;
const DEPOSIT_CURRENCY = (process.env.DEPOSIT_CURRENCY || 'EUR').toUpperCase();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const MAMO_API = process.env.MAMO_ENV === 'production'
  ? 'https://business.mamopay.com/manage_api/v1'
  : 'https://sandbox.dev.business.mamopay.com/manage_api/v1';
const HOLD_MINUTES = 30;

if (ADMIN_PASSWORD.length < 12) console.warn('ADMIN_PASSWORD absent ou trop court (12 caractères min.) : espace admin désactivé.');

const storage = storageFromEnvironment(__dirname);
const readJson = name => storage.read(name);
const writeJson = (name, value) => storage.write(name, value);
const httpError = (status, message) => Object.assign(new Error(message), { status });

// ---------- Application ----------
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' });
  next();
});

// Le webhook Stripe doit recevoir le corps brut : déclaré avant express.json().
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.sendStatus(404);
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET); }
  catch { return res.sendStatus(400); }
  if (event.type === 'checkout.session.completed' && event.data.object.payment_status === 'paid') {
    const session = event.data.object;
    const reservation = await markPaid(
      r => r.provider === 'stripe' && (r.providerRef === session.id || r.id === session.metadata?.reservationId),
      session.payment_intent || session.id,
      session.id
    );
    if (!reservation) {
      console.error('Réservation introuvable pour une notification Stripe valide.');
      return res.sendStatus(503);
    }
  }
  res.json({ received: true });
});

app.use(express.json({ limit: '100kb' }));
app.get('/health', async (req, res) => {
  await readJson('static-site.json');
  res.set('Cache-Control', 'no-store').sendStatus(200);
});
app.get('/', async (req, res) => {
  const wallpaper = staticSite.readSettings(await readJson('static-site.json')).wallpaperImage;
  if (typeof wallpaper !== 'string') throw new Error('Image de fond invalide dans les réglages du site.');
  if (!wallpaper) return res.sendFile(path.join(__dirname, 'index.html'));
  uploadNameFromUrl(wallpaper);
  const html = await fsp.readFile(path.join(__dirname, 'index.html'), 'utf8');
  res.type('html').send(staticSite.renderWallpaper(html, wallpaper));
});
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/allani', (req, res) => res.set('Cache-Control', 'no-store').type('html').send(staticSite.renderLiveAdmin()));
app.get('/i18n.js', (req, res) => res.sendFile(path.join(__dirname, 'i18n.js')));
app.get('/social-links.js', (req, res) => res.sendFile(path.join(__dirname, 'social-links.js')));
app.get('/share/:id', async (req, res) => {
  const car = (await readJson('cars.json')).find(item => item.id === req.params.id);
  if (!car) return res.status(404).send('Véhicule introuvable.');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const title = `${car.name} · ALLANI Auto`;
  const description = `${car.trim || car.name} · ${car.year} · ${Number(car.price).toLocaleString('fr-FR')} TND. Découvrez ce véhicule chez ALLANI Auto.`;
  const image = /^\/uploads\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(car.image || '')
    ? `${BASE_URL}${car.image}`
    : `https://images.unsplash.com/${encodeURIComponent(car.image || 'photo-1492144534655-ae79c964c9d7')}?auto=format&fit=crop&w=1200&q=85`;
  const shareUrl = `${BASE_URL}/share/${encodeURIComponent(car.id)}`;
  const vehicleUrl = `${BASE_URL}/?screen=vehicule&id=${encodeURIComponent(car.id)}`;
  res.set('Cache-Control', 'public, max-age=300').type('html').send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta property="og:type" content="website"><meta property="og:locale" content="fr_FR"><meta property="og:site_name" content="ALLANI Auto"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:image" content="${escapeHtml(image)}"><meta property="og:url" content="${escapeHtml(shareUrl)}"><meta name="twitter:card" content="summary_large_image"><meta http-equiv="refresh" content="0;url=${escapeHtml(vehicleUrl)}"><title>${escapeHtml(title)}</title></head><body><p><a href="${escapeHtml(vehicleUrl)}">Ouvrir la fiche ${escapeHtml(car.name)}</a></p></body></html>`);
});
app.get('/uploads/:name', async (req, res) => {
  if (!IMAGE_NAME_RE.test(req.params.name)) return res.sendStatus(404);
  const image = await storage.getUpload(req.params.name);
  if (!image) return res.sendStatus(404);
  res.set('Cache-Control', 'public, max-age=604800, immutable').type(image.mimeType).send(image.bytes);
});

// ---------- Authentification admin ----------
const sessions = new Map();
const loginAttempts = new Map();
const SESSION_MS = 8 * 60 * 60 * 1000;
const sha = value => crypto.createHash('sha256').update(String(value)).digest();
const cookieSecure = BASE_URL.startsWith('https://');

function readCookie(req, name) {
  const match = (req.headers.cookie || '').split(';').map(part => part.trim().split('=')).find(([key]) => key === name);
  return match ? decodeURIComponent(match[1] || '') : null;
}
function requireAdmin(req, res, next) {
  const token = readCookie(req, 'admin_session');
  const expires = token && sessions.get(token);
  if (!expires || expires < Date.now()) { if (token) sessions.delete(token); return res.status(401).json({ error: 'Non autorisé' }); }
  next();
}

app.post('/api/admin/login', (req, res) => {
  if (ADMIN_PASSWORD.length < 12) return res.status(503).json({ error: 'ADMIN_PASSWORD non configuré sur le serveur.' });
  const ip = req.ip;
  const attempt = loginAttempts.get(ip) || { count: 0, until: 0 };
  if (attempt.until > Date.now()) return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
  if (!crypto.timingSafeEqual(sha(req.body?.password || ''), sha(ADMIN_PASSWORD))) {
    attempt.count += 1;
    if (attempt.count >= 5) { attempt.until = Date.now() + 15 * 60 * 1000; attempt.count = 0; }
    loginAttempts.set(ip, attempt);
    return res.status(401).json({ error: 'Mot de passe incorrect.' });
  }
  loginAttempts.delete(ip);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_MS);
  res.set('Set-Cookie', `admin_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${cookieSecure ? '; Secure' : ''}`);
  res.json({ ok: true });
});
app.post('/api/admin/logout', (req, res) => {
  sessions.delete(readCookie(req, 'admin_session'));
  res.set('Set-Cookie', 'admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});
app.get('/api/admin/me', requireAdmin, (req, res) => res.json({ ok: true }));

// ---------- Véhicules ----------
const IMAGE_TYPES = {
  'image/jpeg': { ext: '.jpg', check: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: '.png', check: b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { ext: '.webp', check: b => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' }
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => cb(null, Boolean(IMAGE_TYPES[file.mimetype]))
});
const wallpaperUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!IMAGE_TYPES[file.mimetype]) return cb(httpError(400, 'Format d’image invalide (JPG, PNG ou WebP).'));
    cb(null, true);
  }
});

async function saveImages(files = []) {
  for (const file of files) {
    const type = IMAGE_TYPES[file.mimetype];
    if (!type || !type.check(file.buffer)) throw httpError(400, 'Format d’image invalide (JPG, PNG ou WebP).');
  }
  const urls = [];
  try {
    for (const file of files) {
      const name = crypto.randomBytes(12).toString('hex') + IMAGE_TYPES[file.mimetype].ext;
      await storage.putUpload(name, file.mimetype, file.buffer);
      urls.push('/uploads/' + name);
    }
  } catch (error) {
    await discardImages(urls);
    throw error;
  }
  return urls;
}

async function deleteImages(urls = []) {
  const names = urls.filter(url => typeof url === 'string' && url.startsWith('/uploads/'))
    .map(url => url.slice('/uploads/'.length))
    .filter(name => IMAGE_NAME_RE.test(name));
  await storage.deleteUploads([...new Set(names)]);
}

async function discardImages(urls) {
  try { await deleteImages(urls); }
  catch (error) { console.error('Suppression des nouvelles photos impossible :', error.message); }
}

function unusedImages(cars, urls, wallpaperImage) {
  const used = new Set(cars.flatMap(car => [car.image, ...(Array.isArray(car.images) ? car.images : [])]));
  if (wallpaperImage) used.add(wallpaperImage);
  return urls.filter(url => !used.has(url));
}

const FUELS = ['Essence', 'Diesel', 'Hybride', 'Électrique'];
const ORIGINS = ['France', 'Dubaï'];
const KINDS = ['neuf', 'occasion'];
const STATUSES = ['available', 'reserved', 'sold'];
const text = (value, max = 80) => String(value ?? '').trim().slice(0, max);

function validateCar(body) {
  const car = {
    brand: text(body.brand, 40), name: text(body.name), trim: text(body.trim),
    year: Number(body.year), km: text(body.km, 20) || '0', fuel: body.fuel, origin: body.origin,
    kind: body.kind, price: Number(body.price), power: text(body.power, 20), status: body.status || 'available'
  };
  const errors = [];
  if (!car.brand || !car.name) errors.push('Marque et modèle obligatoires.');
  if (!Number.isInteger(car.year) || car.year < 1950 || car.year > 2100) errors.push('Année invalide.');
  if (!Number.isFinite(car.price) || car.price <= 0) errors.push('Prix invalide.');
  if (!FUELS.includes(car.fuel)) errors.push('Motorisation invalide.');
  if (!ORIGINS.includes(car.origin)) errors.push('Provenance invalide.');
  if (!KINDS.includes(car.kind)) errors.push('État invalide.');
  if (!STATUSES.includes(car.status)) errors.push('Statut invalide.');
  return { car, errors };
}
const slug = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

app.get('/api/cars', async (req, res) => res.json(await readJson('cars.json')));

app.post('/api/admin/cars', requireAdmin, upload.array('photos', 10), async (req, res) => {
  const { car, errors } = validateCar(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  if (!req.files?.length) return res.status(400).json({ error: 'Ajoutez au moins une photo.' });
  car.id = `${slug(car.name) || 'vehicule'}-${crypto.randomBytes(3).toString('hex')}`;
  car.images = await saveImages(req.files);
  car.image = car.images[0];
  try {
    await storage.change(['cars.json'], documents => { documents['cars.json'].unshift(car); });
  } catch (error) {
    await discardImages(car.images);
    throw error;
  }
  res.status(201).json(car);
});

app.put('/api/admin/cars/:id', requireAdmin, upload.array('photos', 10), async (req, res) => {
  if (!(await readJson('cars.json')).some(car => car.id === req.params.id)) return res.status(404).json({ error: 'Véhicule introuvable.' });
  const { car, errors } = validateCar(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  const newImages = req.files?.length ? await saveImages(req.files) : null;
  let result;
  try {
    result = await storage.change(['cars.json', 'static-site.json'], documents => {
      const cars = documents['cars.json'];
      const index = cars.findIndex(item => item.id === req.params.id);
      if (index < 0) throw httpError(404, 'Véhicule introuvable.');
      const previous = cars[index];
      const images = newImages || previous.images || [];
      cars[index] = { ...previous, ...car, id: previous.id, images, image: images[0] || previous.image };
      const oldImages = newImages ? [previous.image, ...(previous.images || [])] : [];
      return { car: cars[index], obsolete: unusedImages(cars, oldImages, documents['static-site.json'].wallpaperImage) };
    });
  } catch (error) {
    if (newImages) await discardImages(newImages);
    throw error;
  }
  await deleteImages(result.obsolete);
  res.json(result.car);
});

app.delete('/api/admin/cars/:id', requireAdmin, async (req, res) => {
  const obsolete = await storage.change(['cars.json', 'static-site.json'], documents => {
    const cars = documents['cars.json'];
    const index = cars.findIndex(item => item.id === req.params.id);
    if (index < 0) throw httpError(404, 'Véhicule introuvable.');
    const [car] = cars.splice(index, 1);
    return unusedImages(cars, [car.image, ...(car.images || [])], documents['static-site.json'].wallpaperImage);
  });
  await deleteImages(obsolete);
  res.json({ ok: true });
});

// ---------- Réseaux sociaux ----------
const DEMO_SOCIAL_URLS = new Set([
  'https://www.instagram.com/p/Ddlr-iqmz4O/',
  'https://www.facebook.com/facebook/'
]);

app.get('/api/social', async (req, res) => res.json(await readJson('social.json')));

app.put('/api/admin/social', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const requestedPosts = body.posts ?? [];
  if (!Array.isArray(requestedPosts) || requestedPosts.length > 24) return res.status(400).json({ error: 'Ajoutez au maximum 24 publications.' });
  const posts = [];
  for (const raw of requestedPosts) {
    const post = parseSocialUrl(raw);
    if (!post) return res.status(400).json({ error: `Lien non reconnu : ${text(raw, 120)}` });
    if (DEMO_SOCIAL_URLS.has(post.url)) post.demo = true;
    posts.push(post);
  }
  const username = normalizeProfile('instagram', body.instagramUsername);
  if (username === null) return res.status(400).json({ error: 'Nom d’utilisateur ou lien Instagram invalide.' });
  const tiktokUsername = normalizeProfile('tiktok', body.tiktokUsername);
  if (tiktokUsername === null) return res.status(400).json({ error: 'Nom d’utilisateur ou lien TikTok invalide.' });
  const facebookUrl = normalizeProfile('facebook', body.facebookUrl);
  if (facebookUrl === null) return res.status(400).json({ error: 'Lien de page Facebook invalide.' });
  const livePlatform = body.live?.platform || 'instagram';
  if (!['instagram', 'facebook', 'tiktok'].includes(livePlatform)) return res.status(400).json({ error: 'Plateforme du live invalide.' });
  const live = { active: Boolean(body.live?.active), platform: livePlatform, url: '', embed: '' };
  if (live.active && live.platform === 'facebook') {
    const parsed = parseSocialUrl(body.live?.url);
    if (!parsed || parsed.platform !== 'facebook') return res.status(400).json({ error: 'Pour un live Facebook, collez le lien de la vidéo en direct.' });
    live.url = parsed.url;
    live.embed = parsed.embed.replace('show_text=false', 'show_text=false&autoplay=true');
  }
  if (live.active && live.platform === 'instagram') {
    if (!username) return res.status(400).json({ error: 'Renseignez le compte Instagram pour annoncer le live.' });
    live.url = `https://www.instagram.com/${username}/live/`;
  }
  if (live.active && live.platform === 'tiktok') {
    if (!tiktokUsername) return res.status(400).json({ error: 'Renseignez le compte TikTok pour annoncer le live.' });
    live.url = `https://www.tiktok.com/@${tiktokUsername}/live`;
  }
  const social = { instagramUsername: username, facebookUrl, tiktokUsername, posts, live };
  await writeJson('social.json', social);
  res.json(social);
});

// ---------- Site vitrine statique (front-office/) ----------
const STATIC_INDEX = path.join(__dirname, 'front-office', 'index.html');
async function staticSiteStatus() {
  let stat;
  try { stat = await fsp.stat(STATIC_INDEX); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return { settings: staticSite.readSettings(await readJson('static-site.json')), generatedAt: stat ? stat.mtime.toISOString() : null };
}
async function regenerateStaticSite() {
  try { staticSite.generate(await staticSite.readSnapshot(storage)); }
  catch (error) {
    console.error(error);
    throw Object.assign(new Error('La régénération du site vitrine a échoué (voir les journaux du serveur).'), { status: 500 });
  }
}
const PHONE_RE = /^\+?\d{6,15}$/;

app.get('/api/admin/static-site', requireAdmin, async (req, res) => res.json(await staticSiteStatus()));

app.put('/api/admin/static-site', requireAdmin, wallpaperUpload.single('wallpaper'), async (req, res) => {
  const body = req.body || {};
  const title = text(body.title, 120);
  const description = text(body.description, 300);
  if (!title || !description) return res.status(400).json({ error: 'Titre et description requis.' });
  if (body.resetWallpaper !== undefined && ![true, false, 'true', 'false'].includes(body.resetWallpaper)) {
    return res.status(400).json({ error: 'Choix de l’image de fond invalide.' });
  }
  const resetWallpaper = body.resetWallpaper === true || body.resetWallpaper === 'true';
  if (resetWallpaper && req.file) return res.status(400).json({ error: 'Choisissez une image ou l’image par défaut, pas les deux.' });
  let siteUrl = '';
  if (body.siteUrl) {
    try {
      const url = new URL(text(body.siteUrl, 200));
      if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash || url.username || url.password) throw 0;
      siteUrl = url.href.replace(/\/$/, '');
    } catch { return res.status(400).json({ error: 'Adresse du site invalide (ex. https://prime-cars.netlify.app).' }); }
  }
  const contact = req.is('multipart/form-data') ? body : body.contact || {};
  const phone = text(contact.phone, 30).replace(/[\s().-]/g, '');
  const whatsapp = text(contact.whatsapp, 30).replace(/[\s().-]/g, '') || phone;
  const phoneDisplay = text(contact.phoneDisplay, 30) || phone;
  const email = text(contact.email, 120);
  if (!PHONE_RE.test(phone)) return res.status(400).json({ error: 'Numéro de téléphone invalide (ex. +971543280723).' });
  if (!PHONE_RE.test(whatsapp)) return res.status(400).json({ error: 'Numéro WhatsApp invalide (ex. +971543280723).' });
  if (!/^[+\d\s().-]+$/.test(phoneDisplay)) return res.status(400).json({ error: 'Numéro affiché invalide : chiffres, espaces, +, -, ( ) uniquement.' });
  if (!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email)) return res.status(400).json({ error: 'Adresse e-mail invalide.' });
  const newImages = req.file ? await saveImages([req.file]) : [];
  try {
    await storage.change(['static-site.json'], documents => {
      const previous = documents['static-site.json'];
      documents['static-site.json'] = {
        ...previous, siteUrl, title, description, contact: { phone, phoneDisplay, whatsapp, email },
        wallpaperImage: newImages[0] || (resetWallpaper ? '' : previous.wallpaperImage || '')
      };
    });
  } catch (error) {
    await discardImages(newImages);
    throw error;
  }
  await regenerateStaticSite();
  res.json(await staticSiteStatus());
});

app.post('/api/admin/static-site/publish', requireAdmin, async (req, res) => {
  await regenerateStaticSite();
  res.json(await staticSiteStatus());
});

app.get('/api/admin/analytics', requireAdmin, async (req, res) => res.json(staticSite.readAnalytics(await readJson('analytics.json'))));

app.put('/api/admin/analytics', requireAdmin, async (req, res) => {
  const measurementId = text(req.body?.measurementId, 20).toUpperCase();
  if (measurementId && !staticSite.MEASUREMENT_ID_RE.test(measurementId)) return res.status(400).json({ error: 'ID de mesure invalide : format G-XXXXXXXXXX (Google Analytics 4).' });
  await writeJson('analytics.json', { measurementId });
  await regenerateStaticSite();
  res.json(staticSite.readAnalytics(await readJson('analytics.json')));
});

// ---------- Réservation (acompte) ----------
async function markPaid(predicate, providerPaymentId, checkoutRef) {
  return storage.change(['cars.json', 'reservations.json'], documents => {
    const reservation = documents['reservations.json'].find(predicate);
    if (!reservation) return null;
    if (reservation.status !== 'paid') {
      reservation.status = 'paid';
      reservation.paidAt = new Date().toISOString();
      reservation.providerPaymentId = providerPaymentId;
    }
    if (checkoutRef && !reservation.providerRef) reservation.providerRef = checkoutRef;
    const car = documents['cars.json'].find(item => item.id === reservation.carId);
    if (car && car.status === 'available') car.status = 'reserved';
    return reservation;
  });
}

async function mamo(pathname, options = {}) {
  const response = await fetch(MAMO_API + pathname, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MAMO_API_KEY}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Mamo Pay ${response.status}: ${(data.errors || data.messages || []).join(', ')}`);
  return data;
}

app.get('/api/payment-config', (req, res) => res.json({
  amount: DEPOSIT_AMOUNT, currency: DEPOSIT_CURRENCY,
  providers: { stripe: Boolean(stripe), mamo: Boolean(process.env.MAMO_API_KEY) }
}));

app.post('/api/reserve', async (req, res) => {
  const { carId, provider } = req.body || {};
  const customer = { name: text(req.body?.name, 80), email: text(req.body?.email, 120), phone: text(req.body?.phone, 30) };
  if (!customer.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return res.status(400).json({ error: 'Nom et e-mail valides requis.' });
  if (provider === 'stripe' && !stripe) return res.status(400).json({ error: 'Stripe n’est pas configuré.' });
  if (provider === 'mamo' && !process.env.MAMO_API_KEY) return res.status(400).json({ error: 'Mamo Pay n’est pas configuré.' });
  if (!['stripe', 'mamo'].includes(provider)) return res.status(400).json({ error: 'Moyen de paiement inconnu.' });

  const reservation = { id: crypto.randomUUID(), carId, provider, ...customer, amount: DEPOSIT_AMOUNT, currency: DEPOSIT_CURRENCY, status: 'pending', createdAt: new Date().toISOString() };
  const car = await storage.change(['cars.json', 'reservations.json'], documents => {
    const selected = documents['cars.json'].find(item => item.id === carId);
    if (!selected) throw httpError(404, 'Véhicule introuvable.');
    if (selected.status !== 'available') throw httpError(409, 'Ce véhicule est déjà réservé.');
    const holdLimit = Date.now() - HOLD_MINUTES * 60 * 1000;
    if (documents['reservations.json'].some(r => r.carId === carId && r.status === 'pending' && Date.parse(r.createdAt) > holdLimit)) {
      throw httpError(409, 'Un paiement est déjà en cours pour ce véhicule. Réessayez dans quelques minutes.');
    }
    reservation.carName = selected.name;
    documents['reservations.json'].push(reservation);
    return selected;
  });
  const returnUrl = `${BASE_URL}/?screen=vehicule&id=${encodeURIComponent(car.id)}&payment=${provider}`;
  try {
    if (provider === 'stripe') {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: customer.email,
        line_items: [{ quantity: 1, price_data: { currency: DEPOSIT_CURRENCY.toLowerCase(), unit_amount: Math.round(DEPOSIT_AMOUNT * 100), product_data: { name: `Acompte de réservation — ${car.name}` } } }],
        metadata: { reservationId: reservation.id, carId: car.id },
        expires_at: Math.floor(Date.now() / 1000) + HOLD_MINUTES * 60,
        success_url: `${returnUrl}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${returnUrl}&cancelled=1`
      }, { idempotencyKey: reservation.id });
      reservation.providerRef = session.id;
      reservation.checkoutUrl = session.url;
    } else {
      const [firstName, ...rest] = customer.name.split(' ');
      const link = await mamo('/links', {
        method: 'POST',
        body: JSON.stringify({
          title: `Acompte ${car.name}`.slice(0, 50),
          description: 'Réservation du véhicule — ALLANI Auto'.slice(0, 75),
          amount: DEPOSIT_AMOUNT, amount_currency: DEPOSIT_CURRENCY, capacity: 1,
          return_url: returnUrl, failure_return_url: `${returnUrl}&cancelled=1`,
          external_id: reservation.id, first_name: firstName, last_name: rest.join(' ') || firstName, email: customer.email,
          ...(customer.phone ? { phone_number: customer.phone } : {})
        })
      });
      reservation.providerRef = link.id;
      reservation.checkoutUrl = link.payment_url;
    }
  } catch (error) {
    console.error(error);
    await storage.change(['reservations.json'], documents => {
      const saved = documents['reservations.json'].find(item => item.id === reservation.id);
      if (saved && saved.status === 'pending') {
        saved.status = 'failed';
        saved.failedAt = new Date().toISOString();
      }
    });
    return res.status(502).json({ error: 'Le service de paiement est indisponible. Réessayez plus tard.' });
  }
  await storage.change(['reservations.json'], documents => {
    const saved = documents['reservations.json'].find(item => item.id === reservation.id);
    if (!saved) throw new Error('Réservation créée mais introuvable dans le stockage.');
    saved.providerRef = reservation.providerRef;
    saved.checkoutUrl = reservation.checkoutUrl;
  });
  res.json({ url: reservation.checkoutUrl });
});

// Vérifie le paiement côté serveur au retour du client (les paramètres d'URL ne sont pas fiables).
app.post('/api/reserve/confirm', async (req, res) => {
  const { provider, sessionId, transactionId } = req.body || {};
  try {
    if (provider === 'stripe' && stripe && typeof sessionId === 'string') {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid') {
        const reservation = await markPaid(
          r => r.provider === 'stripe' && (r.providerRef === session.id || r.id === session.metadata?.reservationId),
          session.payment_intent,
          session.id
        );
        if (reservation) return res.json({ paid: true, carId: reservation.carId });
      }
    }
    if (provider === 'mamo' && process.env.MAMO_API_KEY && /^[\w-]+$/.test(transactionId || '')) {
      const payment = await mamo(`/payments/${transactionId}`);
      if (payment.status === 'captured') {
        const reservation = await markPaid(r => r.provider === 'mamo' && r.providerRef === payment.payment_link_id, payment.id);
        if (reservation) return res.json({ paid: true, carId: reservation.carId });
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: 'La vérification du paiement est indisponible. Réessayez plus tard.' });
  }
  res.json({ paid: false });
});

app.get('/api/admin/reservations', requireAdmin, async (req, res) => {
  const reservations = await readJson('reservations.json');
  res.json(reservations.map(({ checkoutUrl, ...rest }) => rest).reverse());
});

app.get('/api/admin/appointments', requireAdmin, async (req, res) => {
  const appointments = await readJson('appointments.json');
  res.json(appointments.sort((first, second) => Date.parse(first.date) - Date.parse(second.date)));
});

app.post('/api/admin/appointments', requireAdmin, async (req, res) => {
  const date = new Date(req.body?.date);
  const name = text(req.body?.name, 80);
  const email = text(req.body?.email, 120);
  const phone = text(req.body?.phone, 30);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return res.status(400).json({ error: 'Choisissez une date future valide.' });
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Nom et e-mail valides requis.' });
  const appointment = await storage.change(['cars.json', 'appointments.json'], documents => {
    const car = documents['cars.json'].find(item => item.id === req.body?.carId);
    if (!car) throw httpError(400, 'Choisissez un véhicule existant.');
    const item = {
      id: crypto.randomUUID(), carId: car.id, carName: car.name, date: date.toISOString(),
      name, email, phone, note: text(req.body?.note, 300), status: 'planned', createdAt: new Date().toISOString()
    };
    documents['appointments.json'].push(item);
    return item;
  });
  res.status(201).json(appointment);
});

app.patch('/api/admin/appointments/:id', requireAdmin, async (req, res) => {
  const statuses = ['planned', 'confirmed', 'completed', 'cancelled'];
  if (!statuses.includes(req.body?.status)) return res.status(400).json({ error: 'Statut de rendez-vous invalide.' });
  const appointment = await storage.change(['appointments.json'], documents => {
    const item = documents['appointments.json'].find(entry => entry.id === req.params.id);
    if (!item) throw httpError(404, 'Rendez-vous introuvable.');
    item.status = req.body.status;
    return item;
  });
  res.json(appointment);
});

app.delete('/api/admin/appointments/:id', requireAdmin, async (req, res) => {
  await storage.change(['appointments.json'], documents => {
    const appointments = documents['appointments.json'];
    const index = appointments.findIndex(item => item.id === req.params.id);
    if (index < 0) throw httpError(404, 'Rendez-vous introuvable.');
    appointments.splice(index, 1);
  });
  res.json({ ok: true });
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Photo trop lourde (8 Mo max).' : 'Envoi des photos invalide.' });
  if (error.status) return res.status(error.status).json({ error: error.message });
  console.error(error);
  res.status(500).json({ error: 'Erreur serveur.' });
});

async function start() {
  if (process.env.NODE_ENV === 'production') {
    if (storage.kind !== 'postgres') throw new Error('Production : configurez DATABASE_URL ou DATABASE_URL_POOLED.');
    if (ADMIN_PASSWORD.length < 12) throw new Error('Production : configurez ADMIN_PASSWORD (12 caractères min.).');
    let publicUrl;
    try { publicUrl = new URL(BASE_URL); } catch { throw new Error('Production : BASE_URL doit être une URL HTTPS valide.'); }
    if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password || publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash) {
      throw new Error('Production : BASE_URL doit être une origine HTTPS valide.');
    }
  }
  await storage.ready();
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      server.off('error', reject);
      console.log(`ALLANI Auto : ${BASE_URL}  —  admin : ${BASE_URL}/admin (${storage.kind})`);
      resolve(server);
    });
    server.once('error', reject);
  });
}

if (require.main === module) {
  start().catch(async error => {
    console.error('Démarrage impossible :', error.message);
    if (error.cause) console.error(error.cause.message);
    await storage.close();
    process.exitCode = 1;
  });
}

module.exports = { app, start, storage };
