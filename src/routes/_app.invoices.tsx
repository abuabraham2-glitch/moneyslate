import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_app/invoices")({ component: () => <Stub title="Invoices" /> });

function Stub({ title }: { title: string }) {
  return (
    <PageContainer>
      <PageHeader title={title} description="Coming in the next iteration" />
      <Card><CardContent className="p-12 text-center text-muted-foreground">
        This module's foundation (database, line-item editor, PDF generator) is built. The full editor UI is up next.
      </CardContent></Card>
    </PageContainer>
  );
}
