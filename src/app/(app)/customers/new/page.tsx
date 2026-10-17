import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/components/forms/customer-form";

export const metadata = { title: "New customer" };

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader title="New customer" description="Add an account you can place orders for." />
      <CustomerForm />
    </>
  );
}
