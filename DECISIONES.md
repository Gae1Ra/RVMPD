# Registro de Decisiones de Diseño e Implementación (DECISIONES.md)

En conformidad con la regla 6 de la sección 13 de `SPEC.md` (*"Si algo es ambiguo, usar el valor por defecto de este documento y anotarlo en DECISIONES.md"*), se registran las siguientes decisiones técnicas:

### 1. Conmutador de Superficies (Panel Unificado ↔ UI de Muñeca)
* **Decisión:** Se integró un selector de superficie en la barra superior (`Panel` | `Muñeca`).
* **Motivo:** Permite al usuario/evaluador alternar y validar de forma interactiva e instantánea tanto la vista de escritorio/tableta (Panel unificado de 1280 px para médico/astronauta) como la vista compacta *glanceable* para dispositivo de muñeca (con presets de hardware 410×502 cuadrado y 454×454 redondo).

### 2. Empaquetado Local de Tipografías (Sin Red en Tiempo de Ejecución)
* **Decisión:** Se descargaron y empaquetaron localmente los archivos de fuentes `Archivo` (400, 500, 600, 700, 800) e `IBM Plex Mono` (400, 500, 600) en `/public/fonts/`.
* **Motivo:** Cumplimiento estricto del requisito de sistema a bordo sin conexión externa ni dependencias de CDNs de Google Fonts.

### 3. Preservación y Aislamiento de Código Previo
* **Decisión:** Los componentes del prototipo inicial se archivaron de forma limpia en `src/legacy/` y se excluyeron de `tsconfig.json`.
* **Motivo:** Garantiza que el proyecto compile con tipado estricto al 100% sin advertencias ni interferencias con los nuevos componentes y especificaciones de `SPEC.md`.

### 4. Motor Autónomo en Cliente con Soporte para Backend
* **Decisión:** El cliente React mantiene su propio motor de simulación determinista a 1 Hz, con variación fisiológica suave en reposo y ciclo de evento crítico idéntico al de `vitalis_unificado.html`.
* **Motivo:** Garantiza que la aplicación funcione inmediatamente al 100% de manera autónoma sin requerir servicios en la nube ni configuraciones complejas de inicio rápido.
