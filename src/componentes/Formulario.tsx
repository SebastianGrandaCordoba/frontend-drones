import type { ReactNode } from 'react';
import { ErrorApi } from '../api/cliente';

export function Campo({
  etiqueta,
  ayuda,
  children,
  ancho,
}: {
  etiqueta: string;
  ayuda?: string;
  children: ReactNode;
  ancho?: 'medio' | 'completo';
}) {
  return (
    <label className={`campo ${ancho ?? ''}`}>
      <span className="campo-etiqueta">{etiqueta}</span>
      {children}
      {ayuda && <span className="campo-ayuda">{ayuda}</span>}
    </label>
  );
}

export type Aviso = { tipo: 'ok' | 'error'; texto: string; detalles?: string[] } | null;

export function MostrarAviso({ aviso }: { aviso: Aviso }) {
  if (!aviso) return null;
  return (
    <div className={`aviso ${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
      <p>{aviso.texto}</p>
      {aviso.detalles && aviso.detalles.length > 0 && (
        <ul>
          {aviso.detalles.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Convierte cualquier error en un aviso legible para el operador. */
export function avisoDeError(e: unknown): Aviso {
  if (e instanceof ErrorApi) return { tipo: 'error', texto: e.message, detalles: e.detalles };
  return { tipo: 'error', texto: 'Ocurrió un error inesperado. Intente de nuevo.' };
}

export function SelectorUbicacion({
  latitud,
  longitud,
  onCambiar,
  onElegirEnMapa,
  eligiendo,
}: {
  latitud: string;
  longitud: string;
  onCambiar: (lat: string, lon: string) => void;
  onElegirEnMapa: () => void;
  eligiendo: boolean;
}) {
  return (
    <fieldset className="ubicacion">
      <legend>Ubicación</legend>
      <Campo etiqueta="Latitud">
        <input inputMode="decimal" required value={latitud} onChange={(e) => onCambiar(e.target.value, longitud)} />
      </Campo>
      <Campo etiqueta="Longitud">
        <input inputMode="decimal" required value={longitud} onChange={(e) => onCambiar(latitud, e.target.value)} />
      </Campo>
      <button type="button" className={`boton secundario ${eligiendo ? 'activo' : ''}`} onClick={onElegirEnMapa}>
        {eligiendo ? 'Haga clic en el mapa…' : 'Elegir en el mapa'}
      </button>
    </fieldset>
  );
}

export function BarraBateria({ valor }: { valor: number }) {
  const nivel = valor < 25 ? 'baja' : valor < 60 ? 'media' : 'alta';
  return (
    <span className={`bateria ${nivel}`} aria-label={`Batería ${valor.toFixed(0)} %`}>
      <span className="bateria-relleno" style={{ width: `${Math.min(100, Math.max(0, valor))}%` }} />
      <span className="bateria-texto">{valor.toFixed(0)} %</span>
    </span>
  );
}
