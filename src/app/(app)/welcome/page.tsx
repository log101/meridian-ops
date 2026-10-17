import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Welcome" };

export default function WelcomePage() {
  return (
    <>
      <PageHeader title="Welcome" description="Welcome to this page" />
      <Card>
        <CardContent className="pt-6">
          <p>Welcome to this page</p>
        </CardContent>
      </Card>
    </>
  );
}
