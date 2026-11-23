const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const password = 'isolated-admin-test-password';
const fixtureFiles = [
  'server.js', 'storage.js', 'admin.html', 'index.html', 'i18n.js', 'social-links.js',
  'front-office/sync.js', 'front-office/admin-i18n.js', 'front-office/contact.js',
  'front-office/analytics.js', 'front-office/demo-admin.js', 'front-office/info-page.js', 'front-office/assets/logo.jpg'
];

async function unusedPort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}

test('production rejects unsafe configuration before opening a listener', () => {
  const env = { ...process.env, NODE_ENV: 'production', DATABASE_URL: '', DATABASE_URL_POOLED: '',
    ADMIN_PASSWORD: password, BASE_URL: 'https://example.com' };
  for (const [overrides, message] of [
    [{}, /DATABASE_URL/],
    [{ DATABASE_URL: 'postgres://localhost/example', ADMIN_PASSWORD: '' }, /ADMIN_PASSWORD/],
    [{ DATABASE_URL: 'postgres://localhost/example', BASE_URL: 'http://example.com' }, /BASE_URL/],
    [{ DATABASE_URL: 'postgres://localhost/example', BASE_URL: 'https://example.com/path' }, /BASE_URL/]
  ]) {
    const result = spawnSync(process.execPath, [path.join(root, 'server.js')], {
      cwd: root, env: { ...env, ...overrides }, encoding: 'utf8', timeout: 10000
    });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, message);
  }
});

