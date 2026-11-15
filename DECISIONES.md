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
* **Decisión:** El cliente React mantiene un simulador de respaldo (legado copiado a `src/mock.ts`) que produce frames con la forma de `docs/CONTRACT.md`. Se activa cuando el WebSocket `/ws` no conecta; en cuanto hay enlace en vivo, se detiene.
* **Motivo:** Garantiza que la aplicación funcione de inmediato sin backend, y que el demo no se quede en blanco si el FastAPI no está levantado.

### 5. Mapeo de `status` del backend → niveles UI (0–3)
* **Decisión:** `green` → 0 (NORMAL), `amber` → 2 (ADVERTENCIA), `red` → 3 (CRÍTICO). El nivel 1 (OBSERVACIÓN) no se deriva del ternario del CONTRACT; queda para la lógica local de umbrales si un indicador no trae `status`.
* **Motivo:** El CONTRACT solo define tres estados. Mapear `amber` a 2 hace visible el panel de emergencia (regla SPEC: nivel ≥ 2). Documentado aquí para no inventar un cuarto estado en el backend.

### 6. Presión arterial solo sistólica
* **Decisión:** La tarjeta PA muestra únicamente `bp_sys` del CONTRACT. No se inventa diastólica.
* **Motivo:** El contrato no expone presión diastólica.

### 7. Proxy Vite y URL de API
* **Decisión:** En desarrollo, `VITE_API_URL` vacío (por defecto) usa rutas relativas `/api` y `/ws` a través del proxy de Vite hacia `http://localhost:8000`. Si se define `VITE_API_URL`, se usa ese host absoluto.
* **Motivo:** Coincide con el paso de proxy del plan de integración y evita CORS en local.

### 8. i18n ES/EN sin locale en el backend
* **Decisión:** Las cadenas de UI viven en `frontend/src/i18n/{es,en}.ts` con tipo `Dictionary` que falla el build si falta una clave. El locale se guarda en `localStorage` (`vitalis-locale`), por defecto `es`, y actualiza `<html lang>`. **No** se envía locale al backend: el CONTRACT no define parámetro de idioma en REST ni WebSocket.
* **Textos que quedan en inglés (origen backend / mock):** `alert.title`, `alert.explanation`, `alert.guidance[]`, nombres/descripciones de escenarios (`/api/scenarios` y `MOCK_SCENARIOS`), informes de análisis (`summary`, `findings`, `facts`, `disclaimer`, `likelihood`), y `spaceweather.source`.
* **Propuesta (sin tocar `backend/`):** añadir `Accept-Language` o `?locale=` al CONTRACT en una iteración posterior, o un diccionario frontend de traducción por `alert.id` / `scenario.id` si se quiere i18n sin cambiar el servidor.
