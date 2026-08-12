import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Card";
import { adjustOrganizationUsage, getExpenses, getOrganizations, getSales } from "../db/client";
import { useLedgerConfig } from "../store/ledgerStore";
import type { Expense, Organization, Sale } from "../types/ledger";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const ROTARACT_SHARE_RATE = 0.15;

export default function OrgTracker() {
  const config = useLedgerConfig();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [adjustAmounts, setAdjustAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busyOrgId, setBusyOrgId] = useState<string | null>(null);

  const frameModifier = config.modifiers.find((modifier) =>
    modifier.label.toLowerCase().includes("frame"),
  );
  const frameFee = frameModifier?.price ?? 0;

  async function loadAll() {
    try {
      const orgs = await getOrganizations();
      setOrganizations(orgs);
      setSales(await getSales());
      setExpenses(await getExpenses());
    } catch (loadError) {
      setError(`Could not load org tracker data: ${errorMessage(loadError)}`);
    }
  }

  useEffect(() => {
    void loadAll();
    window.addEventListener("ledger:changed", loadAll);
    return () => window.removeEventListener("ledger:changed", loadAll);
  }, []);

  function getAdjustAmount(orgId: string): number {
    const raw = adjustAmounts[orgId] ?? "1";
    const parsed = Math.trunc(Number(raw));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  async function handleAdjust(org: Organization, direction: 1 | -1) {
    const amount = getAdjustAmount(org.id);
    const delta = amount * direction;
    setError("");
    setBusyOrgId(org.id);
    try {
      await adjustOrganizationUsage(org.id, delta);
      await loadAll();
    } catch (adjustError) {
      setError(`Could not update ${org.name}'s frame count: ${errorMessage(adjustError)}`);
    } finally {
      setBusyOrgId(null);
    }
  }

  const orgRows = useMemo(
    () =>
      organizations
        .map((org) => ({ ...org, amountOwed: org.usage_count * frameFee }))
        .sort((a, b) => b.usage_count - a.usage_count),
    [organizations, frameFee],
  );

  const totalUsage = orgRows.reduce((sum, org) => sum + org.usage_count, 0);
  const totalOwedToOrgs = orgRows.reduce((sum, org) => sum + org.amountOwed, 0);

  const paidSales = useMemo(() => sales.filter((sale) => sale.payment_status === "Paid"), [sales]);
  const totalGross = paidSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalRotaractShare = totalGross * ROTARACT_SHARE_RATE;
  const totalNetAfterRotaract = totalGross - totalRotaractShare;
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const finalProfit = totalNetAfterRotaract - totalExpenses;
  const netAfterOrgPayouts = finalProfit - totalOwedToOrgs;

  const fmt = (value: number) => `${config.currencySymbol}${value.toFixed(2)}`;

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-ink mb-6">Org Tracker</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wide mb-1">Total owed to orgs</div>
          <div className="text-2xl font-semibold text-ink">{fmt(totalOwedToOrgs)}</div>
          <div className="text-xs text-ink-faint mt-1">
            {totalUsage} frame use{totalUsage === 1 ? "" : "s"} × {config.currencySymbol}{frameFee.toFixed(2)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wide mb-1">Net income after org payouts</div>
          <div className="text-2xl font-semibold text-ink">{fmt(netAfterOrgPayouts)}</div>
          <div className="text-xs text-ink-faint mt-1">Final profit − total owed to orgs</div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-ink">Amount owed, by organization</div>
          <div className="text-xs text-ink-faint">Adjust counts manually if a pick was missed or logged twice</div>
        </div>

        {orgRows.length === 0 ? (
          <p className="py-4 text-sm text-ink-muted">No organizations added yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted uppercase tracking-wide border-b border-border">
                <th className="py-2 font-medium">Organization</th>
                <th className="py-2 font-medium text-right">Frame uses</th>
                <th className="py-2 font-medium text-right">Amount owed</th>
                <th className="py-2 font-medium text-right">Manual adjust</th>
              </tr>
            </thead>
            <tbody>
              {orgRows.map((org) => (
                <tr key={org.id} className="border-b border-border/50">
                  <td className="py-2 text-ink-muted">
                    {org.name}
                    {!org.active && <span className="text-ink-faint text-xs ml-2">(inactive)</span>}
                  </td>
                  <td className="py-2 text-right text-ink">{org.usage_count}</td>
                  <td className="py-2 text-right text-ink font-medium">{fmt(org.amountOwed)}</td>
                  <td className="py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleAdjust(org, -1)}
                        disabled={busyOrgId === org.id || org.usage_count === 0}
                        className="w-7 h-7 rounded-lg border border-border text-ink-muted text-sm hover:bg-surface-hover hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.95]"
                        title="Deduct frame use"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={adjustAmounts[org.id] ?? "1"}
                        onChange={(event) =>
                          setAdjustAmounts((current) => ({ ...current, [org.id]: event.target.value }))
                        }
                        className="w-14 border border-border bg-surface-raised text-ink rounded-lg px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <button
                        onClick={() => handleAdjust(org, 1)}
                        disabled={busyOrgId === org.id}
                        className="w-7 h-7 rounded-lg border border-border text-ink-muted text-sm hover:bg-surface-hover hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.95]"
                        title="Add frame use"
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2 text-ink">Total</td>
                <td className="py-2 text-right text-ink">{totalUsage}</td>
                <td className="py-2 text-right text-ink">{fmt(totalOwedToOrgs)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}