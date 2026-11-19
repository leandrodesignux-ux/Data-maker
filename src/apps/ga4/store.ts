import { create } from "zustand";
import { defaultGaFilters, type GaFilters } from "./ga4-data";
type Ga4State = { filters: GaFilters; setFilters: (filters: GaFilters) => void };
export const useGa4Store = create<Ga4State>((set) => ({ filters: defaultGaFilters, setFilters: (filters) => set({ filters }) }));
