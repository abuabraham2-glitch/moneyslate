import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
export const Route = createFileRoute("/_app/reconciliation")({ component: () => (
  <PageContainer><PageHeader title="Reconciliation" description="AI-assisted bank statement matching — next iteration" /><Card><CardContent className="p-12 text-center text-muted-foreground">CSV import + AI matching is next.</CardContent></Card></PageContainer>
)});
