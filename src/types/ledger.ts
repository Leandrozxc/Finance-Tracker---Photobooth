export type PaymentStatus = "Paid" | "Unpaid" | "Canceled";

export interface Sale {
  id: number;
  recorded_at: string;
  cycle: number;
  item_id: string;
  base_price: number;
  modifiers_json: string;
  total: number;
  payment_method: string;
  payment_status: PaymentStatus;
  amount_received: number;
  change_amount: number;
  notes: string;
  org_id: string | null;
}

export interface Expense {
  id: number;
  expense_date: string;
  label: string;
  amount: number;
  paid_by: string;
  notes: string;
}

export interface Organization {
  id: string;
  name: string;
  usage_count: number;
  active: boolean;
}

export interface SalePayload {
  cycle: number;
  itemId: string;
  basePrice: number;
  modifiers: { id: string; qty: number; price: number }[];
  total: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  amountReceived: number;
  changeAmount: number;
  notes: string;
  orgId: string | null;
}

export interface SaleUpdatePayload {
  id: number;
  itemId: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  amountReceived: number;
  notes: string;
}

export interface ExpensePayload {
  expenseDate: string;
  label: string;
  amount: number;
  paidBy: string;
  notes: string;
}

export interface ExpenseUpdatePayload {
  id: number;
  expenseDate: string;
  label: string;
  amount: number;
  paidBy: string;
  notes: string;
}