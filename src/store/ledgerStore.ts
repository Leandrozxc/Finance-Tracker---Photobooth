import { create } from "zustand";
import type { LedgerConfig } from "../config/schema";
import { getConfig, saveConfig } from "../db/client";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface LedgerStore {
  config: LedgerConfig | null;
  isLoading: boolean;
  error: string;
  loadConfig: () => Promise<void>;
  applyConfig: (config: LedgerConfig) => Promise<void>;
}

const useStore = create<LedgerStore>((set) => ({
  config: null,
  isLoading: true,
  error: "",
  loadConfig: async () => {
    set({ isLoading: true, error: "" });
    try {
      const config = await getConfig();
      set({ config, isLoading: false });
    } catch (loadError) {
      set({ isLoading: false, error: errorMessage(loadError) });
    }
  },
  applyConfig: async (config: LedgerConfig) => {
    await saveConfig(config);
    set({ config });
  },
}));

export function useLedgerConfig(): LedgerConfig {
  const config = useStore((s) => s.config);
  if (!config) {
    throw new Error("Ledger config accessed before it finished loading.");
  }
  return config;
}

export function useLedgerConfigState() {
  const config = useStore((s) => s.config);
  const isLoading = useStore((s) => s.isLoading);
  const error = useStore((s) => s.error);
  return { config, isLoading, error };
}

export function useLoadConfig() {
  return useStore((s) => s.loadConfig);
}

export function useApplyConfig() {
  return useStore((s) => s.applyConfig);
}