const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'demo-admin.js'), 'utf8');
const createApi = vm.runInNewContext(`${source}\ncreateDemoAdminApi`, {
  structuredClone, URL, crypto, FormData
});
const initial = {
  cars: [{ id: 'existing', name: 'Existing car', brand: 'Brand', images: [], image: 'photo-test' }],
  social: { posts: [], live: { active: false } },
  staticSite: { title: 'Original', contact: { email: 'demo@example.com' } },
  analytics: { measurementId: '' }
};
const json = (method, body) => ({ method, body: JSON.stringify(body) });
const carForm = (name, photos = []) => {
  const body = new FormData();
  for (const [key, value] of Object.entries({
    name, brand: 'Custom brand', year: '2026', price: '12345',
    status: 'available', fuel: 'Essence', origin: 'France', kind: 'occasion'
  })) body.set(key, value);
  photos.forEach(photo => body.append('photos', photo, 'car.png'));
  return body;
};

test('vehicles and photos can be created, edited and deleted without changing the snapshot', async t => {
  const api = createApi(initial);
  t.after(() => api.dispose());
  const photo = new Blob(['image bytes'], { type: 'image/png' });
  const car = await api('/api/admin/cars', { method: 'POST', body: carForm('<Custom car>', [photo]) });
  assert.equal(car.price, 12345);
  assert.match(car.image, /^blob:/);
  assert.equal((await fetch(car.image)).status, 200);
  const edited = await api(`/api/admin/cars/${car.id}`, { method: 'PUT', body: carForm('Edited car') });
  assert.equal(edited.image, car.image);
  assert.equal(edited.name, 'Edited car');
  const replaced = await api(`/api/admin/cars/${car.id}`, { method: 'PUT', body: carForm('New photo', [photo]) });
  await assert.rejects(fetch(car.image));
  assert.notEqual(replaced.image, car.image);
  await api(`/api/admin/cars/${car.id}`, { method: 'DELETE' });
  await assert.rejects(fetch(replaced.image));
  const noPhoto = await api('/api/admin/cars', { method: 'POST', body: carForm('No photo') });
  assert.match(noPhoto.image, /^data:image\/svg/);
  assert.equal(initial.cars.length, 1);
  const loaded = await api('/api/cars');
  loaded[0].name = 'Mutated outside';
  assert.equal((await api('/api/cars'))[0].name, 'Existing car');
  assert.equal((await createApi(initial)('/api/cars')).length, 1);
});

test('demo vehicles retain, update and clear optional custom colours', async t => {
  const api = createApi(initial);
  t.after(() => api.dispose());
  const form = carForm('Colour test');
  form.set('color', '  Noir métallisé  ');
  const car = await api('/api/admin/cars', { method: 'POST', body: form });
  assert.equal(car.color, 'Noir métallisé');

  const update = carForm('Colour test');
  update.set('color', '  Bleu polaire satiné  ');
  assert.equal((await api(`/api/admin/cars/${car.id}`, { method: 'PUT', body: update })).color, 'Bleu polaire satiné');
  update.delete('color');
  assert.equal((await api(`/api/admin/cars/${car.id}`, { method: 'PUT', body: update })).color, 'Bleu polaire satiné');
  update.set('color', 'x'.repeat(41));
  await assert.rejects(api(`/api/admin/cars/${car.id}`, { method: 'PUT', body: update }), /Couleur invalide/);
  assert.equal((await api('/api/cars')).find(item => item.id === car.id).color, 'Bleu polaire satiné');
  update.set('color', '');
  assert.equal((await api(`/api/admin/cars/${car.id}`, { method: 'PUT', body: update })).color, '');
});

test('appointments support creation, status changes, deletion and refresh reset', async () => {
  const api = createApi(initial);
  const appointment = await api('/api/admin/appointments', json('POST', {
    carId: 'existing', name: 'Demo client', email: 'demo@example.com',
    date: '2027-01-15T10:00:00.000Z', note: 'Free text'
  }));
  assert.equal(appointment.carName, 'Existing car');
  assert.equal(appointment.status, 'planned');
  await api(`/api/admin/appointments/${appointment.id}`, json('PATCH', { status: 'confirmed' }));
  assert.equal((await api('/api/admin/appointments'))[0].status, 'confirmed');
  assert.equal((await createApi(initial)('/api/admin/appointments')).length, 0);
  await api(`/api/admin/appointments/${appointment.id}`, { method: 'DELETE' });
  assert.equal((await api('/api/admin/appointments')).length, 0);
  await assert.rejects(api('/api/admin/appointments/missing', { method: 'DELETE' }), /introuvable/);
});

