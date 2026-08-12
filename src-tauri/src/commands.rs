use rusqlite::params;
use rust_xlsxwriter::{Format, Workbook};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Manager, State};
use uuid::Uuid;

use crate::db::Db;

#[derive(Debug, Deserialize)]
pub struct SaleInput {
    pub cycle: i64,
    pub item_id: String,
    pub base_price: f64,
    pub modifiers_json: String,
    pub total: f64,
    pub payment_method: String,
    pub payment_status: String,
    pub amount_received: f64,
    pub change_amount: f64,
    pub notes: String,
    pub org_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SaleUpdate {
    pub id: i64,
    pub item_id: String,
    pub payment_method: String,
    pub payment_status: String,
    pub amount_received: f64,
    pub notes: String,
}

#[derive(Debug, Deserialize)]
pub struct ExpenseInput {
    pub expense_date: String,
    pub label: String,
    pub amount: f64,
    pub paid_by: String,
    pub notes: String,
}

#[derive(Debug, Deserialize)]
pub struct ExpenseUpdate {
    pub id: i64,
    pub expense_date: String,
    pub label: String,
    pub amount: f64,
    pub paid_by: String,
    pub notes: String,
}

#[derive(Debug, Serialize)]
pub struct Sale {
    pub id: i64,
    pub recorded_at: String,
    pub cycle: i64,
    pub item_id: String,
    pub base_price: f64,
    pub modifiers_json: String,
    pub total: f64,
    pub payment_method: String,
    pub payment_status: String,
    pub amount_received: f64,
    pub change_amount: f64,
    pub notes: String,
    pub org_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Expense {
    pub id: i64,
    pub expense_date: String,
    pub label: String,
    pub amount: f64,
    pub paid_by: String,
    pub notes: String,
}

#[derive(Debug, Serialize)]
pub struct Organization {
    pub id: String,
    pub name: String,
    pub usage_count: i64,
    pub active: bool,
}

#[tauri::command]
pub fn record_sale(db: State<Db>, sale: SaleInput) -> Result<i64, String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;

