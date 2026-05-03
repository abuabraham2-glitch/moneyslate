import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
export const Route = createFileRoute("/_app/reports")({ component: () => (
  <PageContainer><PageHeader title="Reports" description="P&L, A/R aging, A/P aging, sales by client — next iteration" /><Card><CardContent className="p-12 text-center text-muted-foreground">Up next.</CardContent></Card></PageContainer>
)});
