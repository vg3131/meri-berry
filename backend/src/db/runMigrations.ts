import fs from "node:fs/promises";
import path from "node:path";
import { db } from "./client";

async function runMigrations() {
  const migrationsDir = path.resolve(__dirname, "migrations");
  const seedFile = path.resolve(__dirname, "seeds/devSeed.sql");

  // Create migrations tracking table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  const applied = new Set(
    (db.prepare("SELECT filename FROM _migrations").all() as { filename: string }[]).map(
      (r) => r.filename,
    ),
  );

  const insertMigration = db.prepare("INSERT INTO _migrations (filename) VALUES (?)");

  // Bootstrap: if _migrations is empty but the workers table already exists,
  // the DB was created before migration tracking was added — mark 001 as applied.
  if (applied.size === 0) {
    const workersExists = db
      .prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='workers'`)
      .get();
    if (workersExists) {
      insertMigration.run("001_init.sql");
      applied.add("001_init.sql");
      console.log("Bootstrapped migration tracking: marked 001_init.sql as already applied");
    }
  }

  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping already-applied migration: ${file}`);
      continue;
    }

    const fullPath = path.join(migrationsDir, file);
    const sql = await fs.readFile(fullPath, "utf-8");
    db.exec(sql);
    insertMigration.run(file);
    console.log(`Applied migration: ${file}`);
  }

  if (process.env.NODE_ENV !== "production") {
    const seedSql = await fs.readFile(seedFile, "utf-8");
    db.exec(seedSql);
    console.log("Applied dev seed");
  }
}

runMigrations()
  .then(() => console.log("DB setup complete"))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => db.close());
