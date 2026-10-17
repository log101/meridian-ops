import { q } from "@/lib/db";
import type { Product } from "@/lib/types";

export function listProducts(query = ""): Product[] {
  const term = query.trim();
  if (!term) return q("SELECT * FROM products ORDER BY category, sku").all() as Product[];
  const like = `%${term}%`;
  return q("SELECT * FROM products WHERE sku LIKE ? OR name LIKE ? OR category LIKE ? ORDER BY category, sku")
    .all(like, like, like) as Product[];
}

export function getProduct(id: number): Product | null {
  return (q("SELECT * FROM products WHERE id = ?").get(id) as Product | undefined) ?? null;
}

export function listLowStock(): Product[] {
  return q("SELECT * FROM products WHERE stock <= reorder_level ORDER BY (stock - reorder_level)").all() as Product[];
}

/** Adds (or removes, when negative) stock. Stock never goes below zero. */
export function adjustStock(productId: number, delta: number): Product {
  if (!Number.isInteger(delta) || delta === 0) throw new Error("Adjustment must be a non-zero whole number");
  const p = getProduct(productId);
  if (!p) throw new Error("Product not found");
  if (p.stock + delta < 0) throw new Error(`Only ${p.stock} in stock`);
  q("UPDATE products SET stock = stock + ? WHERE id = ?").run(delta, productId);
  return getProduct(productId)!;
}
