const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { Connection } = require('postgrejs');
const Stripe = require('stripe');

const root = path.join(__dirname, '..');
const databaseUrl = process.env.TEST_DATABASE_URL;
const pooledUrl = process.env.TEST_DATABASE_URL_POOLED || databaseUrl;
const execFileAsync = promisify(execFile);
const fixtureFiles = [
  'server.js', 'storage.js', 'admin.html', 'index.html', 'i18n.js', 'social-links.js',
  'front-office/sync.js', 'front-office/admin-i18n.js', 'front-office/contact.js',
  'front-office/analytics.js', 'front-office/demo-admin.js', 'front-office/assets/logo.jpg'
];

test('empty catalog seed skips local cars and leaves initialized databases untouched', async t => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'empty-catalog-test-'));
  t.after(() => fs.rm(fixture, { recursive: true, force: true }));
  await fs.writeFile(path.join(fixture, 'social.json'), JSON.stringify({ posts: [], live: { active: false } }));
  const documents = new Map();
  t.mock.method(Connection.prototype, 'connect', async () => {});
  t.mock.method(Connection.prototype, 'close', async () => {});
  t.mock.method(Connection.prototype, 'query', async (sql, options = {}) => {
    if (sql.startsWith('SELECT name FROM')) return { rows: [...documents.keys()].map(name => ({ name })) };
    if (sql.startsWith('INSERT INTO') && sql.includes('::jsonb')) {
      documents.set(options.params[0], JSON.parse(options.params[1]));
    }
    return { rows: [] };
  });
  const storage = require('../storage').createStorage({
    databaseUrl: 'postgres://localhost/example', dataDir: fixture, uploadDir: fixture
  });
  try {
    assert.equal((await storage.seed({ emptyCatalog: true })).imported, true);
    assert.deepEqual(documents.get('cars.json'), []);
    documents.set('cars.json', [{ id: 'existing' }]);
    assert.equal((await storage.seed({ emptyCatalog: true })).imported, false);
    assert.deepEqual(documents.get('cars.json'), [{ id: 'existing' }]);
  } finally {
    await storage.close();
  }
});

