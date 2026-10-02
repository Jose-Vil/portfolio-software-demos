import { lazy, Suspense, useState } from "react";
import StressBall3D, {
  type StressBallInteractionState,
} from "../components/StressBall3D";
const UniverseExperience = lazy(
  () => import("../components/universe/UniverseExperience"),
);
export default function Mobile() {
  const [experience, setExperience] = useState<"ball" | "universe">("ball");
  const [universeOpen, setUniverseOpen] = useState(false);
  const [state, setState] = useState<StressBallInteractionState>({
    contacts: 0,
    pressure: 0,
    hasInteracted: false,
  });
  return (
    <div className="workspace">
      <div className="workspace-bar">
        <span className="status-dot" /> Experiencia interactiva{" "}
        <span className="right-label">04 / MÓVIL</span>
      </div>
      <div className="experience-switch" aria-label="Elegir experiencia móvil">
        <button
          aria-pressed={experience === "ball"}
          onClick={() => setExperience("ball")}
        >
          <span>01</span> Pelota interactiva
        </button>
        <button
          aria-pressed={experience === "universe"}
          onClick={() => setExperience("universe")}
        >
          <span>02</span> Universo 3D
        </button>
      </div>
      {experience === "ball" ? (
        <div className="mobile-grid">
          <div className="phone-stage">
            <div className="phone">
              <div className="phone-top">
                <span>9:41</span>
                <span>● ▰</span>
              </div>
              <div className="phone-copy">
                <small>PAUSA INTERACTIVA</small>
                <h2>
                  Respira.
                  <br />
                  Toca. Suelta.
                </h2>
                <p>Una pequeña experiencia para explorar.</p>
              </div>
              <div className="ball-container">
                <StressBall3D
                  onInteractionChange={setState}
                  ariaLabel="Pelota elástica. Mantén presionado o usa la tecla Espacio para comprimir."
                />
              </div>
              <div className="phone-bottom">
                <span className="touch-indicator" />
                Mantén presionado para comprimir
                <div className="home-indicator" />
              </div>
            </div>
          </div>
          <aside className="mobile-info">
            <div className="eyebrow">DISEÑO + INGENIERÍA</div>
            <h2>
              La interacción
              <br />
              también comunica.
            </h2>
            <p>
              Una escena 3D con geometría y materiales generados por código. La
              forma responde a la presión y vuelve a su estado mediante un
              modelo elástico.
            </p>
            <div className="interaction-meter">
              <span>Presión de interacción</span>
              <progress max="1" value={Math.min(1, state.pressure)} />
              <strong>{Math.round(Math.min(1, state.pressure) * 100)}%</strong>
            </div>
            <div className="mobile-facts">
              <div>
                <strong>{state.contacts}</strong>
                <span>Contactos activos</span>
              </div>
              <div>
                <strong>{state.hasInteracted ? "Explorando" : "Lista"}</strong>
                <span>Estado de la experiencia</span>
              </div>
            </div>
            <ul className="feature-list">
              <li>Entrada táctil, puntero y teclado</li>
              <li>Materiales y texturas procedurales</li>
              <li>Adaptación al tamaño de pantalla</li>
              <li>Alternativa en Canvas si WebGL no está disponible</li>
            </ul>
            <p className="micro">
              Usa el ratón o coloca varios dedos sobre la pelota. Con teclado:
              enfoca la escena y mantén Espacio o Enter.
            </p>
          </aside>
        </div>
      ) : (
        <div className="mobile-grid universe-grid">
          <div className="universe-preview">
            <div className="cosmic-stars" aria-hidden="true" />
            <div className="cosmic-ring ring-one" aria-hidden="true" />
            <div className="cosmic-ring ring-two" aria-hidden="true" />
            <div className="cosmic-core" aria-hidden="true">
              ✦
            </div>
            <div className="universe-preview-copy">
              <small>COSMIC LAB / EXPERIENCIA INMERSIVA</small>
              <h2>
                Un universo
                <br />
                para explorar.
              </h2>
              <button
                className="button light"
                onClick={() => setUniverseOpen(true)}
              >
                Explorar el universo <span>↗</span>
              </button>
            </div>
          </div>
          <aside className="mobile-info">
            <div className="eyebrow">SEGUNDA EXPERIENCIA / UNIVERSO 3D</div>
            <h2>
              De la interacción
              <br />a la inmersión.
            </h2>
            <p>
              La galaxia que desarrollé, adaptada para el portafolio: un
              recorrido por planetas, constelaciones, meteoros y pequeños mundos
              con un núcleo cristalino.
            </p>
            <div className="mobile-facts">
              <div>
                <strong>12</strong>
                <span>Coleccionables por descubrir</span>
              </div>
              <div>
                <strong>3D</strong>
                <span>Geometría procedural</span>
              </div>
            </div>
            <ul className="feature-list">
              <li>Viaje de entrada y navegación libre</li>
              <li>Galaxia de partículas, planetas y meteoros</li>
              <li>Controles táctiles, joystick y teclado</li>
              <li>Progreso de exploración guardado en el navegador</li>
            </ul>
            <p className="micro">
              Abre la escena en pantalla completa. Arrastra para mirar, usa el
              control circular para viajar y Centro para regresar. En
              escritorio: WASD para viajar, flechas para mirar y Q/E para
              cambiar altura. Escape cierra la experiencia.
            </p>
          </aside>
        </div>
      )}
      {universeOpen && (
        <Suspense
          fallback={
            <div className="universe-loading" role="status">
              <p>Preparando el universo…</p>
              <button
                className="button light"
                onClick={() => setUniverseOpen(false)}
              >
                Volver
              </button>
            </div>
          }
        >
          <UniverseExperience onExit={() => setUniverseOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