test('Node /allani is authenticated and editable; the static snapshot uses an isolated demo', async t => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'allani-admin-test-'));
  let server;
  t.after(async () => {
    if (server && server.exitCode === null && server.signalCode === null) {
      const exited = new Promise(resolve => server.once('exit', resolve));
      server.kill();
      await exited;
    }
    await fs.rm(fixture, { recursive: true, force: true });
  });
  for (const file of fixtureFiles) {
    const destination = path.join(fixture, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(path.join(root, file), destination);
  }
  await fs.mkdir(path.join(fixture, 'data'), { recursive: true });
  await fs.writeFile(path.join(fixture, 'data', 'cars.json'), '[]');
  await fs.writeFile(path.join(fixture, 'data', 'social.json'), JSON.stringify({ posts: [], live: { active: false } }));
  const port = await unusedPort();
  const base = `http://127.0.0.1:${port}`;
  let output = '';
  server = spawn(process.execPath, [path.join(fixture, 'server.js')], {
    env: { ...process.env, NODE_ENV: 'test', PORT: String(port), ADMIN_PASSWORD: password, BASE_URL: base,
      DATABASE_URL: '', DATABASE_URL_POOLED: '', DATABASE_SCHEMA: '', DATA_DIR: '', UPLOAD_DIR: '',
      STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '', MAMO_API_KEY: '',
      NODE_PATH: [path.join(root, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', chunk => { output += chunk; });
  server.stderr.on('data', chunk => { output += chunk; });
  const deadline = Date.now() + 10000;
  while (true) {
    if (server.exitCode !== null) throw new Error(`Test server exited: ${output}`);
    try { await fetch(`${base}/api/social`); break; }
    catch (error) {
      if (Date.now() > deadline) throw new Error(`Test server did not start: ${output}`, { cause: error });
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('cache-control'), 'no-store');
  const page = await fetch(`${base}/allani?section=add-car&lang=en`);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  const html = await page.text();
  assert.match(html, /const adminReadOnly = false;/);
  assert.match(html, /api\('\/api\/admin\/me'\)\.then\(showApp\)\.catch\(showLogin\)/);
  assert.match(html, /id="f-photos"/);
  assert.doesNotMatch(html, /const snapshot = /);
  assert.doesNotMatch(html, /#logout, #car-form \.actions/);
  assert.match(html, /class="light hidden" id="logout"/);
  assert.equal((await fetch(`${base}/allani/?section=social&lang=ar`)).status, 200);
  const adminAlias = await fetch(`${base}/admin?section=add-car&lang=en`);
  assert.equal(adminAlias.status, 200);
  assert.equal(adminAlias.headers.get('cache-control'), 'no-store');
  assert.equal(await adminAlias.text(), html);

  for (const route of ['/info', '/info/']) {
    const info = await fetch(`${base}${route}`);
    assert.equal(info.status, 200);
    assert.equal(info.headers.get('cache-control'), 'no-store');
    const infoHtml = await info.text();
    assert.match(infoHtml, /Prime Cars · Liens & réseaux sociaux/);
    assert.ok(infoHtml.includes(`<meta property="og:url" content="${base}/info/">`));
    assert.match(infoHtml, /data:image\/jpeg;base64,/);
  }

  assert.equal((await fetch(`${base}/api/admin/me`)).status, 401);
  assert.equal((await fetch(`${base}/api/admin/cars`, { method: 'POST' })).status, 401);
  assert.equal((await fetch(`${base}/api/admin/social`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  assert.equal((await fetch(`${base}/api/admin/static-site`, { method: 'PUT', body: new FormData() })).status, 401);
  const login = await fetch(`${base}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password })
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const request = (url, options = {}) => fetch(base + url, {
    ...options, headers: { ...options.headers, Cookie: cookie }
  });
  assert.equal((await request('/api/admin/me')).status, 200);
  const form = new FormData();
  for (const [key, value] of Object.entries({
    brand: 'Test', name: 'Test car', year: '2025', km: '1000', price: '12000',
    fuel: 'Essence', origin: 'France', kind: 'occasion', status: 'available'
  })) form.append(key, value);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64');
  form.append('photos', new Blob([png], { type: 'image/png' }), 'test.png');
  const create = await request('/api/admin/cars', { method: 'POST', body: form });
  assert.equal(create.status, 201);
  const car = await create.json();
  assert.equal(car.name, 'Test car');
  assert.equal(car.images.length, 1);
  assert.equal((await fetch(base + car.image)).status, 200);
  assert.equal((await (await fetch(`${base}/api/cars`)).json())[0].id, car.id);

  const social = await request('/api/admin/social', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tiktokUsername: '@test', posts: [], live: { active: false } })
  });
  assert.equal(social.status, 200);
  assert.equal((await social.json()).tiktokUsername, 'test');
  const appointment = await request('/api/admin/appointments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ carId: car.id, date: new Date(Date.now() + 86400000).toISOString(),
      name: 'Test customer', email: 'test@example.com', phone: '', note: '' })
  });
  assert.equal(appointment.status, 201);
  assert.equal((await request('/api/admin/reservations')).status, 200);
  const initialSettings = (await (await request('/api/admin/static-site')).json()).settings;
  const siteFields = {
    siteUrl: '', title: initialSettings.title, description: initialSettings.description,
    phone: initialSettings.contact.phone, phoneDisplay: initialSettings.contact.phoneDisplay,
    whatsapp: initialSettings.contact.whatsapp, email: initialSettings.contact.email
  };
  const siteForm = (image, extra = {}) => {
    const body = new FormData();
    for (const [key, value] of Object.entries({ ...siteFields, ...extra })) body.set(key, value);
    if (image) body.set('wallpaper', image, 'wallpaper.png');
    return body;
  };
  const updateSite = body => request('/api/admin/static-site', { method: 'PUT', body });
  assert.match(await (await fetch(base)).text(), /photo-1492144534655-ae79c964c9d7/);
  assert.equal((await updateSite(siteForm(new Blob(['bad type'], { type: 'image/svg+xml' })))).status, 400);
  assert.equal((await updateSite(siteForm(new Blob(['not a PNG'], { type: 'image/png' })))).status, 400);
  assert.equal((await updateSite(siteForm(new Blob([Buffer.alloc(8 * 1024 * 1024 + 1)], { type: 'image/png' })))).status, 400);
  assert.equal((await updateSite(siteForm(new Blob([png], { type: 'image/png' }), { resetWallpaper: 'true' }))).status, 400);
  const wallpaperUpdate = await updateSite(siteForm(new Blob([png], { type: 'image/png' })));
  assert.equal(wallpaperUpdate.status, 200, `${await wallpaperUpdate.clone().text()}\n${output}`);
  const wallpaper = (await wallpaperUpdate.json()).settings.wallpaperImage;
  assert.match(wallpaper, /^\/uploads\/[a-f0-9]{24}\.png$/);
  assert.deepEqual(Buffer.from(await (await fetch(base + wallpaper)).arrayBuffer()), png);
  assert.ok((await (await fetch(base)).text()).includes(`<div class="hero"><img src="${wallpaper}" alt="">`));
  const generatedHome = await fs.readFile(path.join(fixture, 'front-office', 'index.html'), 'utf8');
  assert.ok(generatedHome.includes(`<div class="hero"><img src="data:image/png;base64,${png.toString('base64')}" alt="">`));
  const generatedAdmin = await fs.readFile(path.join(fixture, 'front-office', 'allani', 'index.html'), 'utf8');
  assert.ok(generatedAdmin.includes(`data:image/png;base64,${png.toString('base64')}`));
  const jsonSettings = await request('/api/admin/static-site', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...siteFields, contact: initialSettings.contact })
  });
  assert.equal(jsonSettings.status, 200);
  assert.equal((await jsonSettings.json()).settings.wallpaperImage, wallpaper);
  const restored = await updateSite(siteForm(null, { resetWallpaper: 'true' }));
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).settings.wallpaperImage, '');
  assert.match(await (await fetch(base)).text(), /photo-1492144534655-ae79c964c9d7/);
  assert.match(await fs.readFile(path.join(fixture, 'front-office', 'index.html'), 'utf8'), /photo-1492144534655-ae79c964c9d7/);
  assert.equal((await request('/api/admin/analytics')).status, 200);
  const publish = await request('/api/admin/static-site/publish', { method: 'POST' });
  assert.equal(publish.status, 200, `${await publish.text()}\n${output}`);
  const snapshot = await fs.readFile(path.join(fixture, 'front-office', 'allani', 'index.html'), 'utf8');
  assert.match(snapshot, /const adminReadOnly = false;/);
  assert.match(snapshot, /const demoAdminApi = createDemoAdminApi\(/);
  assert.doesNotMatch(snapshot, /api\('\/api\/admin\/me'\)\.then\(showApp\)/);
  assert.match(snapshot, /Test car/);
  const logout = await request('/api/admin/logout', { method: 'POST' });
  assert.equal(logout.status, 200);
  assert.equal((await request('/api/admin/me')).status, 401);
});
