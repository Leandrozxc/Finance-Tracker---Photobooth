import { useEffect, useState, type ReactElement } from "react";
import TopNav from "./components/topNav";
import Summary from "./pages/Summary";
import RecordSale from "./pages/RecordSale";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import ManageEntries from "./pages/ManageEntries";
import OrgTracker from "./pages/OrgTracker";
import { useLedgerConfigState, useLoadConfig } from "./store/ledgerStore";
import "./theme/tokens.css";

type Page = "RecordSale" | "Expenses" | "ManageEntries" | "OrgTracker" | "Settings" | "Summary";

export default function App() {
  const [page, setPage] = useState<Page>("Summary");
  const { config, isLoading, error } = useLedgerConfigState();
  const loadConfig = useLoadConfig();

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  if (isLoading || !config) {
    return (
      <div className="min-h-screen bg-[#141616] flex items-center justify-center">
        <p className="text-sm text-ink-muted">
          {error ? `Could not load settings: ${error}` : "Loading..."}
        </p>
      </div>
    );
  }

  const pages: Record<Page, ReactElement> = {
    Summary: <Summary />,
    RecordSale: <RecordSale />,
    Expenses: <Expenses />,
    ManageEntries: <ManageEntries />,
    OrgTracker: <OrgTracker />,
    Settings: <Settings />,
  };

  return (
    <div className="min-h-screen bg-[#141616]">
      <TopNav current={page} onNavigate={(next) => setPage(next as Page)} />
      <main className="p-8">{pages[page]}</main>
    </div>
  );
}