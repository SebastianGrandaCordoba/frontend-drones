import { useEffect, useState } from 'react';
import { api } from '../api/cliente';
import { NOMBRE_ESTADO_MISION, type Asignacion } from '../api/tipos';
import { Campo } from '../componentes/Formulario';
import type { PropsPanel } from './contexto';
import { fecha } from './Misiones';

/** Historial de asignaciones filtrable por dron y misión (HU-12). */
export function PanelHistorial(p: PropsPanel) {
  const [dronId, setDronId] = useState('');
  const [misionId, setMisionId] = useState('');
  const [lista, setLista] = useState<Asignacion[]>([]);

  useEffect(() => {
    let vigente = true;
    api
      .historial(dronId, misionId.trim())
      .then((h) => vigente && setLista(h))
      .catch(() => vigente && setLista([]));
    return () => {
      vigente = false;
    };
  }, [dronId, misionId, p.op.historial]);

  return (
    <div className="panel-contenido">
      <h2>Historial</h2>
      <div className="filtros">
        <Campo etiqueta="Dron">
          <select value={dronId} onChange={(e) => setDronId(e.target.value)}>
            <option value="">Todos</option>
            {p.op.drones.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Misión (id)">
          <input value={misionId} onChange={(e) => setMisionId(e.target.value)} placeholder="Identificador completo" />
        </Campo>
      </div>

      {lista.length === 0 ? (
        <p className="vacio">Todavía no hay asignaciones que coincidan.</p>
      ) : (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Dron</th>
                <th scope="col">Misión</th>
                <th scope="col">Estado actual</th>
                <th scope="col">Estrategia</th>
                <th scope="col" className="num">Distancia</th>
                <th scope="col" className="num">Batería</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr
                  key={a.id}
                  className={a.activa ? 'activa' : ''}
                  onClick={() => {
                    p.seleccionarDron(a.dronId);
                    p.seleccionarMision(a.misionId);
                  }}
                >
                  <td>{fecha(a.fecha)}</td>
                  <td>
                    <strong>{a.dronId}</strong>
                  </td>
                  <td title={a.misionId}>{a.misionId.slice(0, 8)}</td>
                  <td>{NOMBRE_ESTADO_MISION[a.estadoMision]}</td>
                  <td>{a.estrategia === 'MAYOR_BATERIA' ? 'Mayor batería' : 'Menor distancia'}</td>
                  <td className="num">{a.distanciaAlDestinoKm.toFixed(2)} km</td>
                  <td className="num">{a.bateriaAlAsignar.toFixed(0)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
