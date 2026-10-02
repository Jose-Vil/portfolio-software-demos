import { lazy, Suspense, useEffect, useState } from "react";
const Documents = lazy(() => import("./demos/Documents"));
const Billing = lazy(() => import("./demos/Billing"));
const Commerce = lazy(() => import("./demos/Commerce"));
const Mobile = lazy(() => import("./demos/Mobile"));
const projects = [
  {
    id: "documentos",
    n: "01",
    title: "Documentos → decisiones",
    type: "OCR · OPERACIONES",
    description:
      "Convierte documentos en registros revisables. Extracción local, validación humana y trazabilidad.",
    tech: "React · TypeScript · Tesseract · PDF.js",
    icon: "scan",
    metric: "Del archivo al registro",
  },
  {
    id: "mensajeria",
    n: "02",
    title: "Conversaciones que resuelven",
    type: "MENSAJERÍA · AUTOMATIZACIÓN",
    description:
      "Un flujo de autofacturación por chat: recibe, valida, presenta un borrador y solicita confirmación.",
    tech: "JavaScript · Máquinas de estados · APIs",
    icon: "chat",
    metric: "Un flujo, cada estado visible",
  },
  {
    id: "comercio",
    n: "03",
    title: "JRS Automation · Tienda real",
    type: "E-COMMERCE · INVENTARIO",
    description:
      "La plataforma comercial en producción: catálogo industrial, búsqueda, carrito, pedidos y cotizaciones.",
    tech: "Next.js · TypeScript · Supabase · PostgreSQL",
    icon: "shop",
    metric: "Software en producción",
  },
  {
    id: "movil",
    n: "04",
    title: "Una interfaz que se siente",
    type: "MÓVIL · EXPERIENCIAS 3D",
    description:
      "Dos experiencias: una pelota que responde al tacto y un universo 3D con navegación libre y mundos por descubrir.",
    tech: "Three.js · WebGL · React · Multitáctil",
    icon: "orb",
    metric: "Toca. Viaja. Descubre.",
  },
];
export function Icon({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === "scan" ? (
          <>
            <path d="M16 7H9v9m23-9h7v9M9 32v9h7m23-9v9h-7M8 24h32" />
            <rect x="17" y="13" width="14" height="23" rx="2" />
            <path d="M21 18h6m-6 11h6" />
          </>
        ) : kind === "chat" ? (
          <>
            <path d="M8 10h32v23H21l-9 7v-7H8z" />
            <path d="M15 18h18m-18 7h11" />
          </>
        ) : kind === "shop" ? (
          <>
            <path d="M7 8h5l5 24h20l5-17H14M20 21h14m-13 5h10" />
            <circle cx="20" cy="40" r="2" />
            <circle cx="35" cy="40" r="2" />
          </>
        ) : (
          <>
            <circle cx="24" cy="24" r="16" />
            <ellipse cx="24" cy="24" rx="7" ry="16" />
            <ellipse cx="24" cy="24" rx="16" ry="7" />
            <path d="m36 7 2-4m5 12 4-2" />
          </>
        )}
      </g>
    </svg>
  );
}
export default function App() {
  const [page, setPage] = useState(location.hash.slice(1));
  useEffect(() => {
    const update = () => {
      const hash = location.hash.slice(1);
      setPage(hash);
      if (hash !== "proyectos") window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const project = projects.find((p) => p.id === page);
  return (
    <>
      <a
        className="skip"
        href="#contenido"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("contenido")?.focus();
        }}
      >
        Ir al contenido
      </a>
      <header className="topbar">
        <a className="brand" href="#">
          <span className="monogram">
            JL<span>.</span>
          </span>
          <span>
            JOSE LUIS
            <br />
            <small>SOFTWARE & AUTOMATIZACIÓN</small>
          </span>
        </a>
        <nav aria-label="Principal">
          <a href="#" aria-current={!project ? "page" : undefined}>
            Proyectos
          </a>
          <a
            href="https://github.com/Jose-Vil/portfolio-software-demos"
            target="_blank"
            rel="noreferrer"
          >
            Código <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
      <main id="contenido" tabIndex={-1}>
        {project ? (
          <>
            <div className="project-heading">
              <a className="back" href="#">
                ← Todos los proyectos
              </a>
              <div className="eyebrow">
                {project.n} / {project.type}
              </div>
              <h1>{project.title}</h1>
              <p>{project.description}</p>
              <div className="pills">
                {project.tech.split(" · ").map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>
            <Suspense
              fallback={
                <div className="loading" role="status">
                  Preparando la experiencia…
                </div>
              }
            >
              {page === "documentos" ? (
                <Documents />
              ) : page === "mensajeria" ? (
                <Billing />
              ) : page === "comercio" ? (
                <Commerce />
              ) : (
                <Mobile />
              )}
            </Suspense>
            <div className="demo-note">
              {page === "comercio"
                ? "La tienda abre el sitio real de JRS Automation. El laboratorio de inventario utiliza productos ficticios y pedidos de prueba."
                : page === "movil"
                  ? "Experiencias web adaptables al móvil. El universo guarda únicamente el progreso de exploración en este navegador."
                  : "Demo de portafolio con datos ficticios. Las integraciones de producción se representan mediante simulaciones locales."}
            </div>
          </>
        ) : (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span className="dot" /> INGENIERÍA EN SISTEMAS · IPN
                </div>
                <h1>
                  Ideas que funcionan.
                  <br />
                  <span>Software que resuelve.</span>
                </h1>
                <p>
                  Soy Jose Luis Rodriguez Villegas. Desarrollo aplicaciones y
                  automatizo procesos, conectando interfaces claras con la
                  lógica que hace funcionar un negocio.
                </p>
                <a className="button light" href="#proyectos">
                  Explorar mis proyectos <span>↓</span>
                </a>
                <div className="hero-foot">
                  <span>FULL STACK</span>
                  <span>DATOS & AUTOMATIZACIÓN</span>
                  <span>EXPERIENCIAS INTERACTIVAS</span>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="orbit o1" />
                <div className="orbit o2" />
                <div className="core-orb" />
                <div className="floating-card f1">
                  <span>01</span> Capturar
                </div>
                <div className="floating-card f2">
                  <span>02</span> Validar
                </div>
                <div className="floating-card f3">
                  <span>03</span> Resolver <b>↗</b>
                </div>
                <div className="art-caption">DE LA INFORMACIÓN A LA ACCIÓN</div>
              </div>
            </section>
            <section className="portfolio" id="proyectos">
              <div className="section-intro">
                <div>
                  <div className="eyebrow">TRABAJO SELECCIONADO</div>
                  <h2>Explora. Prueba. Revisa el código.</h2>
                </div>
                <p>
                  Cuatro experiencias interactivas que muestran cómo diseño
                  interfaces, modelo procesos y convierto reglas de negocio en
                  software.
                </p>
              </div>
              <div className="project-grid">
                {projects.map((p) => (
                  <a
                    className={"project-card card-" + p.id}
                    href={"#" + p.id}
                    key={p.id}
                  >
                    <div className="card-visual">
                      <span className="project-number">/{p.n}</span>
                      <Icon kind={p.icon} />
                      <span className="visual-caption">{p.metric}</span>
                    </div>
                    <div className="card-body">
                      <div className="eyebrow">{p.type}</div>
                      <h3>
                        {p.title}
                        <span>↗</span>
                      </h3>
                      <p>{p.description}</p>
                      <div className="card-stack">{p.tech}</div>
                      <div className="card-cta">
                        {p.id === "comercio"
                          ? "Explorar tienda real"
                          : "Abrir demo"}{" "}
                        <span>→</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
            <section className="approach">
              <div>
                <div className="eyebrow">CÓMO TRABAJO</div>
                <h2>
                  Entender el proceso.
                  <br />
                  Construir la solución.
                </h2>
              </div>
              <div className="approach-items">
                <div>
                  <span>01</span>
                  <h3>Del problema al modelo</h3>
                  <p>
                    Reglas claras, estados explícitos y datos que se pueden
                    revisar.
                  </p>
                </div>
                <div>
                  <span>02</span>
                  <h3>Una experiencia útil</h3>
                  <p>
                    Interfaces accesibles que ayudan a completar una tarea sin
                    fricción.
                  </p>
                </div>
                <div>
                  <span>03</span>
                  <h3>Calidad verificable</h3>
                  <p>
                    Validaciones, pruebas y documentación para explicar cada
                    decisión.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <footer>
        <a className="monogram" href="#">
          JL<span>.</span>
        </a>
        <p>
          Jose Luis Rodriguez Villegas
          <br />
          <span>Desarrollo de software · Automatización · Sistemas</span>
        </p>
        <a href="https://github.com/Jose-Vil" target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
      </footer>
    </>
  );
}
