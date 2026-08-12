import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Card";
import { getExpenses, getOrganizations, getSales } from "../db/client";
import { useLedgerConfig } from "../store/ledgerStore";
import type { Expense, Organization, Sale } from "../types/ledger";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const ROTARACT_SHARE_RATE = 0.15;

export default function Summary() {
  const config = useLedgerConfig();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState("");

  const frameModifier = config.modifiers.find((modifier) =>
    modifier.label.toLowerCase().includes("frame"),
  );
  const frameFee = frameModifier?.price ?? 0;

  async function loadAll() {
    try {
      setSales(await getSales());
      setExpenses(await getExpenses());
      setOrganizations(await getOrganizations());
    } catch (loadError) {
      setError(`Could not load summary data: ${errorMessage(loadError)}`);
    }
  }

  useEffect(() => {
    void loadAll();
    window.addEventListener("ledger:changed", loadAll);
    return () => window.removeEventListener("ledger:changed", loadAll);
  }, []);

  const paidSales = useMemo(() => sales.filter((sale) => sale.payment_status === "Paid"), [sales]);

  const dayBreakdown = useMemo(() => {
    const days = Array.from({ length: config.cycleCount }, (_, i) => i + 1);
    return days.map((day) => {
      const gross = paidSales
        .filter((sale) => sale.cycle === day)
        .reduce((sum, sale) => sum + sale.total, 0);
      const rotaractShare = gross * ROTARACT_SHARE_RATE;
      const net = gross - rotaractShare;
      return { day, gross, rotaractShare, net };
    });
  }, [paidSales, config.cycleCount]);

  const totalGross = dayBreakdown.reduce((sum, d) => sum + d.gross, 0);
  const totalRotaractShare = dayBreakdown.reduce((sum, d) => sum + d.rotaractShare, 0);
  const totalNetIncome = dayBreakdown.reduce((sum, d) => sum + d.net, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const finalProfit = totalNetIncome - totalExpenses;

  // Total owed to organizations for frame usage: usage_count x flat frame fee, summed across orgs.
  const totalOwedToOrgs = organizations.reduce((sum, org) => sum + org.usage_count * frameFee, 0);
  const netProfitAfterOrgPayouts = finalProfit - totalOwedToOrgs;

  const cashSales = paidSales.filter((s) => s.payment_method.toLowerCase() === "cash").reduce((sum, s) => sum + s.total, 0);
  const otherSales = totalGross - cashSales;

  const fmt = (value: number) => `${config.currencySymbol}${value.toFixed(2)}`;

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-ink mb-6">Summary</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card className="p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wide mb-1">Gross income</div>
          <div className="text-2xl font-semibold text-ink">{fmt(totalGross)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wide mb-1">Total expenses</div>
          <div className="text-2xl font-semibold text-ink">{fmt(totalExpenses)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wide mb-1">Final profit</div>
          <div className="text-2xl font-semibold text-ink">{fmt(finalProfit)}</div>
          <div className="text-xs text-ink-faint mt-1">(Gross − Rotaract's 15%) − Expenses</div>
        </Card>
      </div>

      <Card className="p-5 mb-6 border-accent/30">
        <div className="text-xs text-ink-muted uppercase tracking-wide mb-1">Net profit after org payouts</div>
        <div className="text-3xl font-semibold text-ink">{fmt(netProfitAfterOrgPayouts)}</div>
        <div className="text-xs text-ink-faint mt-1">
          Final profit − total owed to orgs ({fmt(totalOwedToOrgs)} owed for frame usage)
        </div>
      </Card>

      <Card className="p-5 mb-6">
        <div className="text-sm font-medium text-ink mb-3">Rotaract revenue split, by booth day</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-muted uppercase tracking-wide border-b border-border">
              <th className="py-2 font-medium">{config.cycleLabel}</th>
              <th className="py-2 font-medium text-right">Gross income</th>
              <th className="py-2 font-medium text-right">Rotaract's share (15%)</th>
              <th className="py-2 font-medium text-right">Net income</th>
            </tr>
          </thead>
          <tbody>
            {dayBreakdown.map((d) => (
              <tr key={d.day} className="border-b border-border/50">
                <td className="py-2 text-ink-muted">{config.cycleLabel} {d.day}</td>
                <td className="py-2 text-right text-ink">{fmt(d.gross)}</td>
                <td className="py-2 text-right text-ink-muted">{fmt(d.rotaractShare)}</td>
                <td className="py-2 text-right text-ink font-medium">{fmt(d.net)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2 text-ink">Total</td>
              <td className="py-2 text-right text-ink">{fmt(totalGross)}</td>
              <td className="py-2 text-right text-ink">{fmt(totalRotaractShare)}</td>
              <td className="py-2 text-right text-ink">{fmt(totalNetIncome)}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="text-sm font-medium text-ink mb-3">Payment method split</div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-ink-muted">Cash</span>
            <span className="text-ink font-medium">{fmt(cashSales)}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-ink-muted">Other methods</span>
            <span className="text-ink font-medium">{fmt(otherSales)}</span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium text-ink mb-3">Paid orders</div>
          <div className="text-2xl font-semibold text-ink">{paidSales.length}</div>
        </Card>
      </div>
    </div>
  );
}