# Site Viewer Lite

Aplicacion web para consultar proyectos de escaneo de edificios de forma segura, explorar sus espacios en 3D, cargar una nube de puntos PTS1 y reportar incidencias. El proyecto es un monolito modular con Express, Vue 3, Vite y three.js; no usa base de datos ni servicios de pago.

## Requisitos

- Node.js `>=20.19.0 <25`
- npm incluido con Node.js

La version usada para verificar esta entrega fue Node.js 24.19.0.

## Inicio rapido

Instala las dependencias una vez:

```bash
npm install
```

Despues, un solo comando inicia la API y la interfaz de desarrollo:

```bash
npm run dev
```

- API: `http://localhost:3000`
- Interfaz de desarrollo: `http://localhost:5173`

Vite redirige las solicitudes `/api` a Express durante el desarrollo.

## Produccion local

Compila la interfaz y sirvela desde el mismo origen que la API:

```bash
npm run build
npm start
```

Abre `http://localhost:3000`. Express sirve `frontend/dist` y las rutas `/api` desde ese mismo origen.

## Pruebas

```bash
npm test
```

Las pruebas automaticas cubren autenticacion, aislamiento por cuenta, serializacion segura, validacion, creacion de incidencias, ETag y respuestas Range.

## Nubes de puntos

Los datos permanecen en `data/`, fuera de los archivos estaticos publicos. Los binarios `.pts` se ignoran deliberadamente en Git y se generan localmente:

```bash
node tools/make-cloud.js 1201-30001
node tools/make-cloud.js 1201-30002 400000
node tools/make-cloud.js 1201-30001 2000000 --truncate
```

El primer comando usa el valor predeterminado del kit: 2.000.000 de puntos. La nube local de esta copia se genero con 500.000 puntos para mantener una demostracion fluida con transparencia activada. No se entrega en Git. Para evaluar el escenario de carga exigente del kit, vuelve a generar `1201-30001` sin indicar cantidad.

El cliente descarga la nube como stream, muestra progreso real y entrega cada bloque a un Web Worker. El Worker valida el encabezado PTS1, interpreta los registros sin bloquear la interfaz y devuelve atributos transferibles para `THREE.Points`. Cancelar la carga o cambiar de proyecto aborta la descarga y termina el Worker, por lo que los puntos anteriores no llegan al nuevo proyecto.

## Arquitectura

```text
backend/
  routes/         rutas HTTP
  controllers/    adaptacion HTTP
  services/       autorizacion, ETag y validacion de incidencias
  repositories/   lectura exclusiva de JSON privados
  middleware/     Bearer y manejo uniforme de errores
  serializers/    listas explicitas de campos permitidos

frontend/src/
  components/     interfaz Vue
  composables/    estado, solicitudes cancelables y carga de nubes
  services/       cliente HTTP y streaming PTS1
  viewer/         escena three.js y controles
  workers/        parser binario PTS1
```

## Seguridad y HTTP

- Cada ruta `/api/*` exige `Authorization: Bearer <token>`.
- `staff` puede consultar todos los proyectos; `client` solo los de su cuenta.
- Los serializadores nunca exponen `project.internal`; los clientes tampoco reciben email ni telefono de contactos.
- Un proyecto ajeno y uno inexistente responden ambos `404` para no revelar su existencia.
- Los detalles usan `ETag`, `Cache-Control: private, max-age=0, must-revalidate` y `Vary: Authorization`.
- La nube permite `Range`; por ejemplo, `Range: bytes=0-15` devuelve el encabezado PTS1 con `206`.

Para probar los roles en la interfaz, usa el selector **Viewing as**: Staff, Acme client o Brick client. Son identidades de demostracion del kit; no reutilices esos tokens fuera de este entorno.

## Funcionalidad entregada

- API segura con proyectos, detalle, espacios, nubes e incidencias.
- Validacion de IDs y cuerpos, respuestas de error 4xx y manejo de JSON invalido.
- Vista en ingles con selector de identidad, proyectos autorizados, fechas con `Not recorded`, detalle e incidencias.
- Espacios 3D con Z hacia arriba, seleccion, filtro por nivel, controles de mouse/tactiles y cambio de unidades de area.
- Carga de nube PTS1 en Worker, progreso, cancelacion, reintento y mensajes claros para 404, red o archivo truncado.
- Diseno adaptable con controles de al menos 44 px y sin scroll horizontal en los tamanos objetivo de iPad.

## Limites y siguiente mejora

No queda una ruta requerida deliberadamente sin implementar. Antes de una entrega de produccion real faltaria medir la nube completa de 2.000.000 de puntos en hardware iPad fisico. Con un dia adicional anadiria pruebas automaticas del Worker y de la interfaz, metricas de memoria/FPS y carga espacial por bloques o niveles de detalle para archivos mucho mayores.

## Uso de IA

Se utilizo Codex de OpenAI como asistente para planificar, revisar, generar borradores y verificar cambios. Las decisiones, la ejecucion de pruebas y la revision final del codigo se realizaron sobre esta implementacion.
