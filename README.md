# Capítulos

Aplicación web para seleccionar capítulos de un PDF y descargarlos en un solo archivo. Usa los marcadores del documento como índice y permite ajustar los intervalos de páginas antes de extraerlos.

El procesamiento se realiza en el navegador: el PDF no se sube a un servidor.

## Funciones

- Carga de PDF mediante el selector de archivos o arrastrando el documento.
- Índice desplegable con selección de capítulos y subsecciones.
- Selección de todos los capítulos con un clic.
- Unión de intervalos solapados o adyacentes para evitar páginas duplicadas.
- Edición de la página inicial y final de cada intervalo, con validación.
- Botón «−1 al final» para quitar la última página de un intervalo.
- Descarga del resultado con el nombre del archivo original.
- Recordatorio después de descargar, con opción de ocultarlo en futuras descargas.

## Desarrollo local

Necesitas Node.js compatible con las dependencias del proyecto y npm. Usa Node.js 22.13 o posterior.

```bash
npm ci
npm run dev
```

Abre la dirección local que muestra Vite en la terminal.

## Uso

1. Elige un PDF o arrástralo sobre la aplicación.
2. Marca los capítulos que quieres conservar. Seleccionar un capítulo incluye sus subsecciones.
3. Pulsa **Extraer capítulos** para preparar los intervalos.
4. Revisa los campos **Desde** y **Hasta**. Las páginas se muestran desde 1 y ambos extremos se incluyen en la extracción.
5. Pulsa **Descargar** para generar el PDF.

Si cambias la selección del índice, pulsa otra vez **Extraer capítulos** para regenerar los intervalos. Esto reemplaza los ajustes anteriores.

## Limitaciones

- El documento debe tener marcadores en su índice. La aplicación no detecta capítulos a partir del texto ni permite iniciar una extracción de un PDF sin marcadores.
- Los marcadores indican dónde empieza una sección, pero no dónde termina. El intervalo propuesto incluye la página donde empieza el siguiente capítulo; revísalo antes de descargar y usa **−1 al final** si sobra esa página.
- Los números corresponden a la posición física de las páginas en el PDF; pueden diferir de la numeración impresa del documento.
- Los intervalos se ordenan y se unen antes de descargar. No se conserva un orden de selección personalizado ni se generan archivos separados por capítulo.
- El tamaño de los documentos que se pueden procesar depende de la memoria disponible en el navegador.

La preferencia para ocultar el recordatorio se guarda en `localStorage`. Si el navegador bloquea ese almacenamiento, se conserva solo durante la sesión de la aplicación.

## Comandos

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo. |
| `npm run build` | Comprueba TypeScript y genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve localmente la compilación de producción. |
| `npm run typecheck` | Comprueba los tipos sin generar archivos. |
| `npm run lint` | Revisa el código y el formato con Biome. |
| `npm run lint:fix` | Aplica las correcciones disponibles de Biome. |

Para probar la versión de producción:

```bash
npm run build
npm run preview
```

El contenido de `dist/` se puede servir desde un alojamiento estático. Las rutas de recursos están configuradas para publicarse en la raíz del sitio.

## Estructura

El proyecto utiliza TypeScript, Vite y PDF.js, sin un framework de interfaz.

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Interfaz y plantillas del índice y de los intervalos. |
| `src/main.ts` | Estado de la aplicación y conexión de eventos. |
| `src/pdf.ts` | Apertura del PDF y construcción del índice de capítulos. |
| `src/outline-view.ts` | Árbol de capítulos y selección de padres e hijos. |
| `src/ranges.ts` | Unión y validación de intervalos. |
| `src/range-view.ts` | Edición y validación visual de páginas. |
| `src/pdf-download.ts` | Extracción de páginas y descarga. |
| `src/file-upload.ts` | Selección de archivos y arrastrar y soltar. |
| `src/download-reminder.ts` | Recordatorio y persistencia de la preferencia. |
| `src/dom.ts` | Consulta de elementos y clonación de plantillas. |
| `src/motion.ts` | Animaciones y respeto por la preferencia de movimiento reducido. |
| `src/style.css` | Estilos y adaptación a pantallas pequeñas. |

Las fuentes Nimbus Sans se incluyen en `public/fonts/`, junto con sus archivos de licencia.
