import { DataBootstrap } from "@/components/shared/DataBootstrap";
import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
export default function Ga4Layout({ children }: { children: React.ReactNode }) { return <NuqsAdapter><DataBootstrap /><Suspense>{children}</Suspense></NuqsAdapter>; }
