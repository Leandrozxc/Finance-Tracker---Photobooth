import { useState } from "react";
import { useApplyConfig, useLedgerConfig } from "../store/ledgerStore";

interface TopNavProps {
  current: string;
  onNavigate: (page: string) => void;
}

const PRIMARY = [
  { id: "Summary", label: "Summary" },
  { id: "RecordSale", label: "Record" },
  { id: "Expenses", label: "Expenses" },
  { id: "ManageEntries", label: "Manage Entries" },
  { id: "OrgTracker", label: "Org Tracker" },
];

function GearIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function DayIndicator() {
  const config = useLedgerConfig();
  const applyConfig = useApplyConfig();
  const [isSaving, setIsSaving] = useState(false);

  const currentDay = config.currentCycle ?? 1;
  const totalDays = config.cycleCount;
  const isLastDay = currentDay >= totalDays;

  async function goToNextDay() {
    if (isLastDay || isSaving) return;
    setIsSaving(true);
    try {
      await applyConfig({ ...config, currentCycle: currentDay + 1 });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 bg-surface-hover rounded-full pl-4 pr-1.5 py-1.5">
      <span className="text-xs font-medium text-ink-muted whitespace-nowrap">
        {config.cycleLabel} <span className="text-ink font-semibold">{currentDay}</span> of {totalDays}
      </span>
      <button
        onClick={goToNextDay}
        disabled={isLastDay || isSaving}
        title={isLastDay ? "Already on the last day" : "Advance to the next day"}
        className="text-xs font-medium bg-accent text-white rounded-full px-3 py-1 shadow-sm shadow-accent/30 hover:bg-accent-hover transition-all active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next Day →
      </button>
    </div>
  );
}

export default function TopNav({ current, onNavigate }: TopNavProps) {
  return (
    <div className="flex items-center justify-between px-8 py-5 border-b border-border bg-surface gap-4">
      <div className="flex gap-2">
        {PRIMARY.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all active:scale-[0.97] ${
              current === item.id
                ? "bg-accent text-white shadow-sm shadow-accent/30"
                : "bg-surface-hover text-ink-muted hover:text-ink hover:bg-surface-raised"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <DayIndicator />

        <button
          onClick={() => onNavigate("Settings")}
          aria-label="Settings"
          title="Settings"
          className={`w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-[0.94] ${
            current === "Settings"
              ? "bg-accent text-white shadow-sm shadow-accent/30"
              : "bg-surface-hover text-ink-muted hover:text-ink hover:bg-surface-raised"
          }`}
        >
          <GearIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}