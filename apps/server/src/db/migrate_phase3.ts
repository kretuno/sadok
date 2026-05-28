import Database from 'better-sqlite3';

const db = new Database('sqlite.db');

const tableExists = (tableName: string) => {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);

  return Boolean(row);
};

const columnExists = (tableName: string, columnName: string) => {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return rows.some((column) => column.name === columnName);
};

const addColumnIfMissing = (tableName: string, statement: string, columnName: string) => {
  if (!columnExists(tableName, columnName)) {
    db.prepare(statement).run();
    console.log(`Added column ${tableName}.${columnName}`);
  }
};

const run = () => {
  db.pragma('foreign_keys = ON');

  if (!tableExists('invoice_items')) {
    db.exec(`
      CREATE TABLE invoice_items (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        invoice_id integer NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        product_id integer NOT NULL REFERENCES products(id),
        quantity real NOT NULL,
        unit_price real NOT NULL,
        total_price real NOT NULL,
        expiry_date integer
      );
    `);
    console.log('Created table invoice_items');
  }

  addColumnIfMissing('products', "ALTER TABLE products ADD COLUMN notes text", 'notes');

  addColumnIfMissing('suppliers', "ALTER TABLE suppliers ADD COLUMN phone text", 'phone');
  addColumnIfMissing('suppliers', "ALTER TABLE suppliers ADD COLUMN email text", 'email');
  addColumnIfMissing('suppliers', "ALTER TABLE suppliers ADD COLUMN address text", 'address');
  addColumnIfMissing('suppliers', "ALTER TABLE suppliers ADD COLUMN created_at integer", 'created_at');

  addColumnIfMissing('invoices', "ALTER TABLE invoices ADD COLUMN basis text", 'basis');
  addColumnIfMissing('invoices', "ALTER TABLE invoices ADD COLUMN vat_amount real NOT NULL DEFAULT 0", 'vat_amount');
  addColumnIfMissing('invoices', "ALTER TABLE invoices ADD COLUMN status text NOT NULL DEFAULT 'draft'", 'status');
  addColumnIfMissing('invoices', "ALTER TABLE invoices ADD COLUMN posted_at integer", 'posted_at');
  addColumnIfMissing('invoices', "ALTER TABLE invoices ADD COLUMN created_by integer", 'created_by');

  addColumnIfMissing('product_batches', "ALTER TABLE product_batches ADD COLUMN invoice_item_id integer", 'invoice_item_id');
  addColumnIfMissing('stock_movements', "ALTER TABLE stock_movements ADD COLUMN invoice_id integer", 'invoice_id');

  db.exec(`
    UPDATE invoices
    SET status = CASE
      WHEN status IS NULL OR status = '' THEN CASE WHEN coalesce(is_draft, 0) = 1 THEN 'draft' ELSE 'posted' END
      ELSE status
    END
  `);

  db.exec(`
    UPDATE suppliers
    SET created_at = coalesce(created_at, cast(strftime('%s', 'now') as integer) * 1000)
  `);

  console.log('Phase 3 migration completed');
};

try {
  run();
} finally {
  db.close();
}
