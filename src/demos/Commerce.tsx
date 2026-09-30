import { useState } from "react";
import { catalog, checkout, updateStock } from "../core/commerce";
const money = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    n,
  );
function ProductArt({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 180 130" fill="none" aria-hidden="true">
      <ellipse cx="90" cy="108" rx="55" ry="8" fill="#152d40" opacity=".1" />
      <g stroke="#244859" strokeWidth="2">
        {kind === "sensor" ? (
          <>
            <path d="m45 78 58-42 27 17-58 42z" fill="#93b7bc" />
            <path d="m72 95 58-42v16L72 111z" fill="#547c88" />
            <path d="m45 78 27 17v16l-27-17z" fill="#c8dde0" />
            <circle cx="63" cy="91" r="6" fill="#efb162" />
            <path d="M124 44q30-20 29 3t-16 34" />
          </>
        ) : kind === "module" ? (
          <>
            <path d="m52 36 67-10 16 13-67 11z" fill="#b4d4d5" />
            <path d="m68 50 67-11v59l-67 10z" fill="#769f9f" />
            <path d="m52 36 16 14v58l-16-13z" fill="#315a6a" />
            <path d="m81 67 42-7v17l-42 7z" fill="#16384c" />
            <circle cx="118" cy="90" r="3" fill="#9df0b5" />
          </>
        ) : kind === "power" ? (
          <>
            <path d="m40 46 83-17 20 17-83 19z" fill="#d1dadd" />
            <path d="m60 65 83-19v50l-83 19z" fill="#a5b9c0" />
            <path d="m40 46 20 19v50l-20-18z" fill="#5b7786" />
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <path key={n} d={`m${72 + n * 10} 72 0 29`} />
            ))}
            <path d="m55 40 28-6m-19 13 28-6" />
          </>
        ) : (
          <>
            {[0, 1, 2].map((n) => (
              <g key={n} transform={`translate(${n * 29},${n * 9})`}>
                <path d="m42 39 28-5 14 12-28 6z" fill="#e9bc70" />
                <path d="m56 52 28-6v45l-28 6z" fill="#a9814c" />
                <path d="m42 39 14 13v45L42 84z" fill="#ecd3a8" />
                <circle cx="68" cy="64" r="4" fill="#274556" />
              </g>
            ))}
          </>
        )}
      </g>
    </svg>
  );
}
export default function Commerce() {
  const [products, setProducts] = useState(catalog),
    [cart, setCart] = useState<Record<string, number>>({}),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("Todos"),
    [notice, setNotice] = useState(""),
    [editing, setEditing] = useState<{
      id: string;
      version: number;
      stock: string;
    } | null>(null),
    [orders, setOrders] = useState(0);
  const visible = products.filter(
    (p) =>
      (category === "Todos" || p.category === category) &&
      (p.title + " " + p.sku).toLowerCase().includes(query.toLowerCase()),
  );
  const total = products.reduce(
    (sum, p) => sum + p.price * (cart[p.id] || 0),
    0,
  );
  function add(id: string) {
    const p = products.find((p) => p.id === id)!;
    if ((cart[id] || 0) >= p.stock) {
      setNotice("No hay más existencias disponibles.");
      return;
    }
    setCart({ ...cart, [id]: (cart[id] || 0) + 1 });
    setNotice("Producto agregado.");
  }
  function remove(id: string) {
    const next = { ...cart };
    if (next[id] > 1) next[id]--;
    else delete next[id];
    setCart(next);
  }
  function buy() {
    try {
      const result = checkout(products, cart);
      setProducts(result.products);
      setCart({});
      setOrders(orders + 1);
      setNotice(
        `Pedido DEMO-${String(orders + 1).padStart(3, "0")} creado por ${money(result.total)}. Existencias actualizadas.`,
      );
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function save() {
    if (!editing) return;
    try {
      setProducts(
        updateStock(
          products,
          editing.id,
          editing.version,
          Number(editing.stock),
        ),
      );
      setEditing(null);
      setNotice("Inventario actualizado.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  return (
    <div className="workspace">
      <div className="workspace-bar">
        <span className="status-dot" /> Comercio de demostración{" "}
        <span className="right-label">03 / COMERCIO</span>
      </div>
      <div className="commerce-grid">
        <section className="catalog-panel">
          <div className="catalog-toolbar">
            <h2>Catálogo</h2>
            <input
              aria-label="Buscar productos"
              placeholder="Buscar por nombre o SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="filter-tabs">
            {["Todos", "Sensores", "Conectividad", "Energía"].map((c) => (
              <button
                key={c}
                className={category === c ? "active" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="products">
            {visible.map((p) => (
              <article className="product" key={p.id}>
                <div className="product-art">
                  <ProductArt kind={p.art} />
                  <span className={"stock " + (!p.stock ? "out" : "")}>
                    {p.stock ? p.stock + " disponibles" : "Agotado"}
                  </span>
                </div>
                <small>
                  {p.sku} · {p.category}
                </small>
                <h3>{p.title}</h3>
                <div className="product-bottom">
                  <strong>{money(p.price)}</strong>
                  <button
                    className="add"
                    aria-label={"Agregar " + p.title}
                    disabled={!p.stock || (cart[p.id] || 0) >= p.stock}
                    onClick={() => add(p.id)}
                  >
                    +
                  </button>
                </div>
                <button
                  className="text-button inventory-link"
                  onClick={() =>
                    setEditing({
                      id: p.id,
                      version: p.version,
                      stock: String(p.stock),
                    })
                  }
                >
                  Ajustar inventario · v{p.version}
                </button>
              </article>
            ))}
          </div>
          {!visible.length && (
            <div className="empty-state">No hay productos con ese filtro.</div>
          )}
        </section>
        <aside className="cart-panel">
          <h2>
            Tu pedido{" "}
            <span className="badge">
              {Object.values(cart).reduce((s, q) => s + q, 0)}
            </span>
          </h2>
          {Object.keys(cart).length ? (
            products
              .filter((p) => cart[p.id])
              .map((p) => (
                <div className="cart-item" key={p.id}>
                  <div>
                    <strong>{p.title}</strong>
                    <small>
                      {money(p.price)} × {cart[p.id]}
                    </small>
                  </div>
                  <button
                    aria-label={"Quitar " + p.title}
                    onClick={() => remove(p.id)}
                  >
                    −
                  </button>
                </div>
              ))
          ) : (
            <div className="empty-state">Elige un producto para comenzar.</div>
          )}
          <div className="cart-total">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
          <button
            className="button primary"
            disabled={!Object.keys(cart).length}
            onClick={buy}
          >
            Crear pedido de prueba →
          </button>
          <div className="notice" role="status">
            {notice ||
              "El checkout simula el pedido y descuenta las existencias."}
          </div>
          <p className="micro">
            Productos y precios ficticios. No se solicita información de pago ni
            se realiza ningún cobro.
          </p>
          {editing && (
            <div className="inventory-editor">
              <h3>Ajustar existencias</h3>
              <label className="field">
                Cantidad
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editing.stock}
                  onChange={(e) =>
                    setEditing({ ...editing, stock: e.target.value })
                  }
                />
              </label>
              <div className="toolbar">
                <button className="button secondary" onClick={save}>
                  Guardar
                </button>
                <button
                  className="text-button"
                  onClick={() => setEditing(null)}
                >
                  Cerrar
                </button>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setProducts(
                    updateStock(
                      products,
                      editing.id,
                      products.find((p) => p.id === editing.id)!.version,
                      Number(products.find((p) => p.id === editing.id)!.stock),
                    ),
                  );
                  setNotice(
                    "Se simuló un cambio concurrente. Intenta guardar para ver el control de versiones.",
                  );
                }}
              >
                Simular cambio concurrente
              </button>
              <button
                className="text-button"
                onClick={() =>
                  setEditing({
                    ...editing,
                    version: products.find((p) => p.id === editing.id)!.version,
                  })
                }
              >
                Actualizar versión
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
