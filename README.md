# PhonoCam v0.1

PhonoCam es una **PWA** (web app instalable) para capturar phonotropes desde la cámara del teléfono y calcular relaciones teóricas entre RPM, dibujos y FPS.

## Funciones

- Vista en vivo de la cámara con permisos explícitos.
- Grabación local mediante `MediaRecorder` y descarga en MP4 o WebM, **según el formato real soportado por el navegador**.
- Solicitudes de 12, 15, 24, 25, 30 o 60 FPS, con lectura del valor real cuando el navegador lo reporta.
- Guía circular y cruceta para alinear el disco (no se incorporan al video).
- Calculadora de sincronización con RPM estándar o personalizadas, dibujos y avance por cuadro.
- Controles de exposición, ISO y modo de enfoque **solo si los expone la API de cámara del navegador**, con advertencias si los valores no se pueden verificar.
- Instalación desde el navegador como app en pantalla de inicio (cuando lo permite el dispositivo).
- Sin cuentas, backend, librerías externas ni envío de videos al servidor.

## Publicar en GitHub Pages (sin programar)

1. Entra a https://github.com e inicia sesión.
2. Pulsa el botón **+** > **New repository**.
3. Nombre: `phonocam` (o cualquier otro). Selecciona **Public** y **Create repository**.
4. En el repositorio pulsa **Add file** > **Upload files**. **Descomprime** primero el ZIP y selecciona todos los archivos de esta carpeta (incluido `index.html`). No subas el ZIP sin descomprimir. Confirma con **Commit changes**.
5. Abre **Settings** > **Pages**.
6. En **Build and deployment** > **Source**, elige **Deploy from a branch**.
7. En **Branch**, elige `main`, carpeta `/(root)`, luego **Save**.
8. Abre la URL que GitHub muestre en Pages. Normalmente será `https://TU-USUARIO.github.io/phonocam/` si nombraste así el repositorio.
9. Abre ese enlace en el teléfono, pulsa **Activar cámara** y acepta el permiso.

> La publicación puede tardar un momento. La cámara necesita HTTPS (GitHub Pages ya lo ofrece). Evita incrustar la aplicación en un iframe de Google Sites: ábrela directamente.

## Utilizar Gemini si quieres modificar el proyecto

Sube o pega los archivos de este repositorio en Gemini y pide cambios concretos, por ejemplo: "Improve the mobile layout of this existing vanilla HTML/CSS/JS PhonoCam PWA, without removing the real camera capture behavior or claiming unsupported manual settings work." 

## Limitaciones importantes

- Es una **primera versión web**, no una aplicación nativa de iOS o Android. Safari y Chrome móviles pueden no permitir exposición/ISO manual exactos.
- `frameRate: { ideal: ... }` es una solicitud, no una garantía. La UI muestra el FPS **real reportado**, cuando está disponible. La captura efectiva puede variar bajo carga o poca luz.
- No hay procesamiento en tiempo real ni sincronización automática. La fórmula `FPS = RPM × dibujos / (60 × avance)` es teórica.
- Los videos no se suben al servidor; se guardan en memoria de la pestaña hasta que el usuario pulsa **Descargar video**. Descarga antes de salir de la página.
- Los formatos de exportación dependen de `MediaRecorder`; no existe conversión automática de WebM a MP4.
- Se necesita comprobar en un **teléfono físico** antes de afirmar que funciona con un modelo específico. Al cerrar la pantalla o cambiar de app puede pausarse la grabación.
- Si haces cambios en los archivos CSS/JS, cambia el valor `CACHE_NAME` en `service-worker.js` para forzar una actualización de la app instalada.

## Estructura

- `index.html`: interfaz en español.
- `styles.css`: apariencia adaptable a móvil y escritorio.
- `app.js`: permisos, cámara, grabación, controles posibles y calculadora.
- `manifest.webmanifest`: definición de PWA.
- `service-worker.js`: cachea los archivos estáticos para abrir la interfaz sin conexión. La cámara puede exigir acceso seguro y permisos vigentes.
- `icon.svg`, `icon-192.png`, `icon-512.png`: iconos.

## Privacidad

Toda la captura y la grabación ocurren en el navegador del dispositivo. GitHub Pages solo sirve los archivos de la aplicación. No se incluye un servidor que reciba material de video.
