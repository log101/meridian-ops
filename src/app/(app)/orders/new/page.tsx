import { OrderForm } from "@/components/forms/order-form";
import { PageHeader } from "@/components/page-header";
import { listCustomers } from "@/lib/data/customers";
import { listProducts } from "@/lib/data/products";

export const metadata = { title: "New order" };

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { customer } = await searchParams;
  return (
    <>
      <PageHeader title="New order" description="Orders start as drafts. Confirm them from the order page once the customer agrees." />
      <OrderForm customers={listCustomers()} products={listProducts()} defaultCustomerId={customer ? Number(customer) : undefined} />
    </>
  );
}
