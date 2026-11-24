import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/cliente';
import {
  ESTADOS_DRON,
  NOMBRE_ESTADO_DRON,
  NOMBRE_TIPO,
  TIPOS,
  UNIDAD_POR_TIPO,
  type Dron,
  type EstadoDron,
  type TipoMision,
} from '../api/tipos';
import { avisoDeError, BarraBateria, Campo, MostrarAviso, SelectorUbicacion, type Aviso } from '../componentes/Formulario';
import type { PropsPanel } from './contexto';

/** Flota: registrar (HU-01), consultar y filtrar (HU-02), actualizar datos y estado (HU-03). */
export function PanelFlota(p: PropsPanel) {
  const [tipo, setTipo] = useState<TipoMision | ''>('');
  const [estado, setEstado] = useState<EstadoDron | ''>('');
  const [lista, setLista] = useState<Dron[]>([]);
  const [registrando, setRegistrando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  // El filtro se resuelve en el backend (GET /api/drones?tipo=&estado=).
  useEffect(() => {
    let vigente = true;
    api
      .drones(tipo, estado)
      .then((d) => vigente && setLista(d))
      .catch(() => vigente && setLista([]));
    return () => {
      vigente = false;
    };
  }, [tipo, estado, p.op.drones]);

  const seleccionado = p.op.drones.find((d) => d.id === p.dronSeleccionado) ?? null;

  return (
    <div className="panel-contenido">
      <div className="encabezado-panel">
        <h2>Flota</h2>
        <button className="boton" onClick={() => setRegistrando((r) => !r)} aria-expanded={registrando}>
          {registrando ? 'Cerrar registro' : 'Registrar dron'}
        </button>
      </div>

      {registrando && (
        <RegistroDron
          {...p}
          alRegistrar={(d) => {
            setRegistrando(false);
            setAviso({ tipo: 'ok', texto: `Dron ${d.id} registrado.` });
            p.seleccionarDron(d.id);
          }}
        />
      )}
      <MostrarAviso aviso={aviso} />

      <div className="filtros" role="group" aria-label="Filtrar flota">
        <Campo etiqueta="Tipo">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMision | '')}>
            <option value="">Todos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {NOMBRE_TIPO[t]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Estado">
          <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoDron | '')}>
            <option value="">Todos</option>
            {ESTADOS_DRON.map((s) => (
              <option key={s} value={s}>
                {NOMBRE_ESTADO_DRON[s]}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      {lista.length === 0 ? (
        <p className="vacio">
          {p.op.conectado === false
            ? 'La flota se mostrará cuando el backend responda.'
            : p.op.drones.length === 0
              ? 'Aún no hay drones. Registre el primero para verlo en el mapa.'
              : 'Ningún dron coincide con el filtro.'}
        </p>
      ) : (
        <ul className="lista">
          {lista.map((d) => (
            <li key={d.id}>
              <button
                className={`fila ${p.dronSeleccionado === d.id ? 'sel' : ''}`}
                onClick={() => p.seleccionarDron(p.dronSeleccionado === d.id ? null : d.id)}
                aria-pressed={p.dronSeleccionado === d.id}
              >
                <span className="fila-titulo">
                  <strong>{d.id}</strong>
                  <span className="tipo">{NOMBRE_TIPO[d.tipo]}</span>
                </span>
                <span className={`estado e-${d.estado}`}>{NOMBRE_ESTADO_DRON[d.estado]}</span>
                <BarraBateria valor={d.bateria} />
                <span className="dato">
                  {d.autonomiaKm} km de autonomía, {d.capacidad} {d.unidadCapacidad}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {seleccionado && <EditarDron key={seleccionado.id} dron={seleccionado} {...p} />}
    </div>
  );
}

function RegistroDron(p: PropsPanel & { alRegistrar: (d: Dron) => void }) {
  const [id, setId] = useState('');
  const [tipo, setTipo] = useState<TipoMision>('ENTREGA');
  const [bateria, setBateria] = useState('100');
  const [autonomia, setAutonomia] = useState('30');
  const [capacidad, setCapacidad] = useState('5');
  const [estado, setEstado] = useState<'DISPONIBLE' | 'MANTENIMIENTO'>('DISPONIBLE');
  const [lat, setLat] = useState('4.65');
  const [lon, setLon] = useState('-74.08');
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const d = await api.registrarDron({
        id: id.trim(),
        tipo,
        bateria: Number(bateria),
        autonomiaKm: Number(autonomia),
        capacidad: Number(capacidad),
        estado,
        ubicacion: { latitud: Number(lat), longitud: Number(lon) },
      });
      void p.op.refrescar();
      p.alRegistrar(d);
    } catch (err) {
      setAviso(avisoDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="formulario" onSubmit={enviar}>
      <div className="rejilla">
        <Campo etiqueta="Identificador">
          <input required value={id} onChange={(e) => setId(e.target.value)} placeholder="E-1" />
        </Campo>
        <Campo etiqueta="Tipo">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMision)}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {NOMBRE_TIPO[t]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Batería (%)">
          <input type="number" min={0} max={100} step="any" required value={bateria} onChange={(e) => setBateria(e.target.value)} />
        </Campo>
        <Campo etiqueta="Autonomía (km)">
          <input type="number" min={0} step="any" required value={autonomia} onChange={(e) => setAutonomia(e.target.value)} />
        </Campo>
        <Campo etiqueta={`Capacidad (${UNIDAD_POR_TIPO[tipo]})`}>
          <input type="number" min={0} step="any" required value={capacidad} onChange={(e) => setCapacidad(e.target.value)} />
        </Campo>
        <Campo etiqueta="Estado inicial">
          <select value={estado} onChange={(e) => setEstado(e.target.value as 'DISPONIBLE' | 'MANTENIMIENTO')}>
            <option value="DISPONIBLE">Disponible</option>
            <option value="MANTENIMIENTO">Mantenimiento</option>
          </select>
        </Campo>
      </div>
      <SelectorUbicacion
        latitud={lat}
        longitud={lon}
        onCambiar={(a, b) => {
          setLat(a);
          setLon(b);
        }}
        eligiendo={p.claveEligiendo === 'registro-dron'}
        onElegirEnMapa={() =>
          p.pedirPunto('registro-dron', (a, b) => {
            setLat(String(a));
            setLon(String(b));
          })
        }
      />
      <MostrarAviso aviso={aviso} />
      <button className="boton" disabled={enviando}>
        {enviando ? 'Registrando…' : 'Registrar dron'}
      </button>
    </form>
  );
}

function EditarDron(p: PropsPanel & { dron: Dron }) {
  const { dron } = p;
  const [bateria, setBateria] = useState(String(dron.bateria));
  const [autonomia, setAutonomia] = useState(String(dron.autonomiaKm));
  const [lat, setLat] = useState(String(dron.ubicacion.latitud));
  const [lon, setLon] = useState(String(dron.ubicacion.longitud));
  const [aviso, setAviso] = useState<Aviso>(null);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.actualizarDatos(dron.id, Number(bateria), Number(autonomia), {
        latitud: Number(lat),
        longitud: Number(lon),
      });
      void p.op.refrescar();
      setAviso({ tipo: 'ok', texto: 'Datos operativos actualizados.' });
    } catch (err) {
      setAviso(avisoDeError(err));
    }
  };

  const cambiar = async (nuevo: 'DISPONIBLE' | 'MANTENIMIENTO') => {
    try {
      await api.cambiarEstado(dron.id, nuevo);
      void p.op.refrescar();
      setAviso({
        tipo: 'ok',
        texto: nuevo === 'MANTENIMIENTO' ? `${dron.id} enviado a mantenimiento.` : `${dron.id} vuelve a estar disponible.`,
      });
    } catch (err) {
      setAviso(avisoDeError(err));
    }
  };

  return (
    <section className="detalle" aria-label={`Dron ${dron.id}`}>
      <div className="encabezado-panel">
        <h3>
          {dron.id}, {NOMBRE_TIPO[dron.tipo].toLowerCase()}
        </h3>
        {dron.estado === 'MANTENIMIENTO' ? (
          <button className="boton secundario" onClick={() => cambiar('DISPONIBLE')}>
            Marcar disponible
          </button>
        ) : (
          <button
            className="boton secundario"
            onClick={() => cambiar('MANTENIMIENTO')}
            disabled={dron.estado !== 'DISPONIBLE'}
            title={dron.estado !== 'DISPONIBLE' ? 'Un dron con misión activa no puede ir a mantenimiento' : undefined}
          >
            Enviar a mantenimiento
          </button>
        )}
      </div>
      <p className="nota">
        El anillo en el mapa muestra su alcance: autonomía menos la reserva operativa
        {p.op.reserva?.configurada ? ` de ${p.op.reserva.valor} km` : ''}.
      </p>
      <form className="formulario" onSubmit={guardar}>
        <div className="rejilla">
          <Campo etiqueta="Batería (%)">
            <input type="number" min={0} max={100} step="any" required value={bateria} onChange={(e) => setBateria(e.target.value)} />
          </Campo>
          <Campo etiqueta="Autonomía (km)">
            <input type="number" min={0} step="any" required value={autonomia} onChange={(e) => setAutonomia(e.target.value)} />
          </Campo>
        </div>
        <SelectorUbicacion
          latitud={lat}
          longitud={lon}
          onCambiar={(a, b) => {
            setLat(a);
            setLon(b);
          }}
          eligiendo={p.claveEligiendo === `editar-${dron.id}`}
          onElegirEnMapa={() =>
            p.pedirPunto(`editar-${dron.id}`, (a, b) => {
              setLat(String(a));
              setLon(String(b));
            })
          }
        />
        <MostrarAviso aviso={aviso} />
        <button className="boton">Guardar datos operativos</button>
      </form>
    </section>
  );
}
