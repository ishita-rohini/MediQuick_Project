import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'database.json');

const initialData = {
  medicines: [],
  users: [],
  orders: [],
  prescriptions: []
};

fs.mkdirSync(dataDir, { recursive: true });

if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2), 'utf8');
}

function load() {
  try {
    const raw = fs.readFileSync(dbFile, 'utf8');
    const data = JSON.parse(raw);
    return {
      medicines: Array.isArray(data.medicines) ? data.medicines : [],
      users: Array.isArray(data.users) ? data.users : [],
      orders: Array.isArray(data.orders) ? data.orders : [],
      prescriptions: Array.isArray(data.prescriptions) ? data.prescriptions : []
    };
  } catch (error) {
    console.error('Database read error:', error.message);
    return structuredClone(initialData);
  }
}

let db = load();

export function getDB() {
  return db;
}

export function saveDB() {
  const tempFile = `${dbFile}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tempFile, dbFile);
}

export function reloadDB() {
  db = load();
  return db;
}

export const databasePath = dbFile;
