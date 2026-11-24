import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ErrorApi } from './cliente';
import type { Asignacion, Dron, Mision, Reserva } from './tipos';

export interface Operacion {
  drones: Dron[];
  pendientes: Mision[];
  /** Misiones con una asignación activa (ASIGNADA o EN_EJECUCION). */
  enCurso: Mision[];
  historial: Asignacion[];
  reserva: Reserva | null;
  /** null mientras se hace el primer intento de conexión. */
  conectado: boolean | null;
  /** Segundos que lleva sin respuesta del backend (para avisar del arranque en frío de Render). */
  segundosSinRespuesta: number;
  error: string | null;
  cargando: boolean;
  refrescar: () => Promise<void>;
}

const INTERVALO_NORMAL = 15000;
const INTERVALO_SIN_CONEXION = 5000;

/** Estado operativo completo que comparten la escena 3D y los paneles. */
export function useOperacion(): Operacion {
  const [drones, setDrones] = useState<Dron[]>([]);
  const [pendientes, setPendientes] = useState<Mision[]>([]);
  const [enCurso, setEnCurso] = useState<Mision[]>([]);
  const [historial, setHistorial] = useState<Asignacion[]>([]);
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [segundosSinRespuesta, setSegundos] = useState(0);
  const desde = useRef<number | null>(Date.now());

  const refrescar = useCallback(async () => {
    try {
      const [d, p, h, r] = await Promise.all([api.drones(), api.pendientes(), api.historial(), api.reserva()]);
      const activas = h.filter((a) => a.activa);
      const misiones = await Promise.all(activas.map((a) => api.mision(a.misionId)));
      setDrones(d);
      setPendientes(p);
      setHistorial(h);
      setReserva(r);
      setEnCurso(misiones);
      setConectado(true);
      setError(null);
      desde.current = null;
      setSegundos(0);
    } catch (e) {
      setConectado(false);
      if (desde.current === null) desde.current = Date.now();
      setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar la información.');
    } finally {
      setCargando(false);
    }
  }, []);

  // Sondeo: cada 15 s en línea; cada 5 s mientras no hay conexión (Render tarda en despertar).
  useEffect(() => {
    void refrescar();
    const intervalo = window.setInterval(
      () => void refrescar(),
      conectado === false ? INTERVALO_SIN_CONEXION : INTERVALO_NORMAL,
    );
    return () => window.clearInterval(intervalo);
  }, [refrescar, conectado]);

  useEffect(() => {
    if (conectado) return;
    const reloj = window.setInterval(() => {
      if (desde.current !== null) setSegundos(Math.round((Date.now() - desde.current) / 1000));
    }, 1000);
    return () => window.clearInterval(reloj);
  }, [conectado]);

  return { drones, pendientes, enCurso, historial, reserva, conectado, segundosSinRespuesta, error, cargando, refrescar };
}
