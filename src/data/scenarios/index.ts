import { mb01 } from "./mb-01";
import { mb02 } from "./mb-02";
import { mb03 } from "./mb-03";
import { ga01 } from "./ga-01";
import { ga02 } from "./ga-02";
import { ga03 } from "./ga-03";
import { cl01 } from "./cl-01";
import { cl02 } from "./cl-02";
import { cl03 } from "./cl-03";

export const scenarios = [mb01, mb02, mb03, ga01, ga02, ga03, cl01, cl02, cl03] as const;
export type { NumericAssertion, Scenario } from "./types";
