import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
export const Route = createFileRoute("/_app/expenses")({ component: () => (
  <PageContainer><PageHeader title="Expenses" description="Coming in the next iteration" /><Card><CardContent className="p-12 text-center text-muted-foreground">Up next.</CardContent></Card></PageContainer>
)});
