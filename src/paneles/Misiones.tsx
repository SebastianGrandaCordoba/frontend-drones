import { useState, type FormEvent } from 'react';
import { api } from '../api/cliente';
import {
  NOMBRE_ESTADO_MISION,
  NOMBRE_PRIORIDAD,
  NOMBRE_TIPO,
  PRIORIDADES,
  TIPOS,
  UNIDAD_POR_TIPO,
  type Mision,
  type Prioridad,
  type TipoMision,
} from '../api/tipos';
import { avisoDeError, Campo, MostrarAviso, SelectorUbicacion, type Aviso } from '../componentes/Formulario';
import type { PropsPanel } from './contexto';

const formatoFecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
export const fecha = (iso: string) => formatoFecha.format(new Date(iso));

/** Misiones: registrar (HU-04), bandeja de pendientes (HU-05) y ciclo de vida (HU-11). */
export function PanelMisiones(p: PropsPanel) {
  const [registrando, setRegistrando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  const accion = async (m: Mision, verbo: 'iniciar' | 'completar' | 'cancelar') => {
    try {
      const r = await api[verbo](m.id);
      void p.op.refrescar();
      setAviso({ tipo: 'ok', texto: `Misión ${m.id.slice(0, 8)}: ${NOMBRE_ESTADO_MISION[r.estado].toLowerCase()}.` });
    } catch (err) {
      setAviso(avisoDeError(err));
    }
  };

  return (
    <div className="panel-contenido">
      <div className="encabezado-panel">
        <h2>Misiones</h2>
        <button className="boton" onClick={() => setRegistrando((r) => !r)} aria-expanded={registrando}>
          {registrando ? 'Cerrar registro' : 'Registrar misión'}
        </button>
      </div>

      {registrando && (
        <RegistroMision
          {...p}
          alRegistrar={(m) => {
            setRegistrando(false);
            setAviso({ tipo: 'ok', texto: `Misión registrada como pendiente (${m.id.slice(0, 8)}).` });
            p.seleccionarMision(m.id);
          }}
        />
      )}
      <MostrarAviso aviso={aviso} />

      <h3>Pendientes, de la más urgente a la menos urgente</h3>
      {p.op.pendientes.length === 0 ? (
        <p className="vacio">No hay misiones pendientes. Registre una para asignarle un dron.</p>
      ) : (
        <ol className="lista">
          {p.op.pendientes.map((m) => (
            <li key={m.id}>
              <FilaMision mision={m} {...p}>
                <button className="boton" onClick={() => p.irAAsignar(m.id)}>
                  Asignar dron
                </button>
                <button className="boton texto" onClick={() => accion(m, 'cancelar')}>
                  Cancelar
                </button>
              </FilaMision>
            </li>
          ))}
        </ol>
      )}

      <h3>En curso</h3>
      {p.op.enCurso.length === 0 ? (
        <p className="vacio">Ninguna misión tiene un dron asignado en este momento.</p>
      ) : (
        <ul className="lista">
          {p.op.enCurso.map((m) => {
            const a = p.op.historial.find((x) => x.activa && x.misionId === m.id);
            return (
              <li key={m.id}>
                <FilaMision mision={m} {...p} dronId={a?.dronId}>
                  {m.estado === 'ASIGNADA' && (
                    <>
                      <button className="boton" onClick={() => accion(m, 'iniciar')}>
                        Iniciar
                      </button>
                      <button className="boton texto" onClick={() => accion(m, 'cancelar')}>
                        Cancelar
                      </button>
                    </>
                  )}
                  {m.estado === 'EN_EJECUCION' && (
                    <button className="boton" onClick={() => accion(m, 'completar')}>
                      Completar
                    </button>
                  )}
                </FilaMision>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilaMision({
  mision: m,
  dronId,
  children,
  ...p
}: PropsPanel & { mision: Mision; dronId?: string; children: React.ReactNode }) {
  const sel = p.misionSeleccionada === m.id;
  return (
    <div className={`fila mision ${sel ? 'sel' : ''}`}>
      <button
        className="fila-cuerpo"
        onClick={() => p.seleccionarMision(sel ? null : m.id)}
        aria-pressed={sel}
      >
        <span className="fila-titulo">
          <span className={`prioridad p-${m.prioridad}`}>{NOMBRE_PRIORIDAD[m.prioridad]}</span>
          <strong>{NOMBRE_TIPO[m.tipo]}</strong>
          <span className="id">{m.id.slice(0, 8)}</span>
        </span>
        <span className="dato">
          {m.distanciaKm} km, requiere {m.capacidadRequerida} {UNIDAD_POR_TIPO[m.tipo]}
        </span>
        <span className="dato">Límite: {fecha(m.limiteTiempo)}</span>
        {dronId && (
          <span className="dato">
            {NOMBRE_ESTADO_MISION[m.estado]} con el dron <strong>{dronId}</strong>
          </span>
        )}
      </button>
      <div className="acciones">{children}</div>
    </div>
  );
}

function mananaAEstaHora() {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function RegistroMision(p: PropsPanel & { alRegistrar: (m: Mision) => void }) {
  const [tipo, setTipo] = useState<TipoMision>('ENTREGA');
  const [prioridad, setPrioridad] = useState<Prioridad>('MEDIA');
  const [distancia, setDistancia] = useState('10');
  const [limite, setLimite] = useState(mananaAEstaHora());
  const [capacidad, setCapacidad] = useState('1');
  const [lat, setLat] = useState('4.66');
  const [lon, setLon] = useState('-74.06');
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const m = await api.registrarMision({
        tipo,
        prioridad,
        distanciaKm: Number(distancia),
        limiteTiempo: limite.length === 16 ? `${limite}:00` : limite,
        destino: { latitud: Number(lat), longitud: Number(lon) },
        capacidadRequerida: Number(capacidad),
      });
      void p.op.refrescar();
      p.alRegistrar(m);
    } catch (err) {
      setAviso(avisoDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="formulario" onSubmit={enviar}>
      <div className="rejilla">
        <Campo etiqueta="Tipo">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMision)}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {NOMBRE_TIPO[t]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Prioridad">
          <select value={prioridad} onChange={(e) => setPrioridad(e.target.value as Prioridad)}>
            {PRIORIDADES.map((x) => (
              <option key={x} value={x}>
                {NOMBRE_PRIORIDAD[x]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Distancia planificada (km)">
          <input type="number" min={0} step="any" required value={distancia} onChange={(e) => setDistancia(e.target.value)} />
        </Campo>
        <Campo etiqueta={`Capacidad requerida (${UNIDAD_POR_TIPO[tipo]})`}>
          <input type="number" min={0} step="any" required value={capacidad} onChange={(e) => setCapacidad(e.target.value)} />
        </Campo>
        <Campo etiqueta="Límite de tiempo" ancho="completo">
          <input type="datetime-local" required value={limite} onChange={(e) => setLimite(e.target.value)} />
        </Campo>
      </div>
      <SelectorUbicacion
        latitud={lat}
        longitud={lon}
        onCambiar={(a, b) => {
          setLat(a);
          setLon(b);
        }}
        eligiendo={p.claveEligiendo === 'registro-mision'}
        onElegirEnMapa={() =>
          p.pedirPunto('registro-mision', (a, b) => {
            setLat(String(a));
            setLon(String(b));
          })
        }
      />
      <MostrarAviso aviso={aviso} />
      <button className="boton" disabled={enviando}>
        {enviando ? 'Registrando…' : 'Registrar misión'}
      </button>
    </form>
  );
}
