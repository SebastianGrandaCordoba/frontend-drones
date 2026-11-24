import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Grid, Html, Line, OrbitControls, QuadraticBezierLine } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import { Color, Float32BufferAttribute, PlaneGeometry, type Group } from 'three';
import type { Asignacion, Dron, EstadoDron, Mision } from '../api/tipos';
import { NOMBRE_PRIORIDAD } from '../api/tipos';
import { crearProyeccion, LADO_MAPA, type Proyeccion } from './proyeccion';

export const COLOR = {
  papel: '#DCE6EA',
  tierra: '#CFDCE2',
  tinta: '#1B2B34',
  azul: '#2F5D8A',
  magenta: '#A7356F',
  ocre: '#B8913F',
  bosque: '#4E7D5B',
  gris: '#7A8A93',
} as const;

const COLOR_ESTADO: Record<EstadoDron, string> = {
  DISPONIBLE: COLOR.bosque,
  ASIGNADO: COLOR.magenta,
  EN_MISION: COLOR.azul,
  MANTENIMIENTO: COLOR.gris,
};

const ALTURA_VUELO = 1.6;

const reducirMovimiento =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Props {
  drones: Dron[];
  pendientes: Mision[];
  enCurso: Mision[];
  asignacionesActivas: Asignacion[];
  reservaKm: number | null;
  dronSeleccionado: string | null;
  misionSeleccionada: string | null;
  eligiendoPunto: boolean;
  onSeleccionarDron: (id: string) => void;
  onSeleccionarMision: (id: string) => void;
  onElegirPunto: (latitud: number, longitud: number) => void;
}