    conn.execute(
        "
        INSERT INTO sales (
            recorded_at, cycle, item_id, base_price, modifiers_json, total,
            payment_method, payment_status, amount_received, change_amount, notes, org_id
        )
        VALUES (datetime('now'), ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        ",
        params![
            sale.cycle,
            sale.item_id,
            sale.base_price,
            sale.modifiers_json,
            sale.total,
            sale.payment_method,
            sale.payment_status,
            sale.amount_received,
            sale.change_amount,
            sale.notes,
            sale.org_id,
        ],
    )
    .map_err(|error| error.to_string())?;

    if let Some(org_id) = &sale.org_id {
        conn.execute(
            "UPDATE organizations SET usage_count = usage_count + 1 WHERE id = ?1",
            params![org_id],
        )
        .map_err(|error| error.to_string())?;
    }

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn get_sales(db: State<Db>) -> Result<Vec<Sale>, String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;

    let mut statement = conn
        .prepare(
            "SELECT id, recorded_at, cycle, item_id, base_price, modifiers_json, total,
                    payment_method, payment_status, amount_received, change_amount, notes, org_id
             FROM sales ORDER BY id DESC",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(Sale {
                id: row.get(0)?,
                recorded_at: row.get(1)?,
                cycle: row.get(2)?,
                item_id: row.get(3)?,
                base_price: row.get(4)?,
                modifiers_json: row.get(5)?,
                total: row.get(6)?,
                payment_method: row.get(7)?,
                payment_status: row.get(8)?,
                amount_received: row.get(9)?,
                change_amount: row.get(10)?,
                notes: row.get(11)?,
                org_id: row.get(12)?,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_sales_count(db: State<Db>) -> Result<i64, String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;
    conn.query_row("SELECT COUNT(*) FROM sales", [], |row| row.get(0))
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_sale(db: State<Db>, sale: SaleUpdate) -> Result<(), String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;

    conn.execute(
        "UPDATE sales SET item_id = ?1, payment_method = ?2, payment_status = ?3,
                           amount_received = ?4, notes = ?5
         WHERE id = ?6",
        params![
            sale.item_id,
            sale.payment_method,
            sale.payment_status,
            sale.amount_received,
            sale.notes,
            sale.id,
        ],
    )
    .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_sale(db: State<Db>, id: i64) -> Result<(), String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;

    let org_id: Option<String> = conn
        .query_row("SELECT org_id FROM sales WHERE id = ?1", params![id], |row| row.get(0))
        .map_err(|error| error.to_string())?;

    conn.execute("DELETE FROM sales WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;

    if let Some(org_id) = org_id {
        conn.execute(
            "UPDATE organizations SET usage_count = MAX(0, usage_count - 1) WHERE id = ?1",
            params![org_id],
        )
        .map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn record_expense(db: State<Db>, expense: ExpenseInput) -> Result<i64, String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;

    conn.execute(
        "INSERT INTO expenses (expense_date, label, amount, paid_by, notes)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![expense.expense_date, expense.label, expense.amount, expense.paid_by, expense.notes],
    )
    .map_err(|error| error.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn get_expenses(db: State<Db>) -> Result<Vec<Expense>, String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;

    let mut statement = conn
        .prepare("SELECT id, expense_date, label, amount, paid_by, notes FROM expenses ORDER BY id DESC")
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(Expense {
                id: row.get(0)?,
                expense_date: row.get(1)?,
                label: row.get(2)?,
                amount: row.get(3)?,
                paid_by: row.get(4)?,
                notes: row.get(5)?,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_expense(db: State<Db>, expense: ExpenseUpdate) -> Result<(), String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;

    conn.execute(
        "UPDATE expenses SET expense_date = ?1, label = ?2, amount = ?3, paid_by = ?4, notes = ?5
         WHERE id = ?6",
        params![expense.expense_date, expense.label, expense.amount, expense.paid_by, expense.notes, expense.id],
    )
    .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_expense(db: State<Db>, id: i64) -> Result<(), String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;
    conn.execute("DELETE FROM expenses WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_organizations(db: State<Db>) -> Result<Vec<Organization>, String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;

    let mut statement = conn
        .prepare("SELECT id, name, usage_count, active FROM organizations ORDER BY name")
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], |row| {
            let active: i64 = row.get(3)?;
            Ok(Organization {
                id: row.get(0)?,
                name: row.get(1)?,
                usage_count: row.get(2)?,
                active: active != 0,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn add_organization(db: State<Db>, name: String) -> Result<String, String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO organizations (id, name, usage_count, active) VALUES (?1, ?2, 0, 1)",
        params![id, name],
    )
    .map_err(|error| error.to_string())?;

    Ok(id)
}

#[tauri::command]
pub fn remove_organization(db: State<Db>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;
    conn.execute("DELETE FROM organizations WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn adjust_organization_usage(db: State<Db>, id: String, delta: i64) -> Result<i64, String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;

    conn.execute(
        "UPDATE organizations SET usage_count = MAX(0, usage_count + ?1) WHERE id = ?2",
        params![delta, id],
    )
    .map_err(|error| error.to_string())?;

    let new_count: i64 = conn
        .query_row("SELECT usage_count FROM organizations WHERE id = ?1", params![id], |row| row.get(0))
        .map_err(|error| error.to_string())?;

    Ok(new_count)
}

#[tauri::command]
pub fn get_config(db: State<Db>) -> Result<serde_json::Value, String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;

    let data: String = conn
        .query_row("SELECT data FROM app_config WHERE id = 1", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;

    serde_json::from_str(&data).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_config(db: State<Db>, config: serde_json::Value) -> Result<(), String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;
    let data = serde_json::to_string(&config).map_err(|error| error.to_string())?;

    conn.execute("UPDATE app_config SET data = ?1 WHERE id = 1", params![data])
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn export_report(db: State<Db>, app_handle: tauri::AppHandle) -> Result<String, String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;

    let config_data: String = conn
        .query_row("SELECT data FROM app_config WHERE id = 1", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;
    let config: serde_json::Value =
        serde_json::from_str(&config_data).map_err(|error| error.to_string())?;
    let currency = config
        .get("currencySymbol")
        .and_then(|v| v.as_str())
        .unwrap_or("$")
        .to_string();
    let project_name = config
        .get("projectName")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let mut sales_stmt = conn
        .prepare(
            "SELECT id, recorded_at, cycle, item_id, base_price, total,
                    payment_method, payment_status, amount_received, notes, org_id
             FROM sales ORDER BY id ASC",
        )
        .map_err(|error| error.to_string())?;
    let sales: Vec<(i64, String, i64, String, f64, f64, String, String, f64, String, Option<String>)> =
        sales_stmt
            .query_map([], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                    row.get(8)?,
                    row.get(9)?,
                    row.get(10)?,
                ))
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
    drop(sales_stmt);

    let mut expenses_stmt = conn
        .prepare("SELECT id, expense_date, label, amount, paid_by, notes FROM expenses ORDER BY id ASC")
        .map_err(|error| error.to_string())?;
    let expenses: Vec<(i64, String, String, f64, String, String)> = expenses_stmt
        .query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    drop(expenses_stmt);
    drop(conn);

    let total_sales: f64 = sales.iter().filter(|s| s.7 == "Paid").map(|s| s.5).sum();
    let total_expenses: f64 = expenses.iter().map(|e| e.3).sum();
    let profit = total_sales - total_expenses;
    let paid_orders = sales.iter().filter(|s| s.7 == "Paid").count();

    let mut workbook = Workbook::new();
    let header_format = Format::new()
        .set_bold()
        .set_background_color("#1F2937")
        .set_font_color("#FFFFFF");
    let money_format = Format::new().set_num_format(format!("\"{currency}\"#,##0.00"));
    let bold_format = Format::new().set_bold();

    let summary_sheet = workbook
        .add_worksheet()
        .set_name("Summary")
        .map_err(|error| error.to_string())?;
    summary_sheet
        .write_with_format(0, 0, project_name.as_str(), &bold_format)
        .map_err(|error| error.to_string())?;
    summary_sheet
        .write_with_format(2, 0, "Total Sales (Paid)", &bold_format)
        .map_err(|error| error.to_string())?;
    summary_sheet
        .write_with_format(2, 1, total_sales, &money_format)
        .map_err(|error| error.to_string())?;
    summary_sheet
        .write_with_format(3, 0, "Total Expenses", &bold_format)
        .map_err(|error| error.to_string())?;
    summary_sheet
        .write_with_format(3, 1, total_expenses, &money_format)
        .map_err(|error| error.to_string())?;
    summary_sheet
        .write_with_format(4, 0, "Profit", &bold_format)
        .map_err(|error| error.to_string())?;
    summary_sheet
        .write_with_format(4, 1, profit, &money_format)
        .map_err(|error| error.to_string())?;
    summary_sheet
        .write_with_format(5, 0, "Paid Orders", &bold_format)
        .map_err(|error| error.to_string())?;
    summary_sheet
        .write_number(5, 1, paid_orders as f64)
        .map_err(|error| error.to_string())?;
    summary_sheet.autofit();

    let sales_sheet = workbook
        .add_worksheet()
        .set_name("Sales")
        .map_err(|error| error.to_string())?;
    let sales_headers = [
        "ID", "Recorded At", "Booth Day", "Item", "Base Price", "Total",
        "Payment Method", "Payment Status", "Amount Received", "Notes", "Org ID",
    ];
    for (col, heading) in sales_headers.iter().enumerate() {
        sales_sheet
            .write_with_format(0, col as u16, *heading, &header_format)
            .map_err(|error| error.to_string())?;
    }
    for (index, sale) in sales.iter().enumerate() {
        let row = (index + 1) as u32;
        sales_sheet.write_number(row, 0, sale.0 as f64).map_err(|e| e.to_string())?;
        sales_sheet.write_string(row, 1, &sale.1).map_err(|e| e.to_string())?;
        sales_sheet.write_number(row, 2, sale.2 as f64).map_err(|e| e.to_string())?;
        sales_sheet.write_string(row, 3, &sale.3).map_err(|e| e.to_string())?;
        sales_sheet.write_with_format(row, 4, sale.4, &money_format).map_err(|e| e.to_string())?;
        sales_sheet.write_with_format(row, 5, sale.5, &money_format).map_err(|e| e.to_string())?;
        sales_sheet.write_string(row, 6, &sale.6).map_err(|e| e.to_string())?;
        sales_sheet.write_string(row, 7, &sale.7).map_err(|e| e.to_string())?;
        sales_sheet.write_with_format(row, 8, sale.8, &money_format).map_err(|e| e.to_string())?;
        sales_sheet.write_string(row, 9, &sale.9).map_err(|e| e.to_string())?;
        sales_sheet
            .write_string(row, 10, sale.10.clone().unwrap_or_default())
            .map_err(|e| e.to_string())?;
    }
    sales_sheet.autofit();

    let expenses_sheet = workbook
        .add_worksheet()
        .set_name("Expenses")
        .map_err(|error| error.to_string())?;
    let expense_headers = ["ID", "Date", "Label", "Amount", "Paid By", "Notes"];
    for (col, heading) in expense_headers.iter().enumerate() {
        expenses_sheet
            .write_with_format(0, col as u16, *heading, &header_format)
            .map_err(|error| error.to_string())?;
    }
    for (index, expense) in expenses.iter().enumerate() {
        let row = (index + 1) as u32;
        expenses_sheet.write_number(row, 0, expense.0 as f64).map_err(|e| e.to_string())?;
        expenses_sheet.write_string(row, 1, &expense.1).map_err(|e| e.to_string())?;
        expenses_sheet.write_string(row, 2, &expense.2).map_err(|e| e.to_string())?;
        expenses_sheet.write_with_format(row, 3, expense.3, &money_format).map_err(|e| e.to_string())?;
        expenses_sheet.write_string(row, 4, &expense.4).map_err(|e| e.to_string())?;
        expenses_sheet.write_string(row, 5, &expense.5).map_err(|e| e.to_string())?;
    }
    expenses_sheet.autofit();

    let settings_sheet = workbook
        .add_worksheet()
        .set_name("Settings")
        .map_err(|error| error.to_string())?;
    settings_sheet
        .write_with_format(0, 0, "Setting", &header_format)
        .map_err(|error| error.to_string())?;
    settings_sheet
        .write_with_format(0, 1, "Value", &header_format)
        .map_err(|error| error.to_string())?;
    settings_sheet.write_string(1, 0, "Project Name").map_err(|e| e.to_string())?;
    settings_sheet.write_string(1, 1, &project_name).map_err(|e| e.to_string())?;
    settings_sheet.write_string(2, 0, "Currency Symbol").map_err(|e| e.to_string())?;
    settings_sheet.write_string(2, 1, &currency).map_err(|e| e.to_string())?;
    settings_sheet.write_string(3, 0, "Raw Config (JSON)").map_err(|e| e.to_string())?;
    settings_sheet
        .write_string(3, 1, &serde_json::to_string_pretty(&config).unwrap_or_default())
        .map_err(|e| e.to_string())?;
    settings_sheet.autofit();

    let app_data_dir = app_handle.path().app_data_dir().map_err(|error| error.to_string())?;
    let export_dir = app_data_dir.join("exports");
    std::fs::create_dir_all(&export_dir).map_err(|error| error.to_string())?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_secs();
    let file_path = export_dir.join(format!("EmpressLedger_Report_{timestamp}.xlsx"));

    workbook.save(&file_path).map_err(|error| error.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}