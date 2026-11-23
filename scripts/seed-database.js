const fs = require('node:fs');
const path = require('node:path');
const { storageFromEnvironment } = require('../storage');

const root = path.join(__dirname, '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

async function main() {
  const storage = storageFromEnvironment(root);
  try {
    if (storage.kind !== 'postgres') throw new Error('Configurez DATABASE_URL avant d’initialiser PostgreSQL.');
    const result = await storage.seed({ emptyCatalog: process.env.SEED_EMPTY_CATALOG === 'true' });
    console.log(result.imported
      ? 'Base PostgreSQL initialisée avec les données locales.'
      : 'Base PostgreSQL déjà initialisée : aucune donnée existante modifiée.');
  } finally {
    await storage.close();
  }
}

main().catch(error => {
  console.error('Initialisation PostgreSQL impossible :', error.message);
  process.exitCode = 1;
});
