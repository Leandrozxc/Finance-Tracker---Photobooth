import { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { useApplyConfig, useLedgerConfig } from "../store/ledgerStore";
import type { Item, LedgerConfig, Modifier } from "../config/schema";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const inputClass =
  "w-full border border-border bg-surface text-ink rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

export default function Settings() {
  const config = useLedgerConfig();
  const applyConfig = useApplyConfig();

  const [draft, setDraft] = useState<LedgerConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(config);

  function updateField<K extends keyof LedgerConfig>(key: K, value: LedgerConfig[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSuccessMessage("");
  }

  function updateItem(index: number, patch: Partial<Item>) {
    setDraft((current) => {
      const items = [...current.items];
      items[index] = { ...items[index], ...patch };
      return { ...current, items };
    });
    setSuccessMessage("");
  }

  function addItem() {
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        { id: makeId("item"), name: "New item", basePrice: 0, includedUnits: 1, active: true },
      ],
    }));
  }

  function removeItem(index: number) {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((_, i) => i !== index),
    }));
  }

  function updateModifier(index: number, patch: Partial<Modifier>) {
    setDraft((current) => {
      const modifiers = [...current.modifiers];
      modifiers[index] = { ...modifiers[index], ...patch };
      return { ...current, modifiers };
    });
    setSuccessMessage("");
  }

  function addModifier() {
    setDraft((current) => ({
      ...current,
      modifiers: [
        ...current.modifiers,
        { id: makeId("mod"), label: "New add-on", price: 0, unit: "per_item" },
      ],
    }));
  }

  function removeModifier(index: number) {
    setDraft((current) => ({
      ...current,
      modifiers: current.modifiers.filter((_, i) => i !== index),
    }));
  }

  function updateListEntry(key: "paymentMethods" | "expenseLabels", index: number, value: string) {
    setDraft((current) => {
      const list = [...current[key]];
      list[index] = value;
      return { ...current, [key]: list };
    });
    setSuccessMessage("");
  }

  function addListEntry(key: "paymentMethods" | "expenseLabels") {
    setDraft((current) => ({ ...current, [key]: [...current[key], ""] }));
  }

  function removeListEntry(key: "paymentMethods" | "expenseLabels", index: number) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    setError("");
    setSuccessMessage("");

    if (draft.items.some((item) => !item.name.trim())) {
      setError("Every item needs a name.");
      return;
    }
    if (draft.modifiers.some((modifier) => !modifier.label.trim())) {
      setError("Every add-on needs a label.");
      return;
    }
    if (draft.paymentMethods.some((method) => !method.trim())) {
      setError("Payment methods cannot be blank.");
      return;
    }
    if ((draft.currentCycle ?? 1) > draft.cycleCount || (draft.currentCycle ?? 1) < 1) {
      setError(`Current day must be between 1 and ${draft.cycleCount}.`);
      return;
    }

    setIsSaving(true);
    try {
      await applyConfig(draft);
      setSuccessMessage("Settings saved.");
    } catch (saveError) {
      setError(`Could not save settings: ${errorMessage(saveError)}`);
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setDraft(config);
    setError("");
    setSuccessMessage("");
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        {isDirty && (
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="text-xs font-medium border border-border text-ink-muted rounded-lg px-3 py-1.5 hover:bg-surface-hover transition-all active:scale-[0.97]"
            >
              Discard changes
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs font-medium bg-accent text-white rounded-lg px-4 py-1.5 shadow-sm shadow-accent/30 hover:bg-accent-hover transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      {successMessage && !isDirty && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {successMessage}
        </div>
      )}

      <Card className="p-5 mb-4">
        <div className="text-xs text-ink-faint uppercase tracking-wide mb-3">Event</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink-muted block mb-1">Project name</label>
            <input
              value={draft.projectName}
              onChange={(e) => updateField("projectName", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-ink-muted block mb-1">Currency symbol</label>
            <input
              value={draft.currencySymbol}
              onChange={(e) => updateField("currencySymbol", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-ink-muted block mb-1">Cycle label</label>
            <input
              value={draft.cycleLabel}
              onChange={(e) => updateField("cycleLabel", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-ink-muted block mb-1">Cycle count (total days)</label>
            <input
              type="number"
              min="1"
              value={draft.cycleCount}
              onChange={(e) => updateField("cycleCount", Math.max(1, Number(e.target.value) || 1))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-ink-muted block mb-1">Current day</label>
            <input
              type="number"
              min="1"
              max={draft.cycleCount}
              value={draft.currentCycle ?? 1}
              onChange={(e) => updateField("currentCycle", Math.max(1, Number(e.target.value) || 1))}
              className={inputClass}
            />
            <p className="text-xs text-ink-faint mt-1">
              Every new sale gets tagged with this day. Use this to correct mistakes — the "Next Day" button in the top bar is the quick way to advance normally.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-ink-faint uppercase tracking-wide">Items</div>
          <button
            onClick={addItem}
            className="text-xs font-medium text-ink-muted border border-border rounded-lg px-3 py-1 hover:bg-surface-hover hover:border-accent/40 transition-all active:scale-[0.97]"
          >
            + Add item
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {draft.items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center border-b border-border/50 pb-2 last:border-0">
              <input
                value={item.name}
                onChange={(e) => updateItem(index, { name: e.target.value })}
                className={`${inputClass} col-span-4`}
                placeholder="Name"
              />
              <div className="col-span-3 flex items-center gap-1">
                <span className="text-xs text-ink-faint">{draft.currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.basePrice}
                  onChange={(e) => updateItem(index, { basePrice: Number(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
              <input
                type="number"
                min="0"
                value={item.includedUnits ?? 0}
                onChange={(e) => updateItem(index, { includedUnits: Number(e.target.value) || 0 })}
                className={`${inputClass} col-span-2`}
                title="Included units"
              />
              <label className="col-span-2 flex items-center gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={item.active}
                  onChange={(e) => updateItem(index, { active: e.target.checked })}
                  className="accent-accent"
                />
                Active
              </label>
              <button
                onClick={() => removeItem(index)}
                className="col-span-1 text-xs font-medium text-red-300 border border-red-500/30 rounded-lg px-2 py-1.5 hover:bg-red-500/10 hover:border-red-400/50 transition-all active:scale-[0.97]"
              >
                ✕
              </button>
            </div>
          ))}
          {draft.items.length === 0 && (
            <p className="py-3 text-sm text-ink-muted">No items yet. Add one above.</p>
          )}
        </div>
      </Card>

      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-ink-faint uppercase tracking-wide">Add-ons</div>
          <button
            onClick={addModifier}
            className="text-xs font-medium text-ink-muted border border-border rounded-lg px-3 py-1 hover:bg-surface-hover hover:border-accent/40 transition-all active:scale-[0.97]"
          >
            + Add add-on
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {draft.modifiers.map((modifier, index) => (
            <div key={modifier.id} className="grid grid-cols-12 gap-2 items-center border-b border-border/50 pb-2 last:border-0">
              <input
                value={modifier.label}
                onChange={(e) => updateModifier(index, { label: e.target.value })}
                className={`${inputClass} col-span-5`}
                placeholder="Label"
              />
              <div className="col-span-3 flex items-center gap-1">
                <span className="text-xs text-ink-faint">{draft.currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={modifier.price}
                  onChange={(e) => updateModifier(index, { price: Number(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
              <select
                value={modifier.unit}
                onChange={(e) => updateModifier(index, { unit: e.target.value as Modifier["unit"] })}
                className={`${inputClass} col-span-3`}
              >
                <option value="flat">Flat</option>
                <option value="per_item">Per item</option>
              </select>
              <button
                onClick={() => removeModifier(index)}
                className="col-span-1 text-xs font-medium text-red-300 border border-red-500/30 rounded-lg px-2 py-1.5 hover:bg-red-500/10 hover:border-red-400/50 transition-all active:scale-[0.97]"
              >
                ✕
              </button>
            </div>
          ))}
          {draft.modifiers.length === 0 && (
            <p className="py-3 text-sm text-ink-muted">No add-ons yet. Add one above.</p>
          )}
        </div>
      </Card>

      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-ink-faint uppercase tracking-wide">Payment methods</div>
          <button
            onClick={() => addListEntry("paymentMethods")}
            className="text-xs font-medium text-ink-muted border border-border rounded-lg px-3 py-1 hover:bg-surface-hover hover:border-accent/40 transition-all active:scale-[0.97]"
          >
            + Add method
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {draft.paymentMethods.map((method, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={method}
                onChange={(e) => updateListEntry("paymentMethods", index, e.target.value)}
                className={inputClass}
              />
              <button
                onClick={() => removeListEntry("paymentMethods", index)}
                className="text-xs font-medium text-red-300 border border-red-500/30 rounded-lg px-3 py-1.5 hover:bg-red-500/10 hover:border-red-400/50 transition-all active:scale-[0.97]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-ink-faint uppercase tracking-wide">Expense labels</div>
          <button
            onClick={() => addListEntry("expenseLabels")}
            className="text-xs font-medium text-ink-muted border border-border rounded-lg px-3 py-1 hover:bg-surface-hover hover:border-accent/40 transition-all active:scale-[0.97]"
          >
            + Add label
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {draft.expenseLabels.map((label, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={label}
                onChange={(e) => updateListEntry("expenseLabels", index, e.target.value)}
                className={inputClass}
              />
              <button
                onClick={() => removeListEntry("expenseLabels", index)}
                className="text-xs font-medium text-red-300 border border-red-500/30 rounded-lg px-3 py-1.5 hover:bg-red-500/10 hover:border-red-400/50 transition-all active:scale-[0.97]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}