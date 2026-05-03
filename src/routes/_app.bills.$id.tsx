import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
export const Route = createFileRoute("/_app/bills/$id")({ component: () => (
  <PageContainer><PageHeader title="Bill" /><Card><CardContent className="p-12 text-center text-muted-foreground">Bill detail — next iteration.</CardContent></Card></PageContainer>
)});