test('PostgreSQL persists application data, photos, concurrent writes and static exports', {
  skip: databaseUrl ? false : 'Set TEST_DATABASE_URL to run the isolated PostgreSQL integration test.',
  timeout: 180000
}, async t => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'prime-cars-postgres-'));
  const schema = `prime_cars_test_${crypto.randomBytes(8).toString('hex')}`;
  const connection = new Connection(databaseUrl);
  const envKeys = [
    'DATABASE_URL', 'DATABASE_URL_POOLED', 'DATABASE_SCHEMA', 'DATA_DIR', 'UPLOAD_DIR',
    'PORT', 'BASE_URL', 'ADMIN_PASSWORD', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
    'MAMO_API_KEY', 'MAMO_ENV', 'NODE_PATH'
  ];
  const previousEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  let createdSchema = false;
  let server;
  let storage;
  const nativeFetch = global.fetch;

  t.after(async () => {
    global.fetch = nativeFetch;
    try {
      if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    } finally {
      try {
        if (storage) await storage.close();
      } finally {
        try {
          if (createdSchema) await connection.query(`DROP SCHEMA "${schema}" CASCADE`);
        } finally {
          await connection.close();
          for (const [key, value] of Object.entries(previousEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
          }
          Module._initPaths();
          await fs.rm(fixture, { recursive: true, force: true });
        }
      }
    }
  });

  await Promise.all(fixtureFiles.map(async file => {
    const destination = path.join(fixture, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(path.join(root, file), destination);
  }));
  const dataDir = path.join(fixture, 'data');
  const uploadDir = path.join(fixture, 'uploads');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(uploadDir, { recursive: true });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64');
  const seededImage = `${'a'.repeat(24)}.png`;
  const seededWallpaper = `${'b'.repeat(24)}.png`;
  const seedCar = {
    id: 'seed-car', brand: 'Test', name: 'Seed Car', year: 2025, km: '1000',
    price: 12000, fuel: 'Essence', origin: 'France', kind: 'occasion', status: 'available',
    image: `/uploads/${seededImage}`, images: [`/uploads/${seededImage}`]
  };
  await fs.writeFile(path.join(dataDir, 'cars.json'), JSON.stringify([seedCar]));
  await fs.writeFile(path.join(dataDir, 'social.json'), JSON.stringify({ posts: [], live: { active: false } }));
  await fs.writeFile(path.join(dataDir, 'static-site.json'), JSON.stringify({ wallpaperImage: `/uploads/${seededWallpaper}` }));
  await fs.writeFile(path.join(uploadDir, seededImage), png);
  await fs.writeFile(path.join(uploadDir, seededWallpaper), png);

  await connection.connect();
  await connection.query(`CREATE SCHEMA "${schema}"`);
  createdSchema = true;
  Object.assign(process.env, {
    DATABASE_URL: databaseUrl,
    DATABASE_URL_POOLED: pooledUrl,
    DATABASE_SCHEMA: schema,
    DATA_DIR: dataDir,
    UPLOAD_DIR: uploadDir,
    PORT: '0',
    BASE_URL: 'http://127.0.0.1',
    ADMIN_PASSWORD: 'isolated-database-test-password',
    STRIPE_SECRET_KEY: 'sk_test_local_only',
    STRIPE_WEBHOOK_SECRET: 'whsec_local_only',
    MAMO_API_KEY: 'local-test-only',
    MAMO_ENV: 'sandbox',
    NODE_PATH: [path.join(root, 'node_modules'), previousEnv.NODE_PATH].filter(Boolean).join(path.delimiter)
  });
  Module._initPaths();
  const application = require(path.join(fixture, 'server.js'));
  storage = application.storage;
  assert.equal((await storage.seed()).imported, true);
  assert.equal((await storage.seed()).imported, false);
  assert.equal((await storage.seed({ emptyCatalog: true })).imported, false);
  assert.equal((await storage.read('cars.json'))[0].id, seedCar.id);
  const emptySchema = `${schema}_empty`;
  await connection.query(`CREATE SCHEMA "${emptySchema}"`);
  const emptyStorage = require(path.join(fixture, 'storage.js')).createStorage({
    databaseUrl, pooledUrl, schema: emptySchema, dataDir, uploadDir
  });
  try {
    assert.equal((await emptyStorage.seed({ emptyCatalog: true })).imported, true);
    assert.deepEqual(await emptyStorage.read('cars.json'), []);
    assert.equal(await emptyStorage.getUpload(seededImage), null);
    assert.deepEqual((await emptyStorage.getUpload(seededWallpaper)).bytes, png);
  } finally {
    await emptyStorage.close();
    await connection.query(`DROP SCHEMA "${emptySchema}" CASCADE`);
  }
  await fs.writeFile(path.join(dataDir, 'cars.json'), '[]');
  await fs.unlink(path.join(uploadDir, seededImage));
  await fs.unlink(path.join(uploadDir, seededWallpaper));
  server = await application.start();
  const base = `http://127.0.0.1:${server.address().port}`;
  let linkCount = 0;
  let failNextLink = false;
  let lastLink;
  global.fetch = async (input, options) => {
    const url = String(input);
    if (url.startsWith(`${base}/`)) return nativeFetch(input, options);
    if (url === 'https://sandbox.dev.business.mamopay.com/manage_api/v1/links') {
      if (failNextLink) {
        failNextLink = false;
        return new Response(JSON.stringify({ errors: ['test failure'] }), { status: 503 });
      }
      linkCount += 1;
      lastLink = `link-${linkCount}`;
      await new Promise(resolve => setTimeout(resolve, 50));
      return Response.json({ id: lastLink, payment_url: `https://example.test/${lastLink}` });
    }
    if (url === 'https://sandbox.dev.business.mamopay.com/manage_api/v1/payments/transaction-1') {
      return Response.json({ status: 'captured', payment_link_id: lastLink, id: 'transaction-1' });
    }
    throw new Error('Unexpected external request during test.');
  };

  const seedCars = await (await fetch(`${base}/api/cars`)).json();
  assert.equal(seedCars[0].id, seedCar.id);
  const seedPhoto = await fetch(`${base}${seedCar.image}`);
  assert.equal(seedPhoto.status, 200);
  assert.deepEqual(Buffer.from(await seedPhoto.arrayBuffer()), png);
  assert.ok((await (await fetch(`${base}/`)).text()).includes(`/uploads/${seededWallpaper}`));
  assert.deepEqual(Buffer.from(await (await fetch(`${base}/uploads/${seededWallpaper}`)).arrayBuffer()), png);
  const adminPage = await fetch(`${base}/allani`);
  assert.equal(adminPage.status, 200);
  const adminHtml = await adminPage.text();
  const password = decodeURIComponent(new URL(databaseUrl).password);
  if (password) assert.equal(adminHtml.includes(password), false, 'Database credentials must not appear in the browser.');
  assert.equal((await fetch(`${base}/api/admin/me`)).status, 401);

  const login = await fetch(`${base}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD })
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const request = (url, options = {}) => fetch(base + url, {
    ...options, headers: { ...options.headers, Cookie: cookie }
  });

  const form = new FormData();
  for (const [key, value] of Object.entries({
    brand: 'Test', name: 'Database Test Car', year: '2025', km: '1000', price: '12000',
    fuel: 'Essence', origin: 'France', kind: 'occasion', status: 'available'
  })) form.append(key, value);
  form.append('photos', new Blob([png], { type: 'image/png' }), 'car.png');
  const created = await request('/api/admin/cars', { method: 'POST', body: form });
  assert.equal(created.status, 201);
  const car = await created.json();
  assert.equal((await fetch(base + car.image)).status, 200);
  assert.equal((await storage.getUpload(path.basename(car.image))).mimeType, 'image/png');

  const reserve = carId => fetch(`${base}/api/reserve`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ carId, provider: 'mamo', name: 'Test customer', email: 'test@example.com' })
  });
  const attempts = await Promise.all([reserve(car.id), reserve(car.id)]);
  assert.deepEqual(attempts.map(response => response.status).sort(), [200, 409]);
  assert.equal(linkCount, 1);
  const confirmed = await fetch(`${base}/api/reserve/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'mamo', transactionId: 'transaction-1' })
  });
  assert.equal((await confirmed.json()).paid, true);
  assert.equal((await storage.read('cars.json')).find(item => item.id === car.id).status, 'reserved');
  assert.equal((await storage.read('reservations.json'))[0].status, 'paid');

  failNextLink = true;
  assert.equal((await reserve(seedCar.id)).status, 502);
  assert.equal((await reserve(seedCar.id)).status, 200);
  assert.equal((await storage.read('reservations.json')).filter(item => item.carId === seedCar.id && item.status === 'failed').length, 1);

  const webhookReservationId = crypto.randomUUID();
  await storage.change(['reservations.json'], documents => {
    documents['reservations.json'].push({
      id: webhookReservationId, carId: seedCar.id, provider: 'stripe', status: 'pending', createdAt: new Date().toISOString()
    });
  });
  const payload = JSON.stringify({
    id: 'evt_local_test', type: 'checkout.session.completed',
    data: { object: {
      id: 'cs_test_local', payment_status: 'paid', payment_intent: 'pi_test_local',
      metadata: { reservationId: webhookReservationId }
    } }
  });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const webhook = await fetch(`${base}/api/webhooks/stripe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature }, body: payload
  });
  assert.equal(webhook.status, 200);
  const paidWebhook = (await storage.read('reservations.json')).find(item => item.id === webhookReservationId);
  assert.equal(paidWebhook.status, 'paid');
  assert.equal(paidWebhook.providerRef, 'cs_test_local');
  assert.equal((await storage.read('cars.json')).find(item => item.id === seedCar.id).status, 'reserved');

  const appointments = await Promise.all(Array.from({ length: 8 }, (_, index) => request('/api/admin/appointments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      carId: car.id, date: new Date(Date.now() + 86400000 + index * 60000).toISOString(),
      name: `Test customer ${index}`, email: `test${index}@example.com`
    })
  })));
  assert.deepEqual(appointments.map(response => response.status), Array(8).fill(201));
  assert.equal((await (await request('/api/admin/appointments')).json()).length, 8);

  const social = await request('/api/admin/social', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tiktokUsername: '@dbtest', posts: [], live: { active: false } })
  });
  assert.equal(social.status, 200);
  assert.equal((await (await fetch(`${base}/api/social`)).json()).tiktokUsername, 'dbtest');

  const settings = await request('/api/admin/static-site', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Database snapshot test', description: 'A database-backed snapshot.',
      siteUrl: 'https://example.test',
      contact: { phone: '+1234567890', phoneDisplay: '+1 234 567 890', whatsapp: '+1234567890', email: 'test@example.com' }
    })
  });
  assert.equal(settings.status, 200);
  assert.equal((await settings.json()).settings.wallpaperImage, `/uploads/${seededWallpaper}`);
  const siteForm = new FormData();
  for (const [key, value] of Object.entries({
    title: 'Database snapshot test', description: 'A database-backed snapshot.', siteUrl: 'https://example.test',
    phone: '+1234567890', phoneDisplay: '+1 234 567 890', whatsapp: '+1234567890', email: 'test@example.com'
  })) siteForm.set(key, value);
  siteForm.set('wallpaper', new Blob([png], { type: 'image/png' }), 'wallpaper.png');
  const wallpaperUpdate = await request('/api/admin/static-site', { method: 'PUT', body: siteForm });
  assert.equal(wallpaperUpdate.status, 200);
  const wallpaper = (await wallpaperUpdate.json()).settings.wallpaperImage;
  assert.match(wallpaper, /^\/uploads\/[a-f0-9]{24}\.png$/);
  assert.deepEqual((await storage.getUpload(path.basename(wallpaper))).bytes, png);
  assert.ok((await (await fetch(`${base}/`)).text()).includes(`<div class="hero"><img src="${wallpaper}" alt="">`));
  const analytics = await request('/api/admin/analytics', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ measurementId: 'G-TEST1234' })
  });
  assert.equal(analytics.status, 200);
  assert.equal((await (await request('/api/admin/analytics')).json()).measurementId, 'G-TEST1234');
  const snapshot = await fs.readFile(path.join(fixture, 'front-office', 'index.html'), 'utf8');
  assert.match(snapshot, /Database Test Car/);
  assert.match(snapshot, /Database snapshot test/);
  assert.match(snapshot, /G-TEST1234/);
  assert.ok(snapshot.includes(`<div class="hero"><img src="data:image/png;base64,${png.toString('base64')}" alt="">`));
  if (password) assert.equal(snapshot.includes(password), false, 'Database credentials must not appear in generated HTML.');
  assert.equal(await fs.readFile(path.join(dataDir, 'cars.json'), 'utf8'), '[]');

  await execFileAsync(process.execPath, [path.join(fixture, 'front-office', 'sync.js')], {
    env: process.env, timeout: 120000
  });
  assert.match(await fs.readFile(path.join(fixture, 'front-office', 'index.html'), 'utf8'), /Database Test Car/);
  assert.equal((await storage.seed()).imported, false);
  assert.equal((await storage.read('appointments.json')).length, 8);

  await assert.rejects(storage.change(['cars.json', 'social.json'], documents => {
    documents['cars.json'].length = 0;
    throw new Error('rollback test');
  }), /rollback test/);
  assert.ok((await storage.read('cars.json')).some(item => item.id === car.id));

  assert.equal((await request(`/api/admin/cars/${encodeURIComponent(car.id)}`, { method: 'DELETE' })).status, 200);
  assert.equal((await fetch(base + car.image)).status, 404);
  assert.equal(await storage.getUpload(path.basename(car.image)), null);
  await storage.change(['static-site.json'], documents => {
    documents['static-site.json'].wallpaperImage = seedCar.image;
  });
  const replacement = new FormData();
  for (const [key, value] of Object.entries({
    brand: seedCar.brand, name: seedCar.name, year: String(seedCar.year), km: seedCar.km,
    price: String(seedCar.price), fuel: seedCar.fuel, origin: seedCar.origin,
    kind: seedCar.kind, status: seedCar.status
  })) replacement.set(key, value);
  replacement.set('photos', new Blob([png], { type: 'image/png' }), 'replacement.png');
  assert.equal((await request(`/api/admin/cars/${encodeURIComponent(seedCar.id)}`, { method: 'PUT', body: replacement })).status, 200);
  assert.deepEqual((await storage.getUpload(seededImage)).bytes, png);
  assert.equal((await request(`/api/admin/cars/${encodeURIComponent(seedCar.id)}`, { method: 'DELETE' })).status, 200);
  assert.deepEqual((await storage.getUpload(seededImage)).bytes, png);
  assert.ok((await (await fetch(`${base}/`)).text()).includes(seedCar.image));
});
