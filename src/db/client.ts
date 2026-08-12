import { invoke } from "@tauri-apps/api/core";
import type {
  Expense, ExpensePayload, ExpenseUpdatePayload,
  Organization, Sale, SalePayload, SaleUpdatePayload,
} from "../types/ledger";
import type { LedgerConfig } from "../config/schema";

function notifyLedgerChanged() {
  window.dispatchEvent(new Event("ledger:changed"));
}

export async function recordSale(sale: SalePayload): Promise<number> {
  const result = await invoke<number>("record_sale", {
    sale: {
      cycle: sale.cycle,
      item_id: sale.itemId,
      base_price: sale.basePrice,
      modifiers_json: JSON.stringify(sale.modifiers),
      total: sale.total,
      payment_method: sale.paymentMethod,
      payment_status: sale.paymentStatus,
      amount_received: sale.amountReceived,
      change_amount: sale.changeAmount,
      notes: sale.notes,
      org_id: sale.orgId,
    },
  });
  notifyLedgerChanged();
  return result;
}

export function getSales(): Promise<Sale[]> {
  return invoke<Sale[]>("get_sales");
}

export function getSalesCount(): Promise<number> {
  return invoke<number>("get_sales_count");
}

export async function updateSale(sale: SaleUpdatePayload): Promise<void> {
  await invoke<void>("update_sale", {
    sale: {
      id: sale.id,
      item_id: sale.itemId,
      payment_method: sale.paymentMethod,
      payment_status: sale.paymentStatus,
      amount_received: sale.amountReceived,
      notes: sale.notes,
    },
  });
  notifyLedgerChanged();
}

export async function deleteSale(id: number): Promise<void> {
  await invoke<void>("delete_sale", { id });
  notifyLedgerChanged();
}

export async function recordExpense(expense: ExpensePayload): Promise<number> {
  const result = await invoke<number>("record_expense", {
    expense: {
      expense_date: expense.expenseDate,
      label: expense.label,
      amount: expense.amount,
      paid_by: expense.paidBy,
      notes: expense.notes,
    },
  });
  notifyLedgerChanged();
  return result;
}

export function getExpenses(): Promise<Expense[]> {
  return invoke<Expense[]>("get_expenses");
}

export async function updateExpense(expense: ExpenseUpdatePayload): Promise<void> {
  await invoke<void>("update_expense", {
    expense: {
      id: expense.id,
      expense_date: expense.expenseDate,
      label: expense.label,
      amount: expense.amount,
      paid_by: expense.paidBy,
      notes: expense.notes,
    },
  });
  notifyLedgerChanged();
}

export async function deleteExpense(id: number): Promise<void> {
  await invoke<void>("delete_expense", { id });
  notifyLedgerChanged();
}

export function getOrganizations(): Promise<Organization[]> {
  return invoke<Organization[]>("get_organizations");
}

export async function addOrganization(name: string): Promise<string> {
  const id = await invoke<string>("add_organization", { name });
  notifyLedgerChanged();
  return id;
}

export async function removeOrganization(id: string): Promise<void> {
  await invoke<void>("remove_organization", { id });
  notifyLedgerChanged();
}

export async function adjustOrganizationUsage(id: string, delta: number): Promise<number> {
  const newCount = await invoke<number>("adjust_organization_usage", { id, delta });
  notifyLedgerChanged();
  return newCount;
}

export function getConfig(): Promise<LedgerConfig> {
  return invoke<LedgerConfig>("get_config");
}

export async function saveConfig(config: LedgerConfig): Promise<void> {
  await invoke<void>("save_config", { config });
  notifyLedgerChanged();
}

export function exportReport(): Promise<string> {
  return invoke<string>("export_report");
}