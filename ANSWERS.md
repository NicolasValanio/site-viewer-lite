# Respuestas cortas

## 1. Recarga de Safari en iPad con un escaneo de 300 MB

Primero distinguiria una excepcion JavaScript de una expulsion por memoria de Safari. Con Safari Web Inspector remoto revisaria consola, red, heap de JavaScript, memoria GPU, tamano recibido, copias de `ArrayBuffer` y el instante de la recarga. Probaria varios iPad con una nube reproducible. El visor actual descarga por stream, interpreta PTS1 en un Worker, transfiere buffers y permite cancelar, evitando bloquear la interfaz. Para 300 MB cargaria por bloques visibles, liberaria buffers al terminar cada bloque y limitaria memoria/concurrencia. Evitaria reunir toda la nube en RAM: usaria niveles de detalle o particion espacial servida desde el backend.

## 2. Usuarios con una version anterior durante dias

Una cache larga solo es segura si la URL identifica de forma inmutable el contenido. Si se reemplaza un archivo conservando la misma URL, el navegador, CDN o service worker puede conservar la version anterior hasta que expire. Publicaria activos con nombre hashado, como hace Vite, y nunca sobrescribiria ese contenido. El HTML de entrada tendria `no-cache` o revalidacion corta para descubrir los hashes nuevos. Si existe service worker, versionaria su cache, activaria la nueva version y eliminaria las claves antiguas. Asi la invalidacion deja de depender de pedir a cada usuario que borre cache.

## 3. Asistente que afirma haber ejecutado una accion inexistente

Cada herramienta debe devolver un resultado estructurado y verificable, no una frase que el modelo pueda inventar. `openInspector` devolveria el estado real de la interfaz, el identificador de la operacion y un indicador de exito; `isolateLevel` devolveria el nivel activo y los espacios visibles. La capa que llama herramientas verifica esa postcondicion antes de permitir que el asistente responda "listo". Disenaria comandos idempotentes, con validacion de argumentos, errores explicitos y una consulta de estado posterior cuando haya efectos asincronos. Tambien registraria solicitud, resultado y estado final para depurar diferencias entre lo dicho y lo ocurrido.

## 4. Nombre de proyecto ajeno visible en la pestana Network

Revisaria primero `GET /api/projects`, el detalle, respuestas almacenadas en navegador, proxy/CDN y cualquier estado reutilizado al cambiar de usuario. Buscaria filtrado realizado solo en el cliente, caches compartidas sin `Vary: Authorization` o una respuesta privada marcada como publica. La regla de diseno es autorizar y serializar en el servidor cada representacion, antes de enviarla. El cliente nunca recibe una lista global para ocultarla despues. Aqui el servicio filtra por cuenta, los serializadores permiten campos explicitos y el detalle usa `Cache-Control: private` junto con `Vary: Authorization`; un proyecto ajeno responde igual que uno inexistente.

## 5. Dos millones de puntos a 15 FPS

Primero perfilaria CPU, GPU, memoria y fill rate para decidir si el cuello es parseo, transferencia o dibujo. Despues eliminaria trabajo por cuadro: renderizado bajo demanda, limite de DPR, antialiasing solo si aporta valor y tamano de punto apropiado. Eso mejora FPS sin perder datos. Segundo, aplicaria frustum culling y dividiria la nube en bloques espaciales para enviar a GPU solo los puntos visibles, conservando el conjunto completo en almacenamiento. Tercero, incorporaria niveles de detalle u octree: cerca se muestran puntos completos y lejos una representacion menos densa. Mediria cada cambio en computador e iPad antes de combinar tecnicas.
