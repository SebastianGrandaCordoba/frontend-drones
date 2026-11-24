import { useEffect, useState } from 'react';
import { api } from '../api/cliente';
import {
  NOMBRE_PRIORIDAD,
  NOMBRE_TIPO,
  type DetalleMision,
  type Estrategia,
  type ResultadoAsignacion,
} from '../api/tipos';
import { avisoDeError, Campo, MostrarAviso, type Aviso } from '../componentes/Formulario';
import type { PropsPanel } from './contexto';
import { fecha } from './Misiones';

/** Asignación automática (HU-06), estrategia (HU-07), resultado y motivos (HU-08, HU-09), sin dobles (HU-10). */
export function PanelAsignar(p: PropsPanel) {
  const [estrategias, setEstrategias] = useState<Estrategia[]>([]);
  const [estrategia, setEstrategia] = useState('MENOR_DISTANCIA');
  const [resultado, setResultado] = useState<ResultadoAsignacion | null>(null);
  const [detalle, setDetalle] = useState<DetalleMision | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [asignando, setAsignando] = useState(false);

  const misionId = p.misionSeleccionada ?? '';
  const pendiente = p.op.pendientes.find((m) => m.id === misionId);

  useEffect(() => {
    api
      .estrategias()
      .then((e) => {
        setEstrategias(e);
        const pred = e.find((x) => x.predeterminada);
        if (pred) setEstrategia(pred.nombre);
      })
      .catch(() => setEstrategias([]));
  }, []);

  // Resultado y justificación de la misión elegida (HU-08), también para misiones ya asignadas.
  useEffect(() => {
    setResultado(null);
    setAviso(null);
  }, [misionId]);

  useEffect(() => {
    if (!misionId) {
      setDetalle(null);
      return;
    }
    let vigente = true;
    api
      .detalle(misionId)
      .then((d) => vigente && setDetalle(d))
      .catch(() => vigente && setDetalle(null));
    return () => {
      vigente = false;
    };
  }, [misionId, p.op.historial]);

  const asignar = async () => {
    if (!misionId) return;
    setAsignando(true);
    setAviso(null);
    try {
      const r = await api.asignar(misionId, estrategia);
      setResultado(r);
      // El resultado se muestra de inmediato con la respuesta; la consola se refresca después.
      if (r.asignacion) {
        setDetalle({
          misionId,
          estadoMision: r.asignacion.estadoMision,
          asignada: true,
          mensaje: 'Misión con dron asignado (asignación activa)',
          asignacion: r.asignacion,
        });
        p.seleccionarDron(r.asignacion.dronId);
      }
      void p.op.refrescar();
    } catch (err) {
      setAviso(avisoDeError(err));
    } finally {
      setAsignando(false);
    }
  };

  const reservaLista = p.op.reserva?.configurada;

  return (
    <div className="panel-contenido">
      <h2>Asignar un dron</h2>

      {!reservaLista && (
        <div className="aviso error">
          <p>Configure la reserva operativa en Ajustes antes de asignar: el filtro de elegibilidad la necesita.</p>
        </div>
      )}

      <Campo etiqueta="Misión pendiente">
        <select value={pendiente ? misionId : ''} onChange={(e) => p.seleccionarMision(e.target.value || null)}>
          <option value="">{misionId && !pendiente ? 'Elija otra misión' : 'Elija una misión'}</option>
          {p.op.pendientes.map((m) => (
            <option key={m.id} value={m.id}>
              {NOMBRE_PRIORIDAD[m.prioridad]}, {NOMBRE_TIPO[m.tipo].toLowerCase()}, {m.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </Campo>

      <fieldset className="estrategias">
        <legend>Estrategia</legend>
        {estrategias.map((e) => (
          <label key={e.nombre} className={`opcion ${estrategia === e.nombre ? 'sel' : ''}`}>
            <input
              type="radio"
              name="estrategia"
              value={e.nombre}
              checked={estrategia === e.nombre}
              onChange={() => setEstrategia(e.nombre)}
            />
            <span>
              <strong>{e.nombre === 'MENOR_DISTANCIA' ? 'Menor distancia' : 'Mayor batería'}</strong>
              {e.predeterminada && <span className="marca">predeterminada</span>}
              <span className="descripcion">{e.descripcion}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <button className="boton grande" onClick={asignar} disabled={!pendiente || asignando || !reservaLista}>
        {asignando ? 'Buscando el mejor dron…' : 'Asignar dron'}
      </button>
      <MostrarAviso aviso={aviso} />

      {resultado && !resultado.asignado && (
        <section className="resultado sin-candidato" aria-live="polite">
          <h3>Ningún dron puede atender esta misión</h3>
          <p>La misión sigue pendiente. Estos son los motivos:</p>
          <ul>
            {resultado.motivos.map((m) => (
              <li key={m.codigo}>{m.descripcion}</li>
            ))}
          </ul>
        </section>
      )}

      {detalle?.asignacion && (
        <section className={`resultado ${detalle.asignacion.activa ? 'asignado' : ''}`} aria-live="polite">
          <h3>
            {detalle.asignacion.activa
              ? `Asignada al dron ${detalle.asignacion.dronId}`
              : `Atendida por el dron ${detalle.asignacion.dronId}`}
          </h3>
          <p>{detalle.asignacion.justificacion}</p>
          <dl>
            <div>
              <dt>Estrategia</dt>
              <dd>{detalle.asignacion.estrategia === 'MAYOR_BATERIA' ? 'Mayor batería' : 'Menor distancia'}</dd>
            </div>
            <div>
              <dt>Distancia al destino</dt>
              <dd>{detalle.asignacion.distanciaAlDestinoKm.toFixed(2)} km</dd>
            </div>
            <div>
              <dt>Batería al asignar</dt>
              <dd>{detalle.asignacion.bateriaAlAsignar.toFixed(0)} %</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{fecha(detalle.asignacion.fecha)}</dd>
            </div>
          </dl>
          <p className="nota">{detalle.mensaje}.</p>
        </section>
      )}

      {!misionId && (
        <p className="vacio">Elija una misión aquí, en la bandeja de Misiones o tocando su anillo en el mapa.</p>
      )}
    </div>
  );
}
