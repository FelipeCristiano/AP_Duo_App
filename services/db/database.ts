import { Platform } from 'react-native'
import type { SQLiteDatabase } from 'expo-sqlite'

export const isWeb = Platform.OS === 'web'

let _db: SQLiteDatabase | null = null

export function getDb(): SQLiteDatabase {
  if (!_db) throw new Error('Banco não inicializado')
  return _db
}

export async function initDatabase(): Promise<void> {
  if (isWeb) {
    console.log('Web/Electron: usando localStorage')
    return
  }

  const SQLite = await import('expo-sqlite')
  _db = SQLite.openDatabaseSync('apduo.db')

  await _db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS projects (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      client       TEXT    NOT NULL,
      client_email TEXT,
      description  TEXT,
      type         TEXT,
      status       TEXT    DEFAULT 'draft',
      accent       TEXT    DEFAULT '#1A1A1A',
      logo_uri     TEXT,
      cover_uri    TEXT,
      pdf_uri      TEXT,
      created_at   TEXT    DEFAULT (datetime('now')),
      updated_at   TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name       TEXT    NOT NULL,
      order_idx  INTEGER DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name        TEXT    NOT NULL,
      description TEXT,
      variations  TEXT,
      notes       TEXT,
      image_uri   TEXT,
      link        TEXT,
      price       REAL    DEFAULT 0,
      quantity    INTEGER DEFAULT 1,
      store       TEXT,
      created_at  TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
  `)

  await runMigrations()
}

async function runMigrations(): Promise<void> {
  if (!_db) return
  const migrations = [
    `ALTER TABLE projects ADD COLUMN client_email TEXT`,
    `ALTER TABLE projects ADD COLUMN pdf_uri TEXT`,
    `ALTER TABLE products ADD COLUMN variations TEXT`,
    `ALTER TABLE products ADD COLUMN notes TEXT`,
  ]
  for (const sql of migrations) {
    try { await _db.execAsync(sql) } catch { }
  }
}