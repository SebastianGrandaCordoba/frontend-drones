import type { Operacion } from '../api/useOperacion';

/** Lo que cada panel recibe de la consola: datos compartidos y coordinación con la escena 3D. */
export interface PropsPanel {
  op: Operacion;
  dronSeleccionado: string | null;
  misionSeleccionada: string | null;
  seleccionarDron: (id: string | null) => void;
  seleccionarMision: (id: string | null) => void;
  /** Pide al operador un punto del mapa; `clave` identifica qué formulario lo pidió. */
  pedirPunto: (clave: string, alElegir: (lat: number, lon: number) => void) => void;
  claveEligiendo: string | null;
  irAAsignar: (misionId: string) => void;
}