export function Espacio3D(props: Props) {
  const puntos = useMemo(
    () => [
      ...props.drones.map((d) => d.ubicacion),
      ...props.pendientes.map((m) => m.destino),
      ...props.enCurso.map((m) => m.destino),
    ],
    [props.drones, props.pendientes, props.enCurso],
  );
  const proyeccion = useMemo(() => crearProyeccion(puntos), [puntos]);

  return (
    <Canvas
      camera={{ position: [0, 21, 23], fov: 40 }}
      dpr={[1, 2]}
      className={props.eligiendoPunto ? 'lienzo eligiendo' : 'lienzo'}
      aria-label="Vista 3D del espacio aéreo con drones y destinos de misión"
    >
      <color attach="background" args={[COLOR.papel]} />
      <fog attach="fog" args={[COLOR.papel, 35, 75]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[8, 14, 6]} intensity={1.3} />

      <Terreno proyeccion={proyeccion} eligiendo={props.eligiendoPunto} onElegirPunto={props.onElegirPunto} />

      {props.pendientes.map((m) => (
        <Destino
          key={m.id}
          mision={m}
          proyeccion={proyeccion}
          activo={false}
          seleccionado={props.misionSeleccionada === m.id}
          onSeleccionar={props.onSeleccionarMision}
        />
      ))}
      {props.enCurso.map((m) => (
        <Destino
          key={m.id}
          mision={m}
          proyeccion={proyeccion}
          activo
          seleccionado={props.misionSeleccionada === m.id}
          onSeleccionar={props.onSeleccionarMision}
        />
      ))}

      {props.asignacionesActivas.map((a) => {
        const dron = props.drones.find((d) => d.id === a.dronId);
        const mision = props.enCurso.find((m) => m.id === a.misionId);
        if (!dron || !mision) return null;
        return (
          <Ruta
            key={a.id}
            desde={proyeccion.aEscena(dron.ubicacion)}
            hasta={proyeccion.aEscena(mision.destino)}
            enEjecucion={mision.estado === 'EN_EJECUCION'}
          />
        );
      })}

      {props.drones.map((d) => (
        <DronMarcador
          key={d.id}
          dron={d}
          proyeccion={proyeccion}
          seleccionado={props.dronSeleccionado === d.id}
          reservaKm={props.reservaKm}
          onSeleccionar={props.onSeleccionarDron}
        />
      ))}

      <OrbitControls
        makeDefault
        enablePan
        maxPolarAngle={Math.PI / 2.25}
        minDistance={8}
        maxDistance={60}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}

/** Longitud aproximada del pie de los Cerros Orientales de Bogotá. */
const LONGITUD_CERROS = -74.028;

function Terreno({
  proyeccion,
  eligiendo,
  onElegirPunto,
}: {
  proyeccion: Proyeccion;
  eligiendo: boolean;
  onElegirPunto: (lat: number, lon: number) => void;
}) {
  const celda = proyeccion.kmAEscena(1);
  const lado = LADO_MAPA * 2.6;
  const [xCerros] = proyeccion.aEscena({ latitud: proyeccion.centro.latitud, longitud: LONGITUD_CERROS });

  // Relieve de referencia: la sabana es plana y al oriente se levantan los cerros.
  const geometria = useMemo(() => {
    const g = new PlaneGeometry(lado, lado, 200, 200);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colores: number[] = [];
    const bajo = new Color('#CFDCE2');
    const medio = new Color('#C3D0B8');
    const alto = new Color('#B9A273');
    const anchoLadera = proyeccion.kmAEscena(3.5);
    const alturaMax = 1.5;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const d = x - xCerros;
      let h = 0;
      if (d > 0) {
        const t = Math.min(1, d / anchoLadera);
        const suave = t * t * (3 - 2 * t);
        const ondulacion = 0.72 + 0.16 * Math.sin(z * 0.45) + 0.08 * Math.sin(z * 1.3 + x * 0.7) + 0.04 * Math.sin(x * 2.1);
        h = alturaMax * suave * ondulacion;
      }
      pos.setY(i, h - 0.02);
      const k = Math.min(1, h / alturaMax);
      const c = k < 0.5 ? bajo.clone().lerp(medio, k * 2) : medio.clone().lerp(alto, (k - 0.5) * 2);
      colores.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new Float32BufferAttribute(colores, 3));
    g.computeVertexNormals();
    return g;
  }, [lado, xCerros, proyeccion]);

  const alHacerClic = (e: ThreeEvent<MouseEvent>) => {
    if (!eligiendo) return;
    e.stopPropagation();
    const u = proyeccion.aUbicacion(e.point.x, e.point.z);
    onElegirPunto(u.latitud, u.longitud);
  };
  return (
    <group>
      <mesh geometry={geometria} onClick={alHacerClic}>
        <meshStandardMaterial vertexColors flatShading roughness={1} />
      </mesh>
      <Grid
        position={[0, 0.001, 0]}
        args={[lado, lado]}
        cellSize={celda}
        cellThickness={0.7}
        cellColor="#9DB0BA"
        sectionSize={celda * 5}
        sectionThickness={1.2}
        sectionColor="#6F8794"
        fadeDistance={70}
        fadeStrength={1}
        infiniteGrid={false}
      />
      {xCerros < LADO_MAPA * 0.7 && (
        <Html position={[xCerros + proyeccion.kmAEscena(2.5), 1.4, -LADO_MAPA * 0.3]} center className="etiqueta relieve">
          Cerros Orientales
        </Html>
      )}
      <RosaDeLosVientos posicion={[-LADO_MAPA * 0.62, 0.02, -LADO_MAPA * 0.62]} />
    </group>
  );
}

function RosaDeLosVientos({ posicion }: { posicion: [number, number, number] }) {
  return (
    <group position={posicion}>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.9, 1, 48]} />
        <meshBasicMaterial color={COLOR.tinta} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, -0.35]}>
        <circleGeometry args={[0.45, 3]} />
        <meshBasicMaterial color={COLOR.magenta} />
      </mesh>
      <Html position={[0, 0, -1.45]} center className="etiqueta-norte">
        N
      </Html>
    </group>
  );
}

function Destino({
  mision,
  proyeccion,
  activo,
  seleccionado,
  onSeleccionar,
}: {
  mision: Mision;
  proyeccion: Proyeccion;
  activo: boolean;
  seleccionado: boolean;
  onSeleccionar: (id: string) => void;
}) {
  const [x, z] = proyeccion.aEscena(mision.destino);
  const color = activo ? COLOR.magenta : COLOR.ocre;
  const radio = mision.prioridad === 'CRITICA' ? 0.75 : mision.prioridad === 'ALTA' ? 0.62 : 0.5;
  return (
    <group
      position={[x, 0.02, z]}
      onClick={(e) => {
        e.stopPropagation();
        onSeleccionar(mision.id);
      }}
    >
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[radio * 0.82, radio, 64]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[radio * 1.35, radio * 1.42, 64]} />
        <meshBasicMaterial color={color} transparent opacity={seleccionado ? 0.9 : 0.35} />
      </mesh>
      <mesh position-y={0.35}>
        <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html position={[0, 0.95, 0]} center className={`etiqueta destino ${activo ? 'activo' : ''} ${seleccionado ? 'sel' : ''}`}>
        <b>{NOMBRE_PRIORIDAD[mision.prioridad]}</b> {mision.id.slice(0, 4)}
      </Html>
    </group>
  );
}

