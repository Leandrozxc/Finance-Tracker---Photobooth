import { useEffect, useState } from "react";
import { useLedgerConfig } from "../store/ledgerStore";
import { getExpenses, recordExpense } from "../db/client";
import { Card } from "../components/Card";

export default function Expenses() {
  const config = useLedgerConfig();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [label, setLabel] = useState(config.expenseLabels[0]);
  const [amount, setAmount] = useState(0);
  const [paidBy, setPaidBy] = useState("");

  useEffect(() => {
    getExpenses().then(setExpenses);
  }, []);

  async function submit() {
    await recordExpense({ expenseDate: new Date().toISOString(), label, amount, paidBy, notes: "" });
    setExpenses(await getExpenses());
    setAmount(0);
    setPaidBy("");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-ink mb-6">Expenses</h1>

      <Card className="p-5 mb-6">
        <div className="text-sm font-medium text-ink mb-3">Record an expense</div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs text-ink-muted block mb-1">Expense for</label>
            <select
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full border border-border bg-surface-raised text-ink rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {config.expenseLabels.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-ink-muted block mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full border border-border bg-surface-raised text-ink rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-ink-muted block mb-1">Paid by</label>
            <input
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full border border-border bg-surface-raised text-ink rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
        <button
          onClick={submit}
          className="h-10 px-5 rounded-xl bg-accent text-white text-sm font-medium shadow-sm shadow-accent/30 hover:bg-accent-hover transition-all active:scale-[0.98]"
        >
          Record expense
        </button>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-medium text-ink mb-3">Expense history</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-faint border-b border-border">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Label</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 font-medium">Paid by</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-border/50">
                <td className="py-2 text-ink-muted">{e.expense_date}</td>
                <td className="py-2 text-ink-muted">{e.label}</td>
                <td className="py-2 text-ink-muted">{config.currencySymbol}{e.amount}</td>
                <td className="py-2 text-ink-muted">{e.paid_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}