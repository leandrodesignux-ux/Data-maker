import { DataBootstrap } from "@/components/shared/DataBootstrap";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";
export default function ClarityLayout({ children }: { children: React.ReactNode }) { return <NuqsAdapter><DataBootstrap /><Suspense fallback={null}>{children}</Suspense></NuqsAdapter>; }
