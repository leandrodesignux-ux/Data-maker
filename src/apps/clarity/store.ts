import { create } from "zustand";
import { defaultClFilters, type ClFilters } from "./clarity-data";
type ClarityState = { filters: ClFilters; setFilters: (filters: ClFilters) => void };
export const useClarityStore = create<ClarityState>((set) => ({ filters: defaultClFilters, setFilters: (filters) => set({ filters }) }));
