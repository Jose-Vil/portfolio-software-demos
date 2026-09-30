import { useState } from "react";
import StressBall3D, {
  type StressBallInteractionState,
} from "../components/StressBall3D";
export default function Mobile() {
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
            forma responde a la presión y vuelve a su estado mediante un modelo
            elástico.
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
    </div>
  );
}
