mod commands;
mod db;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let connection = db::init_connection(&app_data_dir)
                .map_err(|error| Box::new(error) as Box<dyn std::error::Error>)?;

            app.manage(db::Db(std::sync::Mutex::new(connection)));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::record_sale,
            commands::get_sales,
            commands::get_sales_count,
            commands::update_sale,
            commands::delete_sale,
            commands::record_expense,
            commands::get_expenses,
            commands::update_expense,
            commands::delete_expense,
            commands::get_organizations,
            commands::add_organization,
            commands::remove_organization,
            commands::adjust_organization_usage,
            commands::get_config,
            commands::save_config,
            commands::export_report
        ])
        .run(tauri::generate_context!())
        .expect("error while running EmpressLedger");
}