test('live and demo navigation group the add-vehicle shortcut under vehicles', () => {
  const live = require('./sync').renderLiveAdmin();
  const demo = fs.readFileSync(path.join(__dirname, 'allani', 'index.html'), 'utf8');
  for (const html of [live, demo]) {
    const nav = html.match(/<nav class="admin-nav"[^>]*>([\s\S]*?)<\/nav>/);
    assert.ok(nav, 'Admin navigation must exist');
    assert.match(nav[1], /<div class="admin-nav-group">\s*<a data-admin-page="vehicles"[^>]*>Véhicules<\/a>\s*<a class="admin-nav-child" data-admin-page="add-car"[^>]*>\+ Ajouter un véhicule<\/a>\s*<\/div>/);
    assert.match(html, /\.admin-nav \.admin-nav-child\{margin-inline-start:16px\}/);
    assert.match(html, /<div class="actions panel-heading-extra" style="margin:0">[^]*?<button type="button" id="new-vehicle" class="editor-only">\+ Ajouter un véhicule<\/button><\/div>/);
  }
});

test('the demo previews, replaces and resets the wallpaper without changing the snapshot', async t => {
  const api = createApi(initial);
  t.after(() => api.dispose());
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64');
  const body = new FormData();
  for (const [key, value] of Object.entries({
    title: 'Demo title', description: 'Demo description', siteUrl: '',
    phone: '+1234567890', phoneDisplay: '+1234567890', whatsapp: '+1234567890', email: 'demo@example.com'
  })) body.set(key, value);
  body.set('wallpaper', new Blob([png], { type: 'image/png' }), 'wallpaper.png');
  const updated = await api('/api/admin/static-site', { method: 'PUT', body });
  const wallpaper = updated.settings.wallpaperImage;
  assert.match(wallpaper, /^blob:/);
  assert.deepEqual(Buffer.from(await (await fetch(wallpaper)).arrayBuffer()), png);
  assert.equal(initial.staticSite.wallpaperImage, undefined);
  const saved = await api('/api/admin/static-site', json('PUT', { title: 'Changed title' }));
  assert.equal(saved.settings.wallpaperImage, wallpaper);
  const reset = new FormData();
  reset.set('resetWallpaper', 'true');
  const restored = await api('/api/admin/static-site', { method: 'PUT', body: reset });
  assert.equal(restored.settings.wallpaperImage, '');
  await assert.rejects(fetch(wallpaper));
  const invalid = new FormData();
  invalid.set('wallpaper', new Blob(['not a PNG'], { type: 'image/png' }), 'invalid.png');
  await assert.rejects(api('/api/admin/static-site', { method: 'PUT', body: invalid }), /Format d’image invalide/);
});

test('social posts, site settings and analytics remain editable only in memory', async () => {
  const api = createApi(initial);
  const url = 'https://www.instagram.com/p/demo/';
  await api('/api/admin/social', json('PUT', { instagramUsername: 'demo', posts: [url], live: { active: false } }));
  assert.equal((await api('/api/social')).posts[0].url, url);
  await api('/api/admin/static-site', json('PUT', { title: 'Demo title', contact: { email: 'new@example.com' } }));
  const published = await api('/api/admin/static-site/publish', { method: 'POST' });
  assert.equal(published.settings.title, 'Demo title');
  assert.equal(published.generatedAt, null);
  await api('/api/admin/analytics', json('PUT', { measurementId: 'anything' }));
  assert.equal((await api('/api/admin/analytics')).measurementId, 'anything');
  assert.equal((await createApi(initial)('/api/admin/analytics')).measurementId, '');
  await assert.rejects(api('/api/unsupported'), /non prise en charge/);
});

test('admin vehicle list filters by search terms, criteria and sorts results', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
  const normalize = html.match(/const normalizeSearch = .*;/);
  const filter = html.match(/function filterCars\(list, filters\) \{[\s\S]*?\n    \}/);
  assert.ok(normalize && filter);
  const filterCars = vm.runInNewContext(`${normalize[0]}\n${filter[0]}\nfilterCars`);
  const cars = [
    { id: 'a', name: 'Mercedes-Benz Classe C', brand: 'Mercedes-Benz', trim: 'AMG Line', year: 2022, fuel: 'Diesel', origin: 'France', kind: 'occasion', status: 'available', price: 90000 },
    { id: 'b', name: 'BMW X5', brand: 'BMW', trim: 'M Sport', year: 2025, fuel: 'Hybride', origin: 'Dubaï', kind: 'neuf', status: 'reserved', price: 250000 },
    { id: 'c', name: 'Audi A3', brand: 'Audi', trim: 'S line', year: 2020, fuel: 'Électrique', origin: 'Dubaï', kind: 'occasion', status: 'sold', price: 60000 }
  ];
  const ids = filters => Array.from(filterCars(cars, { q: '', ...filters }), car => car.id);
  assert.deepEqual(ids({}), ['a', 'b', 'c']);
  assert.deepEqual(ids({ q: 'mercedes amg' }), ['a']);
  assert.deepEqual(ids({ q: 'electrique' }), ['c']);
  assert.deepEqual(ids({ q: 'emirats' }), ['b', 'c']);
  assert.deepEqual(ids({ origin: 'Dubaï', kind: 'occasion' }), ['c']);
  assert.deepEqual(ids({ status: 'reserved' }), ['b']);
  assert.deepEqual(ids({ brand: 'BMW', fuel: 'Diesel' }), []);
  assert.deepEqual(ids({ sort: 'price-desc' }), ['b', 'a', 'c']);
  assert.deepEqual(ids({ sort: 'year-desc' }), ['b', 'a', 'c']);
  assert.deepEqual(ids({ sort: 'name' }), ['c', 'b', 'a']);
  assert.deepEqual(Array.from(cars, car => car.id), ['a', 'b', 'c']);
});

