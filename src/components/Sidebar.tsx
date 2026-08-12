interface SidebarProps {
  current: string;
  onNavigate: (page: any) => void;
}

const GROUPS = [
  { label: "Operations", items: [{ id: "RecordSale", label: "Record Sale" }, { id: "Expenses", label: "Expenses" }] },
  { label: "Records", items: [{ id: "Summary", label: "Summary" }, { id: "EditEntries", label: "Edit Entries" }, { id: "ExportReport", label: "Export Report" }] },
  { label: "Setup", items: [{ id: "Settings", label: "Settings" }] },
];

export default function Sidebar({ current, onNavigate }: SidebarProps) {
  return (
    <nav className="w-56 bg-white border-r border-zinc-200 flex flex-col py-6 px-3 gap-6">
      <div className="px-2 text-sm font-semibold text-zinc-900">EmpressLedger</div>
      {GROUPS.map((group) => (
        <div key={group.label}>
          <div className="px-2 text-[11px] font-medium text-zinc-400 uppercase tracking-wide mb-1">
            {group.label}
          </div>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = current === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`relative text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    active ? "bg-zinc-900 text-white font-medium" : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}