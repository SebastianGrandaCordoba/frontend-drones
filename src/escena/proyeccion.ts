import type { Ubicacion } from '../api/tipos';

/** Centro por defecto: Bogotá, la zona de operación de la demo. */
const CENTRO_POR_DEFECTO: Ubicacion = { latitud: 4.65, longitud: -74.08 };
const KM_POR_GRADO_LAT = 110.57;
/** Tamaño de la zona visible en unidades de escena (lado del mapa). */
export const LADO_MAPA = 24;

export interface Proyeccion {
  centro: Ubicacion;
  /** Unidades de escena por kilómetro. */
  escala: number;
  aEscena: (u: Ubicacion) => [number, number];
  aUbicacion: (x: number, z: number) => Ubicacion;
  kmAEscena: (km: number) => number;
}

function kmPorGradoLon(latitud: number) {
  return 111.32 * Math.cos((latitud * Math.PI) / 180);
}

/**
 * Proyección equirectangular local: suficiente a escala de ciudad, igual que la
 * aproximación geométrica que usa el backend para la distancia.
 */
export function crearProyeccion(puntos: Ubicacion[]): Proyeccion {
  const centro =
    puntos.length === 0
      ? CENTRO_POR_DEFECTO
      : {
          latitud: (Math.min(...puntos.map((p) => p.latitud)) + Math.max(...puntos.map((p) => p.latitud))) / 2,
          longitud: (Math.min(...puntos.map((p) => p.longitud)) + Math.max(...puntos.map((p) => p.longitud))) / 2,
        };
  const kmLon = kmPorGradoLon(centro.latitud);
  const extensionKm = Math.max(
    8,
    ...puntos.map((p) =>
      Math.max(
        Math.abs(p.latitud - centro.latitud) * KM_POR_GRADO_LAT,
        Math.abs(p.longitud - centro.longitud) * kmLon,
      ) * 2.4,
    ),
  );
  const escala = LADO_MAPA / extensionKm;
  return {
    centro,
    escala,
    aEscena: (u) => [
      (u.longitud - centro.longitud) * kmLon * escala,
      -(u.latitud - centro.latitud) * KM_POR_GRADO_LAT * escala,
    ],
    aUbicacion: (x, z) => ({
      latitud: +(centro.latitud - z / escala / KM_POR_GRADO_LAT).toFixed(5),
      longitud: +(centro.longitud + x / escala / kmLon).toFixed(5),
    }),
    kmAEscena: (km) => km * escala,
  };
}
