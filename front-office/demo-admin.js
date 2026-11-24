function createDemoAdminApi(initialSnapshot) {
  const snapshot = structuredClone(initialSnapshot);
  snapshot.staticSite = {
    defaultWallpaperImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2200&q=90',
    wallpaperImage: '',
    ...snapshot.staticSite
  };
  const appointments = [];
  // The static demo never receives real export requests (the public form only shows a demo confirmation).
  const exportRequests = [];
  const photoUrls = new Set();
  const placeholder = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="100%" height="100%" fill="#eee"/><text x="50%" y="50%" text-anchor="middle" fill="#777" font-family="sans-serif">Prime Cars</text></svg>');
  const copy = value => structuredClone(value);
  const readBody = options => JSON.parse(options.body);
  const findItem = (items, id) => {
    const item = items.find(entry => entry.id === id);
    if (!item) throw new Error('Element introuvable dans cette demo.');
    return item;
  };
  const releasePhoto = url => { if (photoUrls.delete(url)) URL.revokeObjectURL(url); };
  const releasePhotos = car => { (car.images || []).forEach(releasePhoto); };

  async function validateWallpaper(file) {
    if (typeof file === 'string' || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Format d’image invalide (JPG, PNG ou WebP).');
    }
    if (file.size > 8 * 1024 * 1024) throw new Error('Photo trop lourde (8 Mo max).');
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const isJpeg = file.type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = file.type === 'image/png' && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
    const isWebp = file.type === 'image/webp' && [0x52, 0x49, 0x46, 0x46, 0x57, 0x45, 0x42, 0x50].every((value, index) => bytes[index < 4 ? index : index + 4] === value);
    if (!isJpeg && !isPng && !isWebp) throw new Error('Format d’image invalide (JPG, PNG ou WebP).');
  }

  async function request(url, options = {}) {
    const method = options.method || 'GET';
    if (method === 'GET') {
      if (url === '/api/cars') return copy(snapshot.cars);
      if (url === '/api/social') return copy(snapshot.social);
      if (url === '/api/admin/appointments') return copy(appointments);
      if (url === '/api/admin/export-requests') return copy(exportRequests);
      if (url === '/api/admin/reservations') return [];
      if (url === '/api/admin/static-site') return { settings: copy(snapshot.staticSite), generatedAt: null };
      if (url === '/api/admin/analytics') return copy(snapshot.analytics);
    }

    const carMatch = url.match(/^\/api\/admin\/cars(?:\/([^/]+))?$/);
    if (carMatch) {
      const id = carMatch[1] && decodeURIComponent(carMatch[1]);
      if (id && method === 'DELETE') {
        const car = findItem(snapshot.cars, id);
        releasePhotos(car);
        snapshot.cars.splice(snapshot.cars.indexOf(car), 1);
        return { ok: true };
      }
      if ((!id && method === 'POST') || (id && method === 'PUT')) {
        const existing = id ? findItem(snapshot.cars, id) : null;
        const body = options.body;
        const fields = Object.fromEntries([...body.entries()].filter(([key]) => key !== 'photos'));
        if (fields.color !== undefined) {
          if (typeof fields.color !== 'string' || fields.color.trim().length > 40) throw new Error('Couleur invalide (40 caractères maximum).');
          fields.color = fields.color.trim();
        }
        const files = body.getAll('photos').filter(file => file.size > 0);
        const images = files.length ? files.map(file => {
          const url = URL.createObjectURL(file);
          photoUrls.add(url);
          return url;
        }) : existing?.images || [];
        const car = {
          ...existing, ...fields, id: id || crypto.randomUUID(),
          year: Number(fields.year), price: Number(fields.price),
          images, image: images[0] || existing?.image || placeholder
        };
        if (existing) {
          if (files.length) releasePhotos(existing);
          snapshot.cars[snapshot.cars.indexOf(existing)] = car;
        } else snapshot.cars.push(car);
        return copy(car);
      }
    }

    const appointmentMatch = url.match(/^\/api\/admin\/appointments(?:\/([^/]+))?$/);
    if (appointmentMatch) {
      const id = appointmentMatch[1] && decodeURIComponent(appointmentMatch[1]);
      if (!id && method === 'POST') {
        const body = readBody(options);
        const car = findItem(snapshot.cars, body.carId);
        const appointment = {
          ...body, id: crypto.randomUUID(), carName: car.name,
          status: 'planned', createdAt: new Date().toISOString()
        };
        appointments.push(appointment);
        return copy(appointment);
      }
      if (id && (method === 'PATCH' || method === 'DELETE')) {
        const appointment = findItem(appointments, id);
        if (method === 'DELETE') {
          appointments.splice(appointments.indexOf(appointment), 1);
          return { ok: true };
        }
        appointment.status = readBody(options).status;
        return copy(appointment);
      }
    }
    const exportMatch = url.match(/^\/api\/admin\/export-requests\/([^/]+)$/);
    if (exportMatch && (method === 'PATCH' || method === 'DELETE')) {
      const item = findItem(exportRequests, decodeURIComponent(exportMatch[1]));
      if (method === 'DELETE') {
        exportRequests.splice(exportRequests.indexOf(item), 1);
        return { ok: true };
      }
      item.status = readBody(options).status;
      return copy(item);
    }
    if (url === '/api/admin/social' && method === 'PUT') {
      const body = readBody(options);
      snapshot.social = { ...body, posts: body.posts.map(url => ({ url })) };
      return copy(snapshot.social);
    }
    if (url === '/api/admin/static-site' && method === 'PUT') {
      const multipart = options.body instanceof FormData;
      const form = multipart ? options.body : null;
      const pickRates = fields => Object.fromEntries(Object.entries(fields)
        .filter(([, field]) => form.get(field) !== null && form.get(field) !== '').map(([key, field]) => [key, Number(form.get(field))]));
      const body = multipart ? {
        siteUrl: form.get('siteUrl'), title: form.get('title'), description: form.get('description'),
        contact: { phone: form.get('phone'), phoneDisplay: form.get('phoneDisplay'), whatsapp: form.get('whatsapp'), email: form.get('email') },
        shipping: pickRates({ france: 'shippingFrance', dubai: 'shippingDubai', suv: 'shippingSuv', insuranceRate: 'insuranceRate', support: 'supportFee' }),
        exportShipping: pickRates({ france: 'exportFrance', dubai: 'exportDubai', suv: 'exportSuv', insuranceRate: 'exportInsuranceRate', support: 'exportSupport', customs: 'exportCustoms' })
      } : readBody(options);
      const rates = [...Object.entries(body.shipping || {}), ...Object.entries(body.exportShipping || {})];
      if (rates.some(([key, value]) => !Number.isFinite(value) || value < 0 || (key === 'insuranceRate' && value > 100))) throw new Error('Tarifs d’importation invalides : nombres positifs uniquement (assurance entre 0 et 100 %).');
      body.shipping = { ...snapshot.staticSite.shipping, ...body.shipping };
      body.exportShipping = { ...snapshot.staticSite.exportShipping, ...body.exportShipping };
      const resetValue = multipart ? form.get('resetWallpaper') : body.resetWallpaper;
      if (resetValue !== null && resetValue !== undefined && ![true, false, 'true', 'false'].includes(resetValue)) {
        throw new Error('Choix de l’image de fond invalide.');
      }
      const reset = resetValue === true || resetValue === 'true';
      const file = multipart ? form.get('wallpaper') : null;
      if (reset && file) throw new Error('Choisissez une image ou l’image par défaut, pas les deux.');
      let wallpaperImage = snapshot.staticSite.wallpaperImage;
      if (file) {
        await validateWallpaper(file);
        wallpaperImage = URL.createObjectURL(file);
        photoUrls.add(wallpaperImage);
      } else if (reset) wallpaperImage = '';
      const previousWallpaper = snapshot.staticSite.wallpaperImage;
      delete body.resetWallpaper;
      snapshot.staticSite = { ...snapshot.staticSite, ...body, wallpaperImage };
      if (previousWallpaper !== wallpaperImage) releasePhoto(previousWallpaper);
      return { settings: copy(snapshot.staticSite), generatedAt: null };
    }
    if (url === '/api/admin/static-site/publish' && method === 'POST') {
      return { settings: copy(snapshot.staticSite), generatedAt: null };
    }
    if (url === '/api/admin/analytics' && method === 'PUT') {
      snapshot.analytics = readBody(options);
      return copy(snapshot.analytics);
    }
    throw new Error(`Action de demo non prise en charge : ${method} ${url}`);
  }

  request.dispose = () => {
    photoUrls.forEach(url => URL.revokeObjectURL(url));
    photoUrls.clear();
  };
  return request;
}
