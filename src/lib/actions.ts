"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { addCustomerNote, createCustomer } from "@/lib/data/customers";
import { rejectExpense, reviewExpense, submitExpense } from "@/lib/data/expenses";
import { createInvoice, setInvoiceStatus } from "@/lib/data/invoices";
import { createOrder, transitionOrder } from "@/lib/data/orders";
import { adjustStock } from "@/lib/data/products";
import { resetDatabase } from "@/lib/db";
import { ACTING_COOKIE, currentUser } from "@/lib/session";
import type { CustomerSegment, InvoiceStatus, OrderStatus } from "@/lib/types";

// Server actions: thin wrappers that read the form, call the data layer and
// revalidate. Every action returns { error } on a validation failure so the
// form can show it; nothing throws to the client.

export type ActionResult = { error?: string; ok?: boolean };

function fail(e: unknown): ActionResult {
  return { error: e instanceof Error ? e.message : "Something went wrong" };
}

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

export async function switchUser(staffId: number, pathname: string) {
  const jar = await cookies();
  jar.set(ACTING_COOKIE, String(staffId), { path: "/", sameSite: "lax", httpOnly: true });
  revalidatePath("/", "layout");
  redirect(pathname || "/");
}

export async function addNoteAction(customerId: number, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const me = await currentUser();
    addCustomerNote(customerId, me.id, str(fd, "body"));
    revalidatePath(`/customers/${customerId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function createCustomerAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let id: number;
  try {
    const c = createCustomer({
      name: str(fd, "name"),
      contact_name: str(fd, "contact_name"),
      email: str(fd, "email"),
      phone: str(fd, "phone"),
      city: str(fd, "city"),
      country: str(fd, "country"),
      segment: (str(fd, "segment") || "retail") as CustomerSegment,
      credit_limit_cents: Math.round(Number(str(fd, "credit_limit") || 0) * 100),
    });
    id = c.id;
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/customers");
  redirect(`/customers/${id}`);
}

export async function createOrderAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let id: number;
  try {
    const me = await currentUser();
    const productIds = fd.getAll("product_id").map(Number);
    const quantities = fd.getAll("quantity").map(Number);
    const order = createOrder({
      customerId: Number(str(fd, "customer_id")),
      createdBy: me.id,
      notes: str(fd, "notes"),
      lines: productIds.map((productId, i) => ({ productId, quantity: quantities[i] ?? 0 })),
    });
    id = order.id;
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/orders");
  revalidatePath("/");
  redirect(`/orders/${id}`);
}

export async function transitionOrderAction(orderId: number, to: OrderStatus): Promise<ActionResult> {
  try {
    const me = await currentUser();
    transitionOrder(orderId, to, me.id);
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    revalidatePath("/products");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function invoiceOrderAction(orderId: number): Promise<ActionResult> {
  let invoiceId: number;
  try {
    const me = await currentUser();
    invoiceId = createInvoice(orderId, me.id).id;
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/orders");
  revalidatePath("/invoices");
  revalidatePath("/");
  redirect(`/invoices/${invoiceId}`);
}

export async function setInvoiceStatusAction(invoiceId: number, status: InvoiceStatus): Promise<ActionResult> {
  try {
    const me = await currentUser();
    setInvoiceStatus(invoiceId, status, me.id);
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function adjustStockAction(productId: number, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    adjustStock(productId, Number(str(fd, "delta")));
    revalidatePath("/products");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function submitExpenseAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const me = await currentUser();
    submitExpense({
      staffId: me.id,
      category: str(fd, "category"),
      description: str(fd, "description"),
      amountCents: Math.round(Number(str(fd, "amount")) * 100),
      incurredAt: str(fd, "incurred_at"),
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/expenses");
  revalidatePath("/");
  redirect("/expenses");
}

export async function reviewExpenseAction(expenseId: number, decision: "approved" | "rejected", note = ""): Promise<ActionResult> {
  try {
    const me = await currentUser();
    reviewExpense(expenseId, decision, me.id, note);
    revalidatePath("/expenses");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function rejectExpenseAction(
  expenseId: number,
  prevOrFdOrNote?: ActionResult | FormData | string,
  maybeFd?: FormData,
): Promise<ActionResult> {
  try {
    const me = await currentUser();
    let note = "";
    if (typeof prevOrFdOrNote === "string") {
      note = prevOrFdOrNote;
    } else if (prevOrFdOrNote instanceof FormData) {
      note = str(prevOrFdOrNote, "note") || str(prevOrFdOrNote, "rejection_note");
    } else if (maybeFd instanceof FormData) {
      note = str(maybeFd, "note") || str(maybeFd, "rejection_note");
    }
    rejectExpense(expenseId, me.id, note);
    revalidatePath("/expenses");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function resetDemoDataAction(): Promise<ActionResult> {
  resetDatabase();
  revalidatePath("/", "layout");
  return { ok: true };
}
