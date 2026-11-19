import { DataBootstrap } from "@/components/shared/DataBootstrap";
import { NuqsAdapter } from "nuqs/adapters/next/app";
export default function MetabaseLayout({ children }: { children: React.ReactNode }) { return <NuqsAdapter><DataBootstrap />{children}</NuqsAdapter>; }
