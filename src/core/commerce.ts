export type Product = {
  id: string;
  sku: string;
  title: string;
  category: string;
  price: number;
  stock: number;
  version: number;
  art: string;
};
export const catalog: Product[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    sku: "DEM-001",
    title: "Sensor de proximidad",
    category: "Sensores",
    price: 490,
    stock: 12,
    version: 1,
    art: "sensor",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    sku: "DEM-002",
    title: "Módulo de conexión",
    category: "Conectividad",
    price: 1290,
    stock: 5,
    version: 1,
    art: "module",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    sku: "DEM-003",
    title: "Fuente de alimentación",
    category: "Energía",
    price: 850,
    stock: 8,
    version: 1,
    art: "power",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    sku: "DEM-004",
    title: "Kit de terminales",
    category: "Conectividad",
    price: 240,
    stock: 0,
    version: 1,
    art: "kit",
  },
];
export function updateStock(
  products: Product[],
  id: string,
  expectedVersion: number,
  stock: number,
): Product[] {
  if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000)
    throw new Error("Usa una cantidad entera entre 0 y 1,000,000.");
  const product = products.find((p) => p.id === id);
  if (!product) throw new Error("Producto inexistente.");
  if (product.version !== expectedVersion)
    throw new Error(
      "El inventario cambió. Actualiza la versión antes de guardar.",
    );
  return products.map((p) =>
    p.id === id ? { ...p, stock, version: p.version + 1 } : p,
  );
}
export function checkout(
  products: Product[],
  cart: Record<string, number>,
): { products: Product[]; total: number } {
  const entries = Object.entries(cart);
  if (!entries.length) throw new Error("Agrega un producto al carrito.");
  let total = 0;
  for (const [id, quantity] of entries) {
    const p = products.find((p) => p.id === id);
    if (!p || !Number.isInteger(quantity) || quantity < 1 || quantity > p.stock)
      throw new Error(
        "Hay productos sin existencias suficientes. Revisa el carrito.",
      );
    total += p.price * quantity;
  }
  return {
    products: products.map((p) =>
      cart[p.id]
        ? { ...p, stock: p.stock - cart[p.id], version: p.version + 1 }
        : p,
    ),
    total: Math.round(total * 100) / 100,
  };
}
