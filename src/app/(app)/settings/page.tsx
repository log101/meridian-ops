import { ResetDemoButton } from "@/components/forms/reset-demo-button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Settings" };

const THESEUS_URL = process.env.NEXT_PUBLIC_THESEUS_URL ?? "";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company</CardTitle>
            <CardDescription>Shown on invoices and in the sidebar.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>Meridian Supply Co.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currency</span>
              <span>USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment terms</span>
              <span>Net 30</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo data</CardTitle>
            <CardDescription>
              This is a shared demo. Everything you change is visible to other visitors until the data is reset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetDemoButton />
          </CardContent>
        </Card>

        {THESEUS_URL ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Changes to this app</CardTitle>
              <CardDescription>
                Meridian Ops is connected to Theseus. Anyone on the team can describe a change in plain language, preview it running
                against this app, and accept it; nothing is merged without that preview.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href={THESEUS_URL} target="_blank" rel="noreferrer" className="text-sm font-medium underline underline-offset-4">
                Open Theseus to request a change
              </a>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