function Ruta({
  desde,
  hasta,
  enEjecucion,
}: {
  desde: [number, number];
  hasta: [number, number];
  enEjecucion: boolean;
}) {
  const medio: [number, number, number] = [(desde[0] + hasta[0]) / 2, ALTURA_VUELO + 2.2, (desde[1] + hasta[1]) / 2];
  return (
    <QuadraticBezierLine
      start={[desde[0], ALTURA_VUELO, desde[1]]}
      end={[hasta[0], 0.05, hasta[1]]}
      mid={medio}
      color={COLOR.magenta}
      lineWidth={enEjecucion ? 3 : 2}
      dashed={!enEjecucion}
      dashSize={0.3}
      gapSize={0.18}
    />
  );
}

function DronMarcador({
  dron,
  proyeccion,
  seleccionado,
  reservaKm,
  onSeleccionar,
}: {
  dron: Dron;
  proyeccion: Proyeccion;
  seleccionado: boolean;
  reservaKm: number | null;
  onSeleccionar: (id: string) => void;
}) {
  const [x, z] = proyeccion.aEscena(dron.ubicacion);
  const cuerpo = useRef<Group>(null);
  const rotores = useRef<Group>(null);
  const color = COLOR_ESTADO[dron.estado];
  const vuela = dron.estado !== 'MANTENIMIENTO';
  const altura = vuela ? ALTURA_VUELO : 0.25;
  const fase = useMemo(() => (dron.id.charCodeAt(0) + dron.id.length) % 7, [dron.id]);

  useFrame(({ clock }) => {
    if (reducirMovimiento) return;
    const t = clock.getElapsedTime();
    if (cuerpo.current && vuela) cuerpo.current.position.y = altura + Math.sin(t * 1.4 + fase) * 0.06;
    if (rotores.current && vuela) rotores.current.rotation.y = t * (dron.estado === 'EN_MISION' ? 9 : 4);
  });

  const alcance = Math.max(0, dron.autonomiaKm - (reservaKm ?? 0));
  const escala = seleccionado ? 1.35 : 1;

  return (
    <group position={[x, 0, z]}>
      {/* Mástil de posición hasta el suelo, como en una carta de navegación */}
      <Line
        points={[
          [0, 0, 0],
          [0, altura, 0],
        ]}
        color={color}
        lineWidth={1}
        dashed
        dashSize={0.08}
        gapSize={0.06}
      />
      <mesh rotation-x={-Math.PI / 2} position-y={0.015}>
        <circleGeometry args={[0.16, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {seleccionado && alcance > 0 && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.012}>
          <ringGeometry args={[proyeccion.kmAEscena(alcance) - 0.05, proyeccion.kmAEscena(alcance), 128]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} />
        </mesh>
      )}

      <group
        ref={cuerpo}
        position-y={altura}
        scale={escala}
        onClick={(e) => {
          e.stopPropagation();
          onSeleccionar(dron.id);
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <mesh>
          <boxGeometry args={[0.34, 0.1, 0.34]} />
          <meshStandardMaterial color={COLOR.tinta} roughness={0.6} />
        </mesh>
        <group ref={rotores}>
          {[
            [0.32, 0.32],
            [-0.32, 0.32],
            [0.32, -0.32],
            [-0.32, -0.32],
          ].map(([rx, rz]) => (
            <group key={`${rx}${rz}`} position={[rx, 0.06, rz]}>
              <mesh rotation-x={-Math.PI / 2}>
                <ringGeometry args={[0.13, 0.17, 24]} />
                <meshBasicMaterial color={color} />
              </mesh>
            </group>
          ))}
        </group>
        {[45, 135].map((g) => (
          <mesh key={g} rotation-y={(g * Math.PI) / 180}>
            <boxGeometry args={[0.92, 0.03, 0.04]} />
            <meshStandardMaterial color={COLOR.tinta} />
          </mesh>
        ))}
      </group>

      <Html position={[0, altura + 0.6, 0]} center className={`etiqueta dron ${seleccionado ? 'sel' : ''}`}>
        <span className="punto" style={{ background: color }} />
        {dron.id}
      </Html>
    </group>
  );
}
