import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
export const Route = createFileRoute("/_app/invoices/$id")({ component: () => (
  <PageContainer><PageHeader title="Invoice" /><Card><CardContent className="p-12 text-center text-muted-foreground">Invoice detail — next iteration.</CardContent></Card></PageContainer>
)});