test('site settings report save, regeneration and errors appropriately in live and demo admins', async () => {
  const live = require('./sync').renderLiveAdmin();
  const demo = fs.readFileSync(path.join(__dirname, 'allani', 'index.html'), 'utf8');
  for (const [html, saved, regenerated] of [
    [live, 'Enregistrement effectué.', 'Site vitrine régénéré. Republiez le dossier front-office pour le mettre en ligne.'],
    [demo, 'Modifications enregistrées dans la démo uniquement.', 'Simulation terminée. Aucun fichier publié ni modifié.']
  ]) {
    const source = html.match(/async function staticSiteRequest\(url, options\) \{[\s\S]*?\n    \}/);
    assert.ok(source);
    const messages = [];
    let fail = false;
    const request = vm.runInNewContext(`(${source[0]})`, {
      $: () => ({}),
      message: (id, text, ok) => messages.push({ id, text, ok }),
      renderStaticSite: () => {},
      api: async () => { if (fail) throw new Error('Erreur de test'); return {}; }
    });
    await request('/api/admin/static-site', { method: 'PUT' });
    assert.deepEqual(messages.pop(), { id: 'static-site-msg', text: saved, ok: true });
    await request('/api/admin/static-site/publish', { method: 'POST' });
    assert.deepEqual(messages.pop(), { id: 'static-site-msg', text: regenerated, ok: true });
    fail = true;
    await request('/api/admin/static-site', { method: 'PUT' });
    assert.deepEqual(messages.pop(), { id: 'static-site-msg', text: 'Erreur de test', ok: undefined });
  }
  const translations = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'admin-i18n.js'), 'utf8'), { DICT: translations, PATTERNS: [] });
  assert.deepEqual(Array.from(translations['Enregistrement effectué.']), ['Saved successfully.', 'تم الحفظ بنجاح.']);
  assert.deepEqual(Array.from(translations['Modifications enregistrées dans la démo uniquement.']), ['Changes saved in the demo only.', 'تم حفظ التعديلات في العرض التجريبي فقط.']);
});

test('generated demo embeds the adapter, enables controls and keeps live rendering unchanged', () => {
  const html = fs.readFileSync(path.join(__dirname, 'allani', 'index.html'), 'utf8');
  assert.match(html, /const demoAdminApi = createDemoAdminApi\(/);
  assert.match(html, /const adminReadOnly = false/);
  assert.doesNotMatch(html, /static-notice|Read-only view|Vue statique/);
  assert.doesNotMatch(html, /field\.disabled = true; \}\);\s+showApp/);
  assert.doesNotMatch(html, /await fetch\(url, \{ credentials/);
  assert.match(html, /id="demo-login-notice"[^>]*>Démo uniquement/);
  assert.match(html, /id="password" type="password" autocomplete="off" aria-describedby="demo-login-notice" required/);
  assert.match(html, /id="st-wallpaper" type="file" accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(html, /class="light hidden" id="logout"/);
  assert.match(html, /\$\('login'\)\.addEventListener\('submit', event => \{\s*event\.preventDefault\(\);\s*\$\('password'\)\.value = ''; showApp\(\);/);
  assert.match(html, /\$\('logout'\)\.addEventListener\('click', \(\) => \{ showLogin\(\); \}\)/);
  assert.match(html, /showAdminPage\(new URLSearchParams\(location\.search\)\.get\('section'\)\);\s*showLogin\(\);/);
  assert.doesNotMatch(html, /api\('\/api\/admin\/(?:login|logout)'/);
  assert.match(html, /\$\('car-toast-text'\)\.textContent = updated \? 'Vos modifications sont enregistrées\.' : 'Véhicule ajouté à la démo\.'/);
  for (const [, script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    new vm.Script(script);
  }
  const live = require('./sync').renderLiveAdmin();
  assert.doesNotMatch(live, /createDemoAdminApi/);
  assert.doesNotMatch(live, /demo-login-notice/);
  assert.match(live, /api\('\/api\/admin\/me'\)\.then\(showApp\)\.catch\(showLogin\)/);
  assert.match(live, /api\('\/api\/admin\/login',/);
  assert.match(live, /api\('\/api\/admin\/logout',/);
});
