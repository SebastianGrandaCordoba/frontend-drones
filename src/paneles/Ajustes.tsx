import { useState, type FormEvent } from 'react';
import { api, URL_API } from '../api/cliente';
import { avisoDeError, Campo, MostrarAviso, type Aviso } from '../componentes/Formulario';
import type { PropsPanel } from './contexto';

/** Reserva operativa de autonomía (HU-13). */
export function PanelAjustes(p: PropsPanel) {
  const actual = p.op.reserva;
  const [valor, setValor] = useState(actual?.valor != null ? String(actual.valor) : '5');
  const [aviso, setAviso] = useState<Aviso>(null);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const r = await api.configurarReserva(Number(valor));
      void p.op.refrescar();
      setAviso({ tipo: 'ok', texto: `Reserva operativa guardada: ${r.valor} km.` });
    } catch (err) {
      setAviso(avisoDeError(err));
    }
  };

  return (
    <div className="panel-contenido">
      <h2>Reserva operativa</h2>
      <p className="nota">
        Es la autonomía mínima que debe sobrarle a un dron después de recorrer la distancia de la misión. Un dron solo es
        elegible si su autonomía cubre la distancia más esta reserva.
      </p>
      <p className="cifra">
        {actual?.configurada ? (
          <>
            Vigente: <strong>{actual.valor} km</strong>
          </>
        ) : (
          'Todavía no está configurada.'
        )}
      </p>
      <form className="formulario en-linea" onSubmit={guardar}>
        <Campo etiqueta="Nueva reserva (km)">
          <input type="number" min={0} step="any" required value={valor} onChange={(e) => setValor(e.target.value)} />
        </Campo>
        <button className="boton">Guardar reserva</button>
      </form>
      <MostrarAviso aviso={aviso} />

      <h3>Conexión</h3>
      <p className="nota">
        API: <code>{URL_API}</code>
      </p>
    </div>
  );
}
