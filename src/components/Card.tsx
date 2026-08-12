import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-[10px] shadow-lg shadow-black/20 ${className}`}>
      {children}
    </div>
  );
}

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-ink-muted uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold text-ink mt-1">{value}</div>
    </Card>
  );
}