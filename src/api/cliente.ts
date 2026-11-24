// Adaptador HTTP hacia la API del backend. Toda la comunicación con el servidor pasa por aquí.
import type {
  Asignacion,
  DetalleMision,
  Dron,
  EstadoDron,
  Estrategia,
  Mision,
  RegistroDron,
  RegistroMision,
  Reserva,
  ResultadoAsignacion,
  TipoMision,
  Ubicacion,
} from './tipos';

export const URL_API = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

/** Error de la API con el mensaje y los detalles que envía el backend (400/404/409). */
export class ErrorApi extends Error {
  constructor(
    public readonly estado: number,
    mensaje: string,
    public readonly detalles: string[] = [],
  ) {
    super(mensaje);
  }
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(URL_API + ruta, {
      ...opciones,
      headers: { 'Content-Type': 'application/json', ...(opciones.headers ?? {}) },
    });
  } catch {
    throw new ErrorApi(0, 'No hay conexión con el backend. Verifique que esté en ejecución.');
  }
  const texto = await respuesta.text();
  const cuerpo = texto ? JSON.parse(texto) : null;
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, cuerpo?.mensaje ?? `Error ${respuesta.status}`, cuerpo?.detalles ?? []);
  }
  return cuerpo as T;
}

const json = (cuerpo: unknown) => JSON.stringify(cuerpo);

export const api = {
  // Flota (HU-01 a HU-03)
  drones: (tipo?: TipoMision | '', estado?: EstadoDron | '') => {
    const q = new URLSearchParams();
    if (tipo) q.set('tipo', tipo);
    if (estado) q.set('estado', estado);
    const s = q.toString();
    return pedir<Dron[]>(`/drones${s ? `?${s}` : ''}`);
  },
  registrarDron: (d: RegistroDron) => pedir<Dron>('/drones', { method: 'POST', body: json(d) }),
  actualizarDatos: (id: string, bateria: number, autonomiaKm: number, ubicacion: Ubicacion) =>
    pedir<Dron>(`/drones/${encodeURIComponent(id)}/datos-operativos`, {
      method: 'PUT',
      body: json({ bateria, autonomiaKm, ubicacion }),
    }),
  cambiarEstado: (id: string, estado: 'DISPONIBLE' | 'MANTENIMIENTO') =>
    pedir<Dron>(`/drones/${encodeURIComponent(id)}/estado`, { method: 'PUT', body: json({ estado }) }),

  // Misiones (HU-04, HU-05, HU-11)
  pendientes: () => pedir<Mision[]>('/misiones/pendientes'),
  mision: (id: string) => pedir<Mision>(`/misiones/${encodeURIComponent(id)}`),
  registrarMision: (m: RegistroMision) => pedir<Mision>('/misiones', { method: 'POST', body: json(m) }),
  iniciar: (id: string) => pedir<Mision>(`/misiones/${encodeURIComponent(id)}/iniciar`, { method: 'POST' }),
  completar: (id: string) => pedir<Mision>(`/misiones/${encodeURIComponent(id)}/completar`, { method: 'POST' }),
  cancelar: (id: string) => pedir<Mision>(`/misiones/${encodeURIComponent(id)}/cancelar`, { method: 'POST' }),

  // Asignación (HU-06 a HU-10, HU-12)
  estrategias: () => pedir<Estrategia[]>('/asignaciones/estrategias'),
  asignar: (misionId: string, estrategia: string) =>
    pedir<ResultadoAsignacion>('/asignaciones', { method: 'POST', body: json({ misionId, estrategia }) }),
  detalle: (misionId: string) => pedir<DetalleMision>(`/asignaciones/mision/${encodeURIComponent(misionId)}`),
  historial: (dronId?: string, misionId?: string) => {
    const q = new URLSearchParams();
    if (dronId) q.set('dronId', dronId);
    if (misionId) q.set('misionId', misionId);
    const s = q.toString();
    return pedir<Asignacion[]>(`/asignaciones${s ? `?${s}` : ''}`);
  },

  // Configuración (HU-13)
  reserva: () => pedir<Reserva>('/configuracion/reserva'),
  configurarReserva: (valor: number) =>
    pedir<Reserva>('/configuracion/reserva', { method: 'PUT', body: json({ valor, unidad: 'km' }) }),
};
