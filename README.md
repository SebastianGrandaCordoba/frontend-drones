# Frontend: Centro de Control de Drones

Consola web del **operador de control** para el backend [Backend-Drones-](https://github.com/SebastianGrandaCordoba/Backend-Drones-). Es el artefacto `frontend-drones` (puerto 5173) de la vista de despliegue.

La mitad izquierda es una **vista 3D del espacio aéreo de Bogotá**: cada dron aparece en su ubicación con su estado, los destinos de misión son anillos sobre el terreno y cada asignación activa se dibuja como una ruta del dron al destino. Al seleccionar un dron se ve su alcance (autonomía menos la reserva operativa). La mitad derecha tiene los paneles de trabajo.

| Panel | Historias | Qué permite |
|---|---|---|
| Flota | HU-01, HU-02, HU-03 | Registrar drones, filtrar por tipo y estado, actualizar batería, autonomía y ubicación, enviar a mantenimiento |
| Misiones | HU-04, HU-05, HU-11 | Registrar misiones, ver la bandeja ordenada por prioridad y límite de tiempo, iniciar, completar o cancelar |
| Asignar | HU-06 a HU-10 | Elegir misión y estrategia, ver el dron elegido con su justificación o los motivos si no hay candidato |
| Historial | HU-12 | Asignaciones filtradas por dron o misión, con el estado actual de cada misión |
| Ajustes | HU-13 | Configurar la reserva operativa en km |

Las ubicaciones se pueden escribir o **elegir haciendo clic en el mapa**.

## Tecnología

React 19 · TypeScript · Vite · Three.js con React Three Fiber y Drei · tipografía Archivo.

```
src/
  api/        adaptador HTTP hacia el backend (tipos, cliente y estado compartido)
  escena/     vista 3D: terreno, drones, destinos, rutas y proyección geográfica
  paneles/    Flota, Misiones, Asignar, Historial y Ajustes
  componentes/ campos de formulario, avisos y selector de ubicación
```

La interfaz solo conoce la API REST; toda la lógica de negocio (elegibilidad, estrategias, estados) vive en el backend.

## Ejecutar en local

Requiere Node 20 o superior y el backend corriendo en `http://localhost:8080`.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. Para apuntar a otra API cree `.env.local` con `VITE_API_URL=https://.../api`.

## Desplegar en Render

1. Despliegue primero el backend (ver su README) y copie su URL, por ejemplo `https://backend-drones.onrender.com`.
2. En Render: **New > Blueprint** y elija este repositorio. El `render.yaml` crea un sitio estático.
3. En la variable `VITE_API_URL` ponga la URL del backend terminada en `/api`.
4. Cuando el sitio quede publicado, ponga su URL en la variable `CORS_ORIGENES` del backend para que el navegador pueda llamarlo.
