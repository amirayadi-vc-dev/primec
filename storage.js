const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Connection, Pool } = require('postgrejs');

const DOCUMENT_DEFAULTS = {
  'cars.json': [],
  'social.json': { posts: [], live: { active: false } },
  'static-site.json': {},
  'analytics.json': {},
  'reservations.json': [],
  'appointments.json': [],
  'export-requests.json': []
};
const DOCUMENT_NAMES = Object.keys(DOCUMENT_DEFAULTS);
// Documents added after the first database seed: created on first write, read as their default until then.
const OPTIONAL_DOCUMENTS = new Set(['export-requests.json']);
const IMAGE_NAME_RE = /^[a-f0-9]{24}\.(jpg|png|webp)$/;
const IMAGE_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

function documentNames(names) {
  const unique = [...new Set(names)].sort();
  if (!unique.length || unique.some(name => !Object.hasOwn(DOCUMENT_DEFAULTS, name))) {
    throw new Error('Document de stockage inconnu.');
  }
  return unique;
}

function validateDocument(name, value) {
  const expectsArray = Array.isArray(DOCUMENT_DEFAULTS[name]);
  if (expectsArray ? !Array.isArray(value) : !value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Format de données invalide : ${name}.`);
  }
}

async function readFileDocument(dataDir, name) {
  try {
    const value = JSON.parse(await fs.readFile(path.join(dataDir, name), 'utf8'));
    validateDocument(name, value);
    return value;
  } catch (error) {
    if (error.code === 'ENOENT' && !['cars.json', 'social.json'].includes(name)) {
      return structuredClone(DOCUMENT_DEFAULTS[name]);
    }
    throw error;
  }
}

function uploadName(name) {
  if (!IMAGE_NAME_RE.test(name)) throw new Error('Nom de photo invalide.');
  return name;
}

function uploadNameFromUrl(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) throw new Error('Chemin de photo invalide.');
  return uploadName(url.slice('/uploads/'.length));
}

function query(connection, sql, params = []) {
  return connection.query(sql, { params, rowDecoder: 'object' });
}

const isNeonUrl = url => {
  try { return /\.neon\.tech$/i.test(new URL(url).hostname); } catch { return false; }
};

// Neon over WebSocket (port 443): works on networks that block PostgreSQL's port 5432.
// Exposes the subset of the postgrejs API used below (query / acquire / close / connect).
function neonDriver() {
  const { Pool: NeonPool, Client: NeonClient, neonConfig } = require('@neondatabase/serverless');
  neonConfig.webSocketConstructor = WebSocket;
  const wrap = (target, close) => ({ query: (sql, { params }) => target.query(sql, params), close });
  return {
    pool(connectionString, max) {
      const pool = new NeonPool({ connectionString, max, connectionTimeoutMillis: 10000 });
      return {
        ...wrap(pool, () => pool.end()),
        on: (event, listener) => pool.on(event, listener),
        async acquire() { const client = await pool.connect(); return wrap(client, async () => client.release()); }
      };
    },
    connection(connectionString) {
      const client = new NeonClient(connectionString);
      return { ...wrap(client, () => client.end()), connect: () => client.connect() };
    }
  };
}

const postgrejsDriver = {
  pool: (connectionString, max) => new Pool({ connectionString, max, acquireTimeoutMillis: 10000, pipelineMaxQueries: 1 }),
  connection: connectionString => new Connection(connectionString)
};

class FileStorage {
  constructor({ dataDir, uploadDir }) {
    this.dataDir = dataDir;
    this.uploadDir = uploadDir;
    this.queue = Promise.resolve();
    this.kind = 'file';
  }

  async ready() {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async readMany(names) {
    const selected = documentNames(names);
    await this.queue;
    const values = await Promise.all(selected.map(name => readFileDocument(this.dataDir, name)));
    return Object.fromEntries(selected.map((name, index) => [name, values[index]]));
  }

  async read(name) {
    return (await this.readMany([name]))[name];
  }

  change(names, mutate) {
    const selected = documentNames(names);
    const operation = this.queue.then(async () => {
      const values = await Promise.all(selected.map(name => readFileDocument(this.dataDir, name)));
      const documents = Object.fromEntries(selected.map((name, index) => [name, values[index]]));
      const result = await mutate(documents);
      for (const name of selected) validateDocument(name, documents[name]);
      for (const name of selected) {
        const file = path.join(this.dataDir, name);
        const temporary = `${file}.${crypto.randomBytes(6).toString('hex')}.tmp`;
        await fs.writeFile(temporary, JSON.stringify(documents[name], null, 2));
        await fs.rename(temporary, file);
      }
      return result;
    });
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async write(name, value) {
    await this.change([name], documents => { documents[name] = value; });
  }

  async putUpload(name, mimeType, bytes) {
    uploadName(name);
    await fs.writeFile(path.join(this.uploadDir, name), bytes, { flag: 'wx' });
  }

  async getUpload(name) {
    uploadName(name);
    try {
      const bytes = await fs.readFile(path.join(this.uploadDir, name));
      return { bytes, mimeType: IMAGE_TYPES[path.extname(name).slice(1)] };
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async deleteUploads(names) {
    for (const name of names) {
      try { await fs.unlink(path.join(this.uploadDir, uploadName(name))); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }

  async close() {}
}

class PostgresStorage {
  constructor({ databaseUrl, pooledUrl, schema = 'public', dataDir, uploadDir }) {
    if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) throw new Error('DATABASE_SCHEMA invalide.');
    this.schema = schema;
    this.dataDir = dataDir;
    this.uploadDir = uploadDir;
    this.directUrl = databaseUrl || pooledUrl;
    this.driver = isNeonUrl(this.directUrl) ? neonDriver() : postgrejsDriver;
    this.pool = this.driver.pool(pooledUrl || databaseUrl, 10);
    this.pool.on('error', error => console.error('Erreur de connexion PostgreSQL inactive :', error.message));
    this.documents = `"${schema}"."prime_cars_documents"`;
    this.uploads = `"${schema}"."prime_cars_uploads"`;
    this.kind = 'postgres';
  }

  async transaction(callback) {
    const client = await this.pool.acquire();
    try {
      await query(client, 'BEGIN');
      const result = await callback(client);
      await query(client, 'COMMIT');
      return result;
    } catch (error) {
      try { await query(client, 'ROLLBACK'); }
      catch (rollbackError) { console.error('Échec de l’annulation PostgreSQL :', rollbackError.message); }
      throw error;
    } finally {
      await client.close();
    }
  }

  async ready() {
    try {
      await this.readMany(DOCUMENT_NAMES);
      await query(this.pool, `SELECT 1 FROM ${this.uploads} LIMIT 0`);
    } catch (error) {
      throw new Error('Stockage PostgreSQL indisponible ou non initialisé. Vérifiez la connexion et exécutez npm run db:seed.', { cause: error });
    }
  }

  async seed({ emptyCatalog = false } = {}) {
    const client = this.driver.connection(this.directUrl);
    await client.connect();
    try {
      await query(client, 'BEGIN');
      await query(client, 'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [this.schema, 'prime_cars_seed']);
      await query(client, `CREATE TABLE IF NOT EXISTS ${this.documents} (
        name text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
      )`);
      await query(client, `CREATE TABLE IF NOT EXISTS ${this.uploads} (
        name text PRIMARY KEY, mime_type text NOT NULL, bytes bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      )`);
      const existing = await query(client, `SELECT name FROM ${this.documents}`);
      if (existing.rows.length) {
        const names = new Set(existing.rows.map(row => row.name));
        if (DOCUMENT_NAMES.some(name => !OPTIONAL_DOCUMENTS.has(name) && !names.has(name))) {
          throw new Error('La base contient déjà des données incomplètes ; aucun import n’a été effectué.');
        }
        await query(client, 'COMMIT');
        return { imported: false };
      }

      const values = await Promise.all(DOCUMENT_NAMES.map(name =>
        emptyCatalog && name === 'cars.json' ? [] : readFileDocument(this.dataDir, name)
      ));
      const documents = Object.fromEntries(DOCUMENT_NAMES.map((name, index) => [name, values[index]]));
      const images = new Set();
      for (const car of documents['cars.json']) {
        for (const url of [car.image, ...(Array.isArray(car.images) ? car.images : [])]) {
          if (typeof url !== 'string' || !url.startsWith('/uploads/')) continue;
          images.add(uploadName(url.slice('/uploads/'.length)));
        }
      }
      const wallpaper = documents['static-site.json'].wallpaperImage;
      if (wallpaper) images.add(uploadNameFromUrl(wallpaper));
      for (const name of images) {
        const bytes = await fs.readFile(path.join(this.uploadDir, name));
        const mimeType = IMAGE_TYPES[path.extname(name).slice(1)];
        const image = await query(client, `SELECT mime_type, bytes FROM ${this.uploads} WHERE name = $1`, [name]);
        if (image.rows.length && (image.rows[0].mime_type !== mimeType || !image.rows[0].bytes.equals(bytes))) {
          throw new Error(`Une photo portant le même nom existe déjà : ${name}.`);
        }
        if (!image.rows.length) {
          await query(client, `INSERT INTO ${this.uploads} (name, mime_type, bytes) VALUES ($1, $2, $3)`, [name, mimeType, bytes]);
        }
      }
      for (const name of DOCUMENT_NAMES) {
        await query(client, `INSERT INTO ${this.documents} (name, value) VALUES ($1, $2::jsonb)`, [name, JSON.stringify(documents[name])]);
      }
      await query(client, 'COMMIT');
      return { imported: true };
    } catch (error) {
      try { await query(client, 'ROLLBACK'); }
      catch (rollbackError) { console.error('Échec de l’annulation PostgreSQL :', rollbackError.message); }
      throw error;
    } finally {
      await client.close();
    }
  }

  async readMany(names) {
    const selected = documentNames(names);
    const result = await query(this.pool, `SELECT name, value FROM ${this.documents} WHERE name = ANY($1::text[])`, [selected]);
    const documents = Object.fromEntries(result.rows.map(row => [row.name, row.value]));
    for (const name of selected) {
      if (!Object.hasOwn(documents, name) && OPTIONAL_DOCUMENTS.has(name)) documents[name] = structuredClone(DOCUMENT_DEFAULTS[name]);
      if (!Object.hasOwn(documents, name)) throw new Error(`Document PostgreSQL manquant : ${name}.`);
      validateDocument(name, documents[name]);
    }
    return documents;
  }

  async read(name) {
    return (await this.readMany([name]))[name];
  }

  async change(names, mutate) {
    const selected = documentNames(names);
    return this.transaction(async client => {
      for (const name of selected) {
        await query(client, 'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [`${this.schema}.prime_cars_documents`, name]);
        if (OPTIONAL_DOCUMENTS.has(name)) {
          await query(client, `INSERT INTO ${this.documents} (name, value) VALUES ($1, $2::jsonb) ON CONFLICT (name) DO NOTHING`, [name, JSON.stringify(DOCUMENT_DEFAULTS[name])]);
        }
      }
      const result = await query(client, `SELECT name, value FROM ${this.documents} WHERE name = ANY($1::text[]) FOR UPDATE`, [selected]);
      const documents = Object.fromEntries(result.rows.map(row => [row.name, row.value]));
      for (const name of selected) {
        if (!Object.hasOwn(documents, name)) throw new Error(`Document PostgreSQL manquant : ${name}.`);
        validateDocument(name, documents[name]);
      }
      const value = await mutate(documents);
      for (const name of selected) {
        validateDocument(name, documents[name]);
        await query(client, `UPDATE ${this.documents} SET value = $2::jsonb, updated_at = now() WHERE name = $1`, [name, JSON.stringify(documents[name])]);
      }
      return value;
    });
  }

  async write(name, value) {
    await this.change([name], documents => { documents[name] = value; });
  }

  async putUpload(name, mimeType, bytes) {
    await query(this.pool, `INSERT INTO ${this.uploads} (name, mime_type, bytes) VALUES ($1, $2, $3)`, [uploadName(name), mimeType, bytes]);
  }

  async getUpload(name) {
    const result = await query(this.pool, `SELECT mime_type, bytes FROM ${this.uploads} WHERE name = $1`, [uploadName(name)]);
    return result.rows.length ? { mimeType: result.rows[0].mime_type, bytes: result.rows[0].bytes } : null;
  }

  async deleteUploads(names) {
    if (names.length) await query(this.pool, `DELETE FROM ${this.uploads} WHERE name = ANY($1::text[])`, [names.map(uploadName)]);
  }

  async close() {
    await this.pool.close();
  }
}

function createStorage({ databaseUrl, pooledUrl, schema, dataDir, uploadDir }) {
  const options = { databaseUrl, pooledUrl, schema, dataDir, uploadDir };
  return databaseUrl || pooledUrl ? new PostgresStorage(options) : new FileStorage(options);
}

function storageFromEnvironment(root) {
  return createStorage({
    databaseUrl: process.env.DATABASE_URL,
    pooledUrl: process.env.DATABASE_URL_POOLED,
    schema: process.env.DATABASE_SCHEMA,
    dataDir: path.resolve(process.env.DATA_DIR || path.join(root, 'data')),
    uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(root, 'uploads'))
  });
}

module.exports = { createStorage, storageFromEnvironment, DOCUMENT_NAMES, IMAGE_NAME_RE, uploadNameFromUrl };
