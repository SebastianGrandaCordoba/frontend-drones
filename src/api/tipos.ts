// Contrato de la API REST del backend (Centro de Control de Drones).

export type TipoMision = 'ENTREGA' | 'FOTOGRAFIA' | 'VIGILANCIA' | 'AGRICULTURA' | 'CARTOGRAFIA';
export type EstadoDron = 'DISPONIBLE' | 'ASIGNADO' | 'EN_MISION' | 'MANTENIMIENTO';
export type EstadoMision = 'PENDIENTE' | 'ASIGNADA' | 'EN_EJECUCION' | 'COMPLETADA' | 'CANCELADA';
export type Prioridad = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
export type MotivoRechazo = 'NO_DISPONIBLE' | 'TIPO_INCOMPATIBLE' | 'CAPACIDAD_INSUFICIENTE' | 'AUTONOMIA_INSUFICIENTE';

export interface Ubicacion {
  latitud: number;
  longitud: number;
}

export interface Dron {
  id: string;
  tipo: TipoMision;
  estado: EstadoDron;
  bateria: number;
  capacidad: number;
  unidadCapacidad: string;
  autonomiaKm: number;
  ubicacion: Ubicacion;
}

export interface Mision {
  id: string;
  tipo: TipoMision;
  prioridad: Prioridad;
  distanciaKm: number;
  limiteTiempo: string;
  destino: Ubicacion;
  capacidadRequerida: number;
  estado: EstadoMision;
}

export interface Asignacion {
  id: string;
  misionId: string;
  estadoMision: EstadoMision;
  dronId: string;
  estrategia: string;
  fecha: string;
  distanciaAlDestinoKm: number;
  bateriaAlAsignar: number;
  activa: boolean;
  justificacion: string;
}

export interface ResultadoAsignacion {
  asignado: boolean;
  mensaje: string;
  asignacion: Asignacion | null;
  motivos: { codigo: MotivoRechazo; descripcion: string }[];
}

export interface DetalleMision {
  misionId: string;
  estadoMision: EstadoMision | null;
  asignada: boolean;
  mensaje: string;
  asignacion: Asignacion | null;
}

export interface Estrategia {
  nombre: string;
  predeterminada: boolean;
  descripcion: string;
}

export interface Reserva {
  configurada: boolean;
  valor: number | null;
  unidad: string;
}

export interface RegistroDron {
  id: string;
  tipo: TipoMision;
  bateria: number;
  autonomiaKm: number;
  capacidad: number;
  estado: 'DISPONIBLE' | 'MANTENIMIENTO';
  ubicacion: Ubicacion;
}

export interface RegistroMision {
  tipo: TipoMision;
  prioridad: Prioridad;
  distanciaKm: number;
  limiteTiempo: string;
  destino: Ubicacion;
  capacidadRequerida: number;
}

export const TIPOS: TipoMision[] = ['ENTREGA', 'FOTOGRAFIA', 'VIGILANCIA', 'AGRICULTURA', 'CARTOGRAFIA'];
export const PRIORIDADES: Prioridad[] = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'];
export const ESTADOS_DRON: EstadoDron[] = ['DISPONIBLE', 'ASIGNADO', 'EN_MISION', 'MANTENIMIENTO'];

/** Unidad de la capacidad según el tipo (la define cada subclase de Dron en el backend). */
export const UNIDAD_POR_TIPO: Record<TipoMision, string> = {
  ENTREGA: 'kg',
  FOTOGRAFIA: 'GB',
  VIGILANCIA: 'h',
  AGRICULTURA: 'L',
  CARTOGRAFIA: 'ha',
};

export const NOMBRE_TIPO: Record<TipoMision, string> = {
  ENTREGA: 'Entrega',
  FOTOGRAFIA: 'Fotografía',
  VIGILANCIA: 'Vigilancia',
  AGRICULTURA: 'Agricultura',
  CARTOGRAFIA: 'Cartografía',
};

export const NOMBRE_ESTADO_DRON: Record<EstadoDron, string> = {
  DISPONIBLE: 'Disponible',
  ASIGNADO: 'Asignado',
  EN_MISION: 'En misión',
  MANTENIMIENTO: 'Mantenimiento',
};

export const NOMBRE_ESTADO_MISION: Record<EstadoMision, string> = {
  PENDIENTE: 'Pendiente',
  ASIGNADA: 'Asignada',
  EN_EJECUCION: 'En ejecución',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
};

export const NOMBRE_PRIORIDAD: Record<Prioridad, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
};
