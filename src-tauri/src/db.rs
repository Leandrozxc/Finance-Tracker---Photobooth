use rusqlite::{Connection, Result};
use std::path::Path;
use std::sync::Mutex;

pub struct Db(pub Mutex<Connection>);

fn column_exists(conn: &Connection, table: &str, column: &str) -> bool {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({table})"))
        .unwrap();
    let mut rows = stmt.query([]).unwrap();
    while let Some(row) = rows.next().unwrap() {
        let name: String = row.get(1).unwrap();
        if name == column {
            return true;
        }
    }
    false
}

const DEFAULT_CONFIG_JSON: &str = r#"{
  "projectName": "emPress co. Photo Booth",
  "currencySymbol": "₱",
  "cycleLabel": "Booth Day",
  "cycleCount": 4,
  "currentCycle": 1,
  "items": [
    { "id": "2x2", "name": "2x2", "basePrice": 50, "includedUnits": 1, "active": true },
    { "id": "1x3", "name": "1x3", "basePrice": 50, "includedUnits": 2, "active": true }
  ],
  "modifiers": [
    { "id": "extra_copy", "label": "Extra copy", "price": 25, "unit": "per_item" },
    { "id": "frame", "label": "Different frame", "price": 5, "unit": "per_item" }
  ],
  "paymentMethods": ["Cash", "GCash"],
  "expenseLabels": ["Ink", "Photo Paper", "Props", "Transport", "Food", "Other"]
}"#;

pub fn init_connection(app_data_dir: &Path) -> Result<Connection> {
    std::fs::create_dir_all(app_data_dir)
        .map_err(|_| rusqlite::Error::InvalidPath(app_data_dir.to_path_buf()))?;

    let database_path = app_data_dir.join("empress_ledger.db");
    let conn = Connection::open(database_path)?;

    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recorded_at TEXT NOT NULL,
            cycle INTEGER NOT NULL,
            item_id TEXT NOT NULL,
            base_price REAL NOT NULL,
            modifiers_json TEXT NOT NULL,
            total REAL NOT NULL,
            payment_method TEXT NOT NULL,
            payment_status TEXT NOT NULL,
            amount_received REAL NOT NULL,
            change_amount REAL NOT NULL,
            notes TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expense_date TEXT NOT NULL,
            label TEXT NOT NULL,
            amount REAL NOT NULL,
            paid_by TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS organizations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            usage_count INTEGER NOT NULL DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS app_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            data TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_sales_cycle ON sales(cycle);
        CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);
        CREATE INDEX IF NOT EXISTS idx_sales_item_id ON sales(item_id);
        CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
        ",
    )?;

    if !column_exists(&conn, "sales", "org_id") {
        conn.execute("ALTER TABLE sales ADD COLUMN org_id TEXT", [])?;
    }

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sales_org_id ON sales(org_id)",
        [],
    )?;

    let config_row_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM app_config WHERE id = 1", [], |row| row.get(0))?;
    if config_row_count == 0 {
        conn.execute(
            "INSERT INTO app_config (id, data) VALUES (1, ?1)",
            [DEFAULT_CONFIG_JSON],
        )?;
    }

    Ok(conn)
}