import { useCallback, useMemo, useRef, useState } from 'react';
import { useOperacion } from './api/useOperacion';
import { Espacio3D } from './escena/Espacio3D';
import { PanelAjustes } from './paneles/Ajustes';
import { PanelAsignar } from './paneles/Asignar';
import type { PropsPanel } from './paneles/contexto';
import { PanelFlota } from './paneles/Flota';
import { PanelHistorial } from './paneles/Historial';
import { PanelMisiones } from './paneles/Misiones';

const PESTANAS = [
  { id: 'flota', nombre: 'Flota' },
  { id: 'misiones', nombre: 'Misiones' },
  { id: 'asignar', nombre: 'Asignar' },
  { id: 'historial', nombre: 'Historial' },
  { id: 'ajustes', nombre: 'Ajustes' },
] as const;
type Pestana = (typeof PESTANAS)[number]['id'];

export default function App() {
  const op = useOperacion();
  const [pestana, setPestana] = useState<Pestana>('flota');
  const [dronSeleccionado, seleccionarDron] = useState<string | null>(null);
  const [misionSeleccionada, seleccionarMision] = useState<string | null>(null);
  const [claveEligiendo, setClaveEligiendo] = useState<string | null>(null);
  const alElegirPunto = useRef<((lat: number, lon: number) => void) | null>(null);
  const [reiniciarVista, setReiniciarVista] = useState(0);

  const pedirPunto = useCallback((clave: string, alElegir: (lat: number, lon: number) => void) => {
    setClaveEligiendo((actual) => {
      if (actual === clave) {
        alElegirPunto.current = null;
        return null;
      }
      alElegirPunto.current = alElegir;
      return clave;
    });
  }, []);

  const asignacionesActivas = useMemo(() => op.historial.filter((a) => a.activa), [op.historial]);

  const propsPanel: PropsPanel = {
    op,
    dronSeleccionado,
    misionSeleccionada,
    seleccionarDron,
    seleccionarMision,
    pedirPunto,
    claveEligiendo,
    irAAsignar: (id) => {
      seleccionarMision(id);
      setPestana('asignar');
    },
  };

  const disponibles = op.drones.filter((d) => d.estado === 'DISPONIBLE').length;

  return (
    <div className="consola">
      <header className="barra">
        <div className="marca-app">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M16 8l4.5 11-4.5-2.8L11.5 19z" fill="currentColor" />
          </svg>
          <h1>Centro de Control de Drones</h1>
        </div>
        <dl className="resumen">
          <div>
            <dt>Disponibles</dt>
            <dd>
              {disponibles} de {op.drones.length}
            </dd>
          </div>
          <div>
            <dt>Pendientes</dt>
            <dd>{op.pendientes.length}</dd>
          </div>
          <div>
            <dt>En curso</dt>
            <dd>{op.enCurso.length}</dd>
          </div>
          <div>
            <dt>Reserva</dt>
            <dd>{op.reserva?.configurada ? `${op.reserva.valor} km` : 'sin configurar'}</dd>
          </div>
        </dl>
        <p className={`conexion ${op.conectado === false ? 'caida' : op.conectado ? 'ok' : ''}`} role="status">
          {op.conectado === null ? 'Conectando…' : op.conectado ? 'Backend en línea' : 'Reconectando…'}
        </p>
      </header>

      <main className="cuerpo">
        <section className="mapa" aria-label="Espacio aéreo">
          <Espacio3D
            drones={op.drones}
            pendientes={op.pendientes}
            enCurso={op.enCurso}
            asignacionesActivas={asignacionesActivas}
            reservaKm={op.reserva?.valor ?? null}
            dronSeleccionado={dronSeleccionado}
            misionSeleccionada={misionSeleccionada}
            eligiendoPunto={claveEligiendo !== null}
            reiniciarVista={reiniciarVista}
            onSeleccionarDron={(id) => {
              seleccionarDron(id);
              setPestana('flota');
            }}
            onSeleccionarMision={(id) => {
              seleccionarMision(id);
              if (op.pendientes.some((m) => m.id === id)) setPestana('asignar');
              else setPestana('misiones');
            }}
            onElegirPunto={(lat, lon) => {
              alElegirPunto.current?.(lat, lon);
              alElegirPunto.current = null;
              setClaveEligiendo(null);
            }}
          />
          {claveEligiendo && <p className="indicacion-mapa">Haga clic en el terreno para fijar la ubicación.</p>}
          <button className="boton-mapa" onClick={() => setReiniciarVista((n) => n + 1)}>
            Centrar vista
          </button>
          {op.conectado === null && <p className="estado-carga">Conectando con el backend…</p>}
          {op.conectado === false && (
            <div className="sin-conexion" role="alert">
              <p>
                <strong>Sin conexión con el backend.</strong>
              </p>
              <p>
                {op.segundosSinRespuesta < 90
                  ? `Si está desplegado en Render, el servidor puede tardar hasta un minuto en despertar. Reintentando cada 5 segundos (${op.segundosSinRespuesta} s).`
                  : 'El servidor sigue sin responder. Revise que el backend esté en ejecución y que la dirección de la API sea correcta.'}
              </p>
              <button className="boton" onClick={() => void op.refrescar()}>
                Reintentar ahora
              </button>
            </div>
          )}
          <Leyenda />
        </section>

        <aside className="panel">
          <nav className="pestanas" role="tablist" aria-label="Secciones">
            {PESTANAS.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={pestana === p.id}
                className={pestana === p.id ? 'sel' : ''}
                onClick={() => setPestana(p.id)}
              >
                {p.nombre}
                {p.id === 'misiones' && op.pendientes.length > 0 && <span className="contador">{op.pendientes.length}</span>}
              </button>
            ))}
          </nav>
          <div role="tabpanel">
            {pestana === 'flota' && <PanelFlota {...propsPanel} />}
            {pestana === 'misiones' && <PanelMisiones {...propsPanel} />}
            {pestana === 'asignar' && <PanelAsignar {...propsPanel} />}
            {pestana === 'historial' && <PanelHistorial {...propsPanel} />}
            {pestana === 'ajustes' && <PanelAjustes {...propsPanel} />}
          </div>
        </aside>
      </main>
    </div>
  );
}

function Leyenda() {
  return (
    <figure className="leyenda" aria-label="Leyenda del mapa">
      <ul>
        <li>
          <i className="l-dron disponible" /> Dron disponible
        </li>
        <li>
          <i className="l-dron asignado" /> Asignado
        </li>
        <li>
          <i className="l-dron en-mision" /> En misión
        </li>
        <li>
          <i className="l-dron mantenimiento" /> En mantenimiento
        </li>
        <li>
          <i className="l-anillo pendiente" /> Destino pendiente
        </li>
        <li>
          <i className="l-anillo activo" /> Destino con dron
        </li>
      </ul>
      <figcaption>Cuadrícula de 1 km. Arrastre para girar, rueda para acercar.</figcaption>
    </figure>
  );
}
