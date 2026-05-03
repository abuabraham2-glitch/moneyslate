import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
export const Route = createFileRoute("/_app/purchase-orders")({ component: () => (
  <PageContainer><PageHeader title="Purchase Orders" description="Coming in the next iteration" /><Card><CardContent className="p-12 text-center text-muted-foreground">Up next.</CardContent></Card></PageContainer>
)});
