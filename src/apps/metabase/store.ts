import { create } from "zustand";
import { defaultMetabaseFilters, type MetabaseFilters } from "./dashboard-data";
type MetabaseState = { filters: MetabaseFilters; setFilters: (filters: MetabaseFilters) => void };
export const useMetabaseStore = create<MetabaseState>((set) => ({ filters: defaultMetabaseFilters, setFilters: (filters) => set({ filters }) }));
