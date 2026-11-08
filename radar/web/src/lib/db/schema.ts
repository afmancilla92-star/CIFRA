/**
 * Esquema SQLite/libSQL. Se aplica de forma idempotente al primer uso
 * (CREATE ... IF NOT EXISTS), así funciona igual con un archivo local o Turso.
 */
export const SCHEMA_VERSION = 1;

export const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS meta (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   )`,

  `CREATE TABLE IF NOT EXISTS advertisers (
     page_id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     page_url TEXT,
     avatar_url TEXT,
     likes INTEGER,
     categories TEXT NOT NULL DEFAULT '[]',
     main_niche TEXT,
     total_ads INTEGER NOT NULL DEFAULT 0,
     active_ads INTEGER NOT NULL DEFAULT 0,
     landing_count INTEGER NOT NULL DEFAULT 0,
     first_seen_at TEXT NOT NULL,
     last_seen_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS advertisers_active_idx ON advertisers(active_ads DESC)`,

  `CREATE TABLE IF NOT EXISTS ads (
     id TEXT PRIMARY KEY,
     page_id TEXT NOT NULL,
     page_name TEXT NOT NULL,
     is_active INTEGER NOT NULL DEFAULT 1,
     start_date TEXT,
     stop_date TEXT,
     platforms TEXT NOT NULL DEFAULT '[]',
     languages TEXT NOT NULL DEFAULT '[]',
     countries TEXT NOT NULL DEFAULT '[]',
     language TEXT,
     body TEXT,
     title TEXT,
     link_description TEXT,
     caption TEXT,
     cta_text TEXT,
     link_url TEXT,
     landing_key TEXT,
     landing_domain TEXT,
     format TEXT NOT NULL DEFAULT 'unknown',
     media TEXT NOT NULL DEFAULT '[]',
     media_expires_at TEXT,
     collation_id TEXT,
     collation_count INTEGER,
     message_hash TEXT,
     offers TEXT NOT NULL DEFAULT '[]',
     niche TEXT,
     niche_confidence REAL,
     niche_source TEXT,
     niche_terms TEXT NOT NULL DEFAULT '[]',
     eu_total_reach INTEGER,
     sources TEXT NOT NULL DEFAULT '[]',
     is_manual INTEGER NOT NULL DEFAULT 0,
     partial INTEGER NOT NULL DEFAULT 0,
     score INTEGER NOT NULL DEFAULT 0,
     score_breakdown TEXT NOT NULL DEFAULT '[]',
     first_seen_at TEXT NOT NULL,
     last_seen_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS ads_page_idx ON ads(page_id)`,
  `CREATE INDEX IF NOT EXISTS ads_start_idx ON ads(start_date)`,
  `CREATE INDEX IF NOT EXISTS ads_score_idx ON ads(score DESC)`,
  `CREATE INDEX IF NOT EXISTS ads_landing_idx ON ads(landing_key)`,
  `CREATE INDEX IF NOT EXISTS ads_domain_idx ON ads(landing_domain)`,
  `CREATE INDEX IF NOT EXISTS ads_niche_idx ON ads(niche)`,
  `CREATE INDEX IF NOT EXISTS ads_hash_idx ON ads(page_id, message_hash)`,
  `CREATE INDEX IF NOT EXISTS ads_seen_idx ON ads(last_seen_at)`,

  // Búsqueda de texto completo (sin tildes: "envio" encuentra "envío").
  `CREATE VIRTUAL TABLE IF NOT EXISTS ads_fts USING fts5(
     page_name, body, title, link_description, caption,
     content='ads', content_rowid='rowid',
     tokenize='unicode61 remove_diacritics 2'
   )`,
  `CREATE TRIGGER IF NOT EXISTS ads_ai AFTER INSERT ON ads BEGIN
     INSERT INTO ads_fts(rowid, page_name, body, title, link_description, caption)
     VALUES (new.rowid, new.page_name, new.body, new.title, new.link_description, new.caption);
   END`,
  `CREATE TRIGGER IF NOT EXISTS ads_ad AFTER DELETE ON ads BEGIN
     INSERT INTO ads_fts(ads_fts, rowid, page_name, body, title, link_description, caption)
     VALUES ('delete', old.rowid, old.page_name, old.body, old.title, old.link_description, old.caption);
   END`,
  `CREATE TRIGGER IF NOT EXISTS ads_au AFTER UPDATE OF page_name, body, title, link_description, caption ON ads BEGIN
     INSERT INTO ads_fts(ads_fts, rowid, page_name, body, title, link_description, caption)
     VALUES ('delete', old.rowid, old.page_name, old.body, old.title, old.link_description, old.caption);
     INSERT INTO ads_fts(rowid, page_name, body, title, link_description, caption)
     VALUES (new.rowid, new.page_name, new.body, new.title, new.link_description, new.caption);
   END`,

  `CREATE TABLE IF NOT EXISTS favorites (
     ad_id TEXT PRIMARY KEY,
     note TEXT,
     created_at TEXT NOT NULL
   )`,

  // Búsquedas que el cron ejecuta contra la Ad Library API oficial.
  `CREATE TABLE IF NOT EXISTS watch_queries (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     label TEXT NOT NULL,
     search_terms TEXT,
     page_ids TEXT NOT NULL DEFAULT '[]',
     countries TEXT NOT NULL DEFAULT '[]',
     languages TEXT NOT NULL DEFAULT '[]',
     platforms TEXT NOT NULL DEFAULT '[]',
     media_type TEXT NOT NULL DEFAULT 'ALL',
     active_status TEXT NOT NULL DEFAULT 'ACTIVE',
     search_type TEXT NOT NULL DEFAULT 'KEYWORD_UNORDERED',
     enabled INTEGER NOT NULL DEFAULT 1,
     last_run_at TEXT,
     last_status TEXT,
     last_message TEXT,
     last_count INTEGER,
     created_at TEXT NOT NULL
   )`,

  `CREATE TABLE IF NOT EXISTS ingest_log (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     source TEXT NOT NULL,
     context TEXT,
     received INTEGER NOT NULL DEFAULT 0,
     created INTEGER NOT NULL DEFAULT 0,
     updated INTEGER NOT NULL DEFAULT 0,
     skipped INTEGER NOT NULL DEFAULT 0,
     errors TEXT NOT NULL DEFAULT '[]',
     created_at TEXT NOT NULL
   )`,
];
