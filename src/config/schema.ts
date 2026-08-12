// src/config/schema.ts
export interface Modifier {
  id: string;
  label: string;      // e.g. "Extra copy", "Rush fee"
  price: number;
  unit: "flat" | "per_item";
}

export interface Item {
  id: string;
  name: string;        // e.g. "2x2", "Combo Meal", "T-Shirt M"
  basePrice: number;
  includedUnits?: number;
  active: boolean;
}

export interface LedgerConfig {
  projectName: string;
  currencySymbol: string;
  cycleLabel: string;        // "Day", "Shift", "Session"
  cycleCount: number;
  currentCycle?: number;     // which day/cycle is currently active (1-based)
  items: Item[];
  modifiers: Modifier[];
  paymentMethods: string[];
  expenseLabels: string[];
}