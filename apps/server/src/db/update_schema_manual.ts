import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../../sqlite.db');
console.log(`Checking database at: ${dbPath}`);

const db = new Database(dbPath);

try {
  // 1. Проверяем текущие колонки в таблице menu_item_ingredient_overrides
  const tableInfo = db.prepare("PRAGMA table_info(menu_item_ingredient_overrides)").all() as Array<{ name: string }>;
  const columns = tableInfo.map(c => c.name);
  console.log(`Current columns in menu_item_ingredient_overrides: ${columns.join(', ')}`);

  db.transaction(() => {
    // В SQLite нельзя просто так сделать ALTER TABLE DROP NOT NULL или ADD COLUMN c FOREIGN KEY в существующих таблицах без ограничений.
    // Самый надежный способ в SQLite - воссоздать таблицу с новой структурой, перенести старые данные и переименовать ее!

    console.log("Creating temporary table with new schema...");
    db.prepare(`
      CREATE TABLE IF NOT EXISTS menu_item_ingredient_overrides_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        menu_item_id INTEGER NOT NULL REFERENCES menu_item_recipes(id) ON DELETE CASCADE,
        recipe_ingredient_id INTEGER REFERENCES recipe_ingredients(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        sub_recipe_id INTEGER REFERENCES recipes(id),
        age_group TEXT,
        gross_weight REAL NOT NULL,
        net_weight REAL NOT NULL
      )
    `).run();

    console.log("Checking if old table has data...");
    const hasOldTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='menu_item_ingredient_overrides'").get();

    if (hasOldTable) {
      console.log("Copying data from old table to new table...");
      // Копируем только те колонки, которые были в старой схеме (id, menu_item_id, recipe_ingredient_id, gross_weight, net_weight)
      db.prepare(`
        INSERT INTO menu_item_ingredient_overrides_new (id, menu_item_id, recipe_ingredient_id, gross_weight, net_weight)
        SELECT id, menu_item_id, recipe_ingredient_id, gross_weight, net_weight FROM menu_item_ingredient_overrides
      `).run();

      console.log("Dropping old table...");
      db.prepare("DROP TABLE menu_item_ingredient_overrides").run();
    }

    console.log("Renaming new table...");
    db.prepare("ALTER TABLE menu_item_ingredient_overrides_new RENAME TO menu_item_ingredient_overrides").run();
    console.log("Table menu_item_ingredient_overrides successfully migrated!");
  })();

} catch (e) {
  console.error("Migration failed:", e);
} finally {
  db.close();
}
