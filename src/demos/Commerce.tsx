import { lazy, Suspense, useState } from "react";
const SandboxCommerce = lazy(() => import("./SandboxCommerce"));
const store = "https://www.jrsautomation.com.mx";

export default function Commerce() {
  const [view, setView] = useState<"real" | "sandbox">("real");
  const [route, setRoute] = useState<"/" | "/catalogo">("/");
  return (
    <div className="workspace store-workspace">
      <div className="workspace-bar">
        <span className="status-dot" /> JRS Automation
        <span className="right-label">03 / E-COMMERCE REAL</span>
      </div>
      <div
        className="experience-switch"
        aria-label="Elegir experiencia de comercio"
      >
        <button aria-pressed={view === "real"} onClick={() => setView("real")}>
          <span>01</span> Tienda real
        </button>
        <button
          aria-pressed={view === "sandbox"}
          onClick={() => setView("sandbox")}
        >
          <span>02</span> Laboratorio de inventario
        </button>
      </div>
      {view === "real" ? (
        <>
          <div className="store-intro">
            <div>
              <div className="eyebrow">DEL DESARROLLO A LA OPERACIÓN</div>
              <h2>Una tienda en producción.</h2>
              <p>
                La plataforma real de JRS Automation: catálogo industrial,
                búsqueda, carrito, pedidos y cotizaciones en una misma
                experiencia.
              </p>
            </div>
            <a
              className="button primary"
              href={store + route}
              target="_blank"
              rel="noreferrer"
            >
              Abrir tienda real ↗
            </a>
          </div>
          <div className="store-features">
            <div>
              <strong>Catálogo</strong>
              <span>Búsqueda y filtros</span>
            </div>
            <div>
              <strong>Compra</strong>
              <span>Carrito y pedidos</span>
            </div>
            <div>
              <strong>Operación</strong>
              <span>Inventario y cotizaciones</span>
            </div>
            <div>
              <strong>Full Stack</strong>
              <span>Next.js · Supabase · PostgreSQL</span>
            </div>
          </div>
          <div className="store-browser">
            <div className="store-browser-bar">
              <span className="browser-dots" aria-hidden="true">
                ● ● ●
              </span>
              <span className="store-domain">jrsautomation.com.mx</span>
              <div
                className="store-route-controls"
                aria-label="Vista de la tienda"
              >
                <button
                  aria-pressed={route === "/"}
                  onClick={() => setRoute("/")}
                >
                  Inicio
                </button>
                <button
                  aria-pressed={route === "/catalogo"}
                  onClick={() => setRoute("/catalogo")}
                >
                  Catálogo
                </button>
              </div>
            </div>
            <iframe
              key={route}
              title="Tienda real JRS Automation"
              src={store + route}
              loading="eager"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="store-footnote">
            <span>
              <span className="status-dot" /> SITIO EN PRODUCCIÓN · Precios y
              disponibilidad del comercio.
            </span>
            <a href={store + "/catalogo"} target="_blank" rel="noreferrer">
              Ver catálogo en otra pestaña ↗
            </a>
          </div>
        </>
      ) : (
        <Suspense
          fallback={
            <div className="loading" role="status">
              Preparando el laboratorio…
            </div>
          }
        >
          <SandboxCommerce />
        </Suspense>
      )}
    </div>
  );
}
