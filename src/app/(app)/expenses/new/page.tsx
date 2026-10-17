import { ExpenseForm } from "@/components/forms/expense-form";
import { PageHeader } from "@/components/page-header";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Submit expense" };

export default async function NewExpensePage() {
  const me = await currentUser();
  return (
    <>
      <PageHeader title="Submit an expense" description={`This claim will be filed under ${me.name}.`} />
      <ExpenseForm />
    </>
  );
}
