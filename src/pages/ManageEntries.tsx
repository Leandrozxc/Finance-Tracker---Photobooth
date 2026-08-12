import { useEffect, useState } from "react";
import { Card } from "../components/Card";
import {
  deleteExpense, deleteSale, getExpenses, getSales, updateExpense, updateSale,
} from "../db/client";
import { useLedgerConfig } from "../store/ledgerStore";
import type { Expense, PaymentStatus, Sale } from "../types/ledger";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatRecordedAt(raw: string): string {
  // SQLite's datetime('now') stores UTC with no timezone marker (e.g. "2026-08-12 15:24:01").
  // Mark it explicitly as UTC before parsing, then let the browser render it in local time.
  const isoUtc = raw.includes("T") ? raw : `${raw.replace(" ", "T")}Z`;
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ManageEntries() {
  const config = useLedgerConfig();
  const [tab, setTab] = useState<"sales" | "expenses">("sales");
  const [dayFilter, setDayFilter] = useState<number | "all">("all");
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [error, setError] = useState("");

  function itemName(itemId: string): string {
    return config.items.find((item) => item.id === itemId)?.name ?? itemId;
  }

  async function loadAll() {
    try {
      setSales(await getSales());
      setExpenses(await getExpenses());
    } catch (loadError) {
      setError(`Could not load entries: ${errorMessage(loadError)}`);
    }
  }

  useEffect(() => {
    void loadAll();
    window.addEventListener("ledger:changed", loadAll);
    return () => window.removeEventListener("ledger:changed", loadAll);
  }, []);

  async function handleDeleteSale(sale: Sale) {
    if (!window.confirm(`Delete this sale?`)) return;
    try {
      await deleteSale(sale.id);
    } catch (deleteError) {
      setError(`Could not delete sale: ${errorMessage(deleteError)}`);
    }
  }

  async function handleDeleteExpense(expense: Expense) {
    if (!window.confirm(`Delete this expense?`)) return;
    try {
      await deleteExpense(expense.id);
    } catch (deleteError) {
      setError(`Could not delete expense: ${errorMessage(deleteError)}`);
    }
  }

  const numberedSales = sales.map((sale, index) => ({ sale, number: sales.length - index }));
  const visibleSales = dayFilter === "all"
    ? numberedSales
    : numberedSales.filter(({ sale }) => sale.cycle === dayFilter);

  const dayOptions = Array.from({ length: config.cycleCount }, (_, i) => i + 1);

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-ink mb-6">Manage Entries</h1>

      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2">
          <button
            onClick={() => setTab("sales")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-[0.97] ${tab === "sales" ? "bg-accent text-white shadow-sm shadow-accent/30" : "bg-surface-raised text-ink-muted hover:text-ink hover:bg-surface-hover"}`}
          >
            Sales
          </button>
          <button
            onClick={() => setTab("expenses")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-[0.97] ${tab === "expenses" ? "bg-accent text-white shadow-sm shadow-accent/30" : "bg-surface-raised text-ink-muted hover:text-ink hover:bg-surface-hover"}`}
          >
            Expenses
          </button>
        </div>

        {tab === "sales" && (
          <div className="flex gap-1.5">
            <button
              onClick={() => setDayFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.96] ${dayFilter === "all" ? "bg-ink text-surface" : "bg-surface-raised text-ink-muted hover:text-ink hover:bg-surface-hover"}`}
            >
              All days
            </button>
            {dayOptions.map((day) => (
              <button
                key={day}
                onClick={() => setDayFilter(day)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.96] ${dayFilter === day ? "bg-ink text-surface" : "bg-surface-raised text-ink-muted hover:text-ink hover:bg-surface-hover"}`}
              >
                {config.cycleLabel} {day}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

      {tab === "sales" ? (
        <Card className="p-4">
          {visibleSales.length === 0 ? (
            <p className="py-5 text-sm text-ink-muted">
              {sales.length === 0 ? "No sales recorded yet." : "No sales recorded for this day."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {visibleSales.map(({ sale, number }) =>
                editingSaleId === sale.id ? (
                  <SaleEditRow
                    key={sale.id}
                    sale={sale}
                    onCancel={() => setEditingSaleId(null)}
                    onSaved={() => setEditingSaleId(null)}
                  />
                ) : (
                  <div key={sale.id} className="flex items-center justify-between border-b border-border/50 py-2 text-sm">
                    <span className="text-ink-muted w-9">#{number}</span>
                    <span className="text-xs font-medium text-ink-faint bg-surface-raised rounded-full px-2 py-0.5 w-[76px] text-center">
                      {config.cycleLabel} {sale.cycle}
                    </span>
                    <span className="text-xs text-ink-faint w-28">{formatRecordedAt(sale.recorded_at)}</span>
                    <span className="text-ink-muted flex-1">{itemName(sale.item_id)}</span>
                    <span className="text-ink-muted w-20">{sale.payment_method}</span>
                    <span className="text-ink-muted w-20">{sale.payment_status}</span>
                    <span className="text-ink font-medium w-24">
                      {config.currencySymbol}{sale.total.toFixed(2)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingSaleId(sale.id)}
                        className="text-xs font-medium text-ink-muted border border-border rounded-lg px-3 py-1.5 hover:bg-surface-hover hover:text-ink hover:border-accent/40 transition-all active:scale-[0.97]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSale(sale)}
                        className="text-xs font-medium text-red-300 border border-red-500/30 rounded-lg px-3 py-1.5 hover:bg-red-500/10 hover:border-red-400/50 transition-all active:scale-[0.97]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-4">
          {expenses.length === 0 ? (
            <p className="py-5 text-sm text-ink-muted">No expenses recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {expenses.map((expense, index) =>
                editingExpenseId === expense.id ? (
                  <ExpenseEditRow
                    key={expense.id}
                    expense={expense}
                    onCancel={() => setEditingExpenseId(null)}
                    onSaved={() => setEditingExpenseId(null)}
                  />
                ) : (
                  <div key={expense.id} className="flex items-center justify-between border-b border-border/50 py-2 text-sm">
                    <span className="text-ink-muted w-10">#{expenses.length - index}</span>
                    <span className="text-ink-muted flex-1">{expense.label}</span>
                    <span className="text-ink-muted w-32">{expense.paid_by}</span>
                    <span className="text-ink font-medium w-24">
                      {config.currencySymbol}{expense.amount.toFixed(2)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingExpenseId(expense.id)}
                        className="text-xs font-medium text-ink-muted border border-border rounded-lg px-3 py-1.5 hover:bg-surface-hover hover:text-ink hover:border-accent/40 transition-all active:scale-[0.97]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense)}
                        className="text-xs font-medium text-red-300 border border-red-500/30 rounded-lg px-3 py-1.5 hover:bg-red-500/10 hover:border-red-400/50 transition-all active:scale-[0.97]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function SaleEditRow({ sale, onCancel, onSaved }: { sale: Sale; onCancel: () => void; onSaved: () => void }) {
  const config = useLedgerConfig();
  const [itemId, setItemId] = useState(sale.item_id);
  const [paymentMethod, setPaymentMethod] = useState(sale.payment_method);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(sale.payment_status);
  const [amountReceived, setAmountReceived] = useState(String(sale.amount_received));
  const [notes, setNotes] = useState(sale.notes);
  const [error, setError] = useState("");

  async function save() {
    try {
      await updateSale({
        id: sale.id,
        itemId,
        paymentMethod,
        paymentStatus,
        amountReceived: Number(amountReceived) || 0,
        notes,
      });
      onSaved();
    } catch (saveError) {
      setError(errorMessage(saveError));
    }
  }

  return (
    <div className="border border-border rounded-lg p-3 bg-surface-raised">
      <div className="grid grid-cols-5 gap-2 mb-2">
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="border border-border bg-surface text-ink rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
          {config.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="border border-border bg-surface text-ink rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
          {config.paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
        </select>
        <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)} className="border border-border bg-surface text-ink rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
          <option value="Paid">Paid</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Canceled">Canceled</option>
        </select>
        <input type="number" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} className="border border-border bg-surface text-ink rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="border border-border bg-surface text-ink rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      {error && <div className="text-xs text-red-300 mb-2">{error}</div>}
      <div className="flex gap-2">
        <button onClick={save} className="text-xs font-medium bg-accent text-white rounded-lg px-3 py-1.5 shadow-sm shadow-accent/30 hover:bg-accent-hover transition-all active:scale-[0.97]">Save</button>
        <button onClick={onCancel} className="text-xs font-medium border border-border text-ink-muted rounded-lg px-3 py-1.5 hover:bg-surface-hover transition-all active:scale-[0.97]">Cancel</button>
      </div>
    </div>
  );
}

function ExpenseEditRow({ expense, onCancel, onSaved }: { expense: Expense; onCancel: () => void; onSaved: () => void }) {
  const [expenseDate, setExpenseDate] = useState(expense.expense_date);
  const [label, setLabel] = useState(expense.label);
  const [amount, setAmount] = useState(String(expense.amount));
  const [paidBy, setPaidBy] = useState(expense.paid_by);
  const [error, setError] = useState("");

  async function save() {
    try {
      await updateExpense({
        id: expense.id,
        expenseDate,
        label,
        amount: Number(amount) || 0,
        paidBy,
        notes: expense.notes,
      });
      onSaved();
    } catch (saveError) {
      setError(errorMessage(saveError));
    }
  }

  return (
    <div className="border border-border rounded-lg p-3 bg-surface-raised">
      <div className="grid grid-cols-4 gap-2 mb-2">
        <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="border border-border bg-surface text-ink rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="border border-border bg-surface text-ink rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="border border-border bg-surface text-ink rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        <input value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="border border-border bg-surface text-ink rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      {error && <div className="text-xs text-red-300 mb-2">{error}</div>}
      <div className="flex gap-2">
        <button onClick={save} className="text-xs font-medium bg-accent text-white rounded-lg px-3 py-1.5 shadow-sm shadow-accent/30 hover:bg-accent-hover transition-all active:scale-[0.97]">Save</button>
        <button onClick={onCancel} className="text-xs font-medium border border-border text-ink-muted rounded-lg px-3 py-1.5 hover:bg-surface-hover transition-all active:scale-[0.97]">Cancel</button>
      </div>
    </div>
  );
}