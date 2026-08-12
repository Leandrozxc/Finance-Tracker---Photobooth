import { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { getOrganizations, getSalesCount, recordSale } from "../db/client";
import { useLedgerConfig } from "../store/ledgerStore";
import type { Organization } from "../types/ledger";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function RecordSale() {
  const config = useLedgerConfig();
  const activeItems = config.items.filter((item) => item.active);
  const currentDay = config.currentCycle ?? 1;

  const frameModifier = config.modifiers.find((modifier) =>
    modifier.label.toLowerCase().includes("frame"),
  );

  const [itemId, setItemId] = useState(activeItems[0]?.id ?? "");
  const [modQty, setModQty] = useState<Record<string, number>>({});
  const [orgId, setOrgId] = useState<string>("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [paymentMethod, setPaymentMethod] = useState(config.paymentMethods[0] ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  async function loadOrganizations() {
    try {
      const orgs = await getOrganizations();
      setOrganizations(orgs.filter((org) => org.active));
    } catch (loadError) {
      setError(`Could not load organizations: ${errorMessage(loadError)}`);
    }
  }

  useEffect(() => {
    void loadOrganizations();
    window.addEventListener("ledger:changed", loadOrganizations);
    return () => window.removeEventListener("ledger:changed", loadOrganizations);
  }, []);

  const item = activeItems.find((entry) => entry.id === itemId);

  // Frame add-on is an org revenue cut, not a customer charge — excluded from the total.
  const modifierTotal = config.modifiers.reduce((sum, modifier) => {
    if (frameModifier && modifier.id === frameModifier.id) {
      return sum;
    }
    return sum + (modQty[modifier.id] ?? 0) * modifier.price;
  }, 0);
  const finalTotal = (item?.basePrice ?? 0) + modifierTotal;

  const frameQty = frameModifier ? modQty[frameModifier.id] ?? 0 : 0;

  function updateModifier(modifierId: string, value: string) {
    const quantity = Math.max(0, Number(value) || 0);
    setModQty((current) => ({ ...current, [modifierId]: quantity }));
    if (frameModifier && modifierId === frameModifier.id && quantity === 0) {
      setOrgId("");
    }
  }

  async function confirmSale() {
    setSuccessMessage("");
    setError("");

    if (!item) {
      setError("Select an item before recording a sale.");
      return;
    }
    if (!paymentMethod) {
      setError("Select a payment method.");
      return;
    }

    setIsSaving(true);
    try {
      await recordSale({
        cycle: currentDay,
        itemId: item.id,
        basePrice: item.basePrice,
        modifiers: config.modifiers.map((modifier) => ({
          id: modifier.id,
          qty: modQty[modifier.id] ?? 0,
          price: modifier.price,
        })),
        total: finalTotal,
        paymentMethod,
        paymentStatus: "Paid",
        amountReceived: finalTotal,
        changeAmount: 0,
        notes: "",
        orgId: orgId || null,
      });

      const totalSoFar = await getSalesCount();

      setModQty({});
      setOrgId("");
      setSuccessMessage(`Sale recorded for ${config.cycleLabel} ${currentDay}. Total sales so far: ${totalSoFar}.`);
    } catch (saveError) {
      setError(`Could not record the sale: ${errorMessage(saveError)}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (activeItems.length === 0) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-xl font-semibold text-ink mb-4">Record Sale</h1>
        <Card className="p-5 text-sm text-ink-muted">
          No active items are available. Add or activate an item in Settings.
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6 max-w-5xl">
      <div className="col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-ink">Record Sale</h1>
          <span className="text-xs font-medium text-ink-muted bg-surface-raised rounded-full px-3 py-1">
            Recording for {config.cycleLabel} {currentDay}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {activeItems.map((entry) => (
            <button
              key={entry.id}
              onClick={() => {
                setItemId(entry.id);
                setSuccessMessage("");
                setError("");
              }}
              className={`h-16 rounded-xl font-medium text-sm border transition-all active:scale-[0.98] ${
                itemId === entry.id
                  ? "bg-accent text-white border-accent shadow-sm shadow-accent/30"
                  : "bg-surface text-ink-muted border-border hover:border-accent/40 hover:text-ink hover:shadow-sm"
              }`}
            >
              <div>{entry.name}</div>
              <div className="text-xs opacity-70">
                {config.currencySymbol}{entry.basePrice.toFixed(2)}
              </div>
            </button>
          ))}
        </div>

        {config.modifiers.length > 0 && (
          <Card className="p-4">
            <div className="text-sm font-medium text-ink mb-3">Add-ons</div>
            <div className="flex flex-col gap-3">
              {config.modifiers.map((modifier) => {
                const isFrame = frameModifier && modifier.id === frameModifier.id;
                return (
                  <div key={modifier.id} className="flex items-center justify-between">
                    <span className="text-sm text-ink-muted">
                      {modifier.label}
                      {isFrame ? (
                        <span className="text-ink-faint"> (org cut, not added to price)</span>
                      ) : (
                        <span> ({config.currencySymbol}{modifier.price.toFixed(2)} each)</span>
                      )}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={modQty[modifier.id] ?? 0}
                      onChange={(event) => updateModifier(modifier.id, event.target.value)}
                      className="w-16 border border-border bg-surface-raised text-ink rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                );
              })}
            </div>

            {frameModifier && frameQty > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <label className="text-xs text-ink-muted block mb-1">Organization frame design</label>
                <select
                  value={orgId}
                  onChange={(event) => setOrgId(event.target.value)}
                  className="w-full border border-border bg-surface-raised text-ink rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">No specific org</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
                <p className="text-xs text-ink-faint mt-1">
                  Selecting an org logs this frame use in Org Tracker — it doesn't change the customer's total.
                </p>
              </div>
            )}
          </Card>
        )}
      </div>

      <div>
        <Card className="p-5 sticky top-4">
          <div className="text-xs text-ink-muted uppercase tracking-wide mb-1">Total</div>
          <div className="text-3xl font-semibold text-ink mb-4">
            {config.currencySymbol}{finalTotal.toFixed(2)}
          </div>

          <div className="mb-4">
            <label className="text-xs text-ink-muted block mb-1">Payment method</label>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className="w-full border border-border bg-surface-raised text-ink rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {config.paymentMethods.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              {successMessage}
            </div>
          )}

          <button
            onClick={confirmSale}
            disabled={isSaving}
            className="w-full h-11 rounded-xl bg-accent text-white text-sm font-medium shadow-sm shadow-accent/30 hover:bg-accent-hover transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-ink-faint disabled:shadow-none"
          >
            {isSaving ? "Recording..." : "Confirm sale"}
          </button>
        </Card>
      </div>
    </div>
  );
}