import { useCallback, useEffect, useState } from 'react';
import { api, ErrorApi } from './cliente';
import type { Asignacion, Dron, Mision, Reserva } from './tipos';

export interface Operacion {
  drones: Dron[];
  pendientes: Mision[];
  /** Misiones con una asignación activa (ASIGNADA o EN_EJECUCION). */
  enCurso: Mision[];
  historial: Asignacion[];
  reserva: Reserva | null;
  conectado: boolean | null;
  error: string | null;
  cargando: boolean;
  refrescar: () => Promise<void>;
}

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
    } catch (e) {
      setConectado(false);
      setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar la información.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void refrescar();
    const intervalo = window.setInterval(() => void refrescar(), 15000);
    return () => window.clearInterval(intervalo);
  }, [refrescar]);

  return { drones, pendientes, enCurso, historial, reserva, conectado, error, cargando, refrescar };
}
