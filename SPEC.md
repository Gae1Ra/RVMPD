# VITALIS — Brief de proyecto para Antigravity

> **Cómo usar este documento:** colócalo en la raíz del repositorio como `SPEC.md`. Copia los archivos de referencia en `/reference/` (sección 12). Pide a Antigravity que construya **un hito a la vez** (sección 11) y que verifique los criterios de aceptación antes de pasar al siguiente.

**Prompt inicial sugerido:**
> Lee `SPEC.md` completo y `/reference/vitalis_unificado.html`. Ese HTML es la fuente de verdad de comportamiento, umbrales y estilo. Construye el Hito 1. No inventes valores clínicos: usa solo los de la sección 5. No hagas llamadas a servicios externos en tiempo de ejecución. Al terminar, ejecuta los criterios de aceptación del hito y reporta qué pasó y qué no.

---

## 1. Qué es VITALIS

Sistema de monitoreo de salud para astronautas. Funciona **totalmente a bordo, sin nube**:

```
Sensores ─► Adquisición ─► Base de datos local ─► Motor de IA local ─► Enlace ─► UI en la muñeca
(6 señales)  (validación)   (series y eventos)     (análisis en tiempo   (local)   del astronauta
                                                    real)
```

* **Perfil de demostración:** astronauta **A-01**, día 42 de misión.
* **Datos:** en esta fase **todos simulados**. No hay sensores reales.
* **Principio rector:** herramienta de **apoyo**, no diagnóstica. Nunca emite diagnósticos ni indica tratamientos; ante duda, remite al equipo médico.
* **Idioma:** español. Números con coma decimal (`36,8`). Reloj de misión `T+ 42d 14:22:08`.

### 1.1 Superficies

| Superficie | Usuario | Dispositivo | Estado |
| :--- | :--- | :--- | :--- |
| **Panel unificado** (`vitalis_unificado.html`) | Médico de vuelo y vista de astronauta | Pantalla grande (máx. 1280 px) | **Referencia ya diseñada**; se reimplementa sobre el backend real |
| **UI de muñeca** | Astronauta | Dispositivo de muñeca | **A diseñar** a partir del mismo lenguaje visual (sección 8) |

---

## 2. Alcance

### Incluido
* Backend local: base de datos, motor de simulación, motor de reglas de IA, API y transmisión en tiempo real.
* Panel unificado con rol Médico / Astronauta (réplica funcional de la referencia, conectada al backend).
* UI de muñeca (subconjunto *glanceable* del panel de astronauta).
* Exportación CSV, registro de intervenciones, rutinas diarias, aviso al equipo médico.

### Fuera de alcance (por ahora)
* Sensores físicos reales y protocolos de hardware.
* Dosimetría de radiación y telemetría espacial (CCSDS, DSN, TDRS).
* Protocolos médicos validados (el texto de recomendaciones es **de ejemplo**).
* Cuentas de usuario, multi-astronauta, sincronización con Tierra.

---

## 3. Arquitectura y stack recomendado

> Son **valores por defecto**; Antigravity puede proponer alternativas si justifica el cambio.

| Capa | Elección por defecto | Motivo |
| :--- | :--- | :--- |
| Backend | **Python 3.11 + FastAPI** | Simple, asíncrono, buen soporte WebSocket |
| Base de datos | **SQLite** (modo WAL) | Local, sin servidor, suficiente para 6 señales a 1 Hz |
| Motor de IA | **Motor de reglas determinista** (obligatorio) + **LLM local opcional** (solo para redactar texto) | La clasificación crítica no puede depender de un modelo generativo |
| Tiempo real | **WebSocket** `/ws/telemetry` | Un mensaje por segundo |
| Clientes | **TypeScript + Vite**, estilos con CSS variables (tokens de la sección 7) | Un solo código para panel y muñeca |
| Pruebas | `pytest` (backend), `vitest` (frontend), Playwright (flujos clave) | |

### 3.1 Estructura de repositorio

```
vitalis/
├─ SPEC.md
├─ reference/                 # archivos de referencia (solo lectura)
├─ backend/
│  ├─ app/
│  │  ├─ main.py              # FastAPI + WebSocket
│  │  ├─ config.py            # indicadores y umbrales (sección 5)
│  │  ├─ db.py                # SQLite, esquema, retención
│  │  ├─ simulator.py         # generador de telemetría simulada
│  │  ├─ classifier.py        # niveles 0-3 y nivel global
│  │  ├─ readiness.py         # puntuación de preparación
│  │  ├─ ai_engine.py         # reglas + texto Observación/Hipótesis
│  │  ├─ missions.py          # rutinas y reglas de seguridad
│  │  └─ api/                 # rutas REST
│  └─ tests/
├─ web/                       # panel unificado
├─ wrist/                     # UI de muñeca
└─ shared/                    # tokens de diseño y tipos compartidos
```

### 3.2 Degradación escalonada (requisito de diseño)

| Condición | Comportamiento |
| :--- | :--- |
| Todo disponible | Análisis completo + texto del asistente |
| Texto de IA no disponible (LLM caído) | Se usan **plantillas de texto fijas** sobre las reglas; las alertas siguen funcionando |
| Backend inaccesible desde la muñeca | La muñeca muestra el **último estado conocido** con marca de antigüedad (`hace 42 s`) y un aviso visible de enlace caído |

---

## 4. Modelo de datos

### 4.1 Tablas SQLite

| Tabla | Campos clave |
| :--- | :--- |
| `astronauts` | `id` (`A-01`), `mission_start`, `name_label` |
| `indicators` | `id`, `abbr`, `astro_name`, `clinical_name`, `unit`, `decimals`, `base`, `ref_lo/hi`, `warn_lo/hi`, `crit_lo/hi`, `chart_min/max`, textos de ayuda |
| `samples` | `ts`, `indicator_id`, `value`, `value2` (diastólica), `quality`, `source` (`simulado`) |
| `aggregates` | `bucket_ts`, `indicator_id`, `range` (`24h`/`7d`), `avg`, `min`, `max`, `count` |
| `events` | `ts`, `level`, `indicator_id` (nullable), `text`, `kind` (`alerta`, `simulacion`, `intervencion`, `aviso`) |
| `interventions` | `ts`, `met_label`, `text` |
| `missions` | `id`, `title`, `xp`, `is_exercise` |
| `mission_log` | `date`, `mission_id`, `done`, `ts` |
| `notifications` | `ts`, `snapshot_json`, `status` |

### 4.2 Retención
* **Crudo a 1 Hz:** últimas 24 h.
* **Agregados:** 7 días (resolución 12 h o más fina si se necesita) y evolución para la vista `7d`.
* Purgado automático al arrancar y cada hora.

---

## 5. Indicadores, umbrales y niveles

> **Estos valores vienen del panel unificado y prevalecen** sobre los de los prototipos anteriores del zip.

### 5.1 Los 6 indicadores

| id | Abrev. | Nombre astronauta | Nombre clínico | Unidad | Base | Rango individual (`ref`) | Advertencia (`warn`) | Crítico (`crit`) | Eje gráfica |
| :--- | :--- | :--- | :--- | :--- | ---: | :--- | :--- | :--- | :--- |
| `fc` | FC | Frecuencia cardíaca | Frecuencia Cardíaca | lpm | 72 | 60–80 | 50–100 | 40–120 | 40–140 |
| `spo2` | SpO₂ | Oxígeno en sangre | Saturación de Oxígeno | % | 98 | 95–100 | 92–100 | 88–100 | 85–100 |
| `pa` | PA | Presión arterial | Presión Arterial (sistólica) | mmHg | 118 | 110–125 | 100–138 | 90–155 | 85–165 |
| `fr` | FR | Respiración | Frecuencia Respiratoria | rpm | 15 | 12–18 | 10–22 | 8–28 | 6–32 |
| `temp` | Temp. | Temperatura | Temperatura Corporal | °C | 36,8 | 36,2–37,2 | 35,8–37,8 | 35,0–38,5 | 34,8–39,0 |
| `hrv` | HRV | Variabilidad | Variabilidad Cardíaca | ms | 54 | 40–70 | 28–85 | 18–100 | 10–100 |

* `pa` guarda además la **diastólica** (base 78) y se muestra como `118/78 mmHg`. **La clasificación usa solo la sistólica.**
* Decimales: 1 para temperatura, 0 para el resto.

### 5.2 Clasificación de nivel

```
si valor fuera de crit  → 3 Crítico
si valor fuera de warn  → 2 Advertencia
si valor fuera de ref   → 1 Observación
si no                   → 0 Normal
```
**Nivel global** = máximo de los niveles de los 6 indicadores.

| Nivel | Etiqueta | Título global | Color | Forma |
| :--- | :--- | :--- | :--- | :--- |
| 0 | Normal | Todo en orden | Verde | Círculo |
| 1 | Observación | En observación | Azul | Rombo |
| 2 | Advertencia | Haz una pausa | Ámbar | Triángulo |
| 3 | Crítico | Avisa ahora | Rojo | Cuadrado |

### 5.3 Puntuación de preparación
```
preparación = max(8, 86 − 7 × suma_de_niveles_de_los_6_indicadores)
```

### 5.4 Simulación de evento crítico

Ciclo del botón: **Nominal → Evento (subida) → Recuperación → Nominal**.

| Indicador | Objetivo del evento | Nivel resultante |
| :--- | :--- | :--- |
| FC | 126 lpm | Crítico |
| SpO₂ | 91 % | Advertencia |
| PA | 144/92 mmHg | Advertencia |
| FR | 25 rpm | Advertencia |
| Temp. | 37,9 °C | Advertencia |
| HRV | 20 ms | Advertencia |

* Subida: factor `f = min(1, tick/8)`; los valores interpolan entre base y objetivo. A los 18 ticks pasa a recuperación.
* Recuperación: `f = max(0, 1 − tick/10)`; al llegar a ≈0 vuelve a nominal.
* Al iniciar el evento se **guarda la instantánea previa** para la tabla "Antes / Ahora".
* En reposo: jitter fisiológico suave alrededor de la base, **recortado al rango individual**.
* Tick global: **1 segundo**.

---

## 6. Motor de IA local

### 6.1 Capa 1 — Reglas (obligatoria)
Calcula niveles, nivel global, preparación, tendencias y porcentaje de tiempo dentro del rango individual. **No usa modelos generativos.**

### 6.2 Capa 2 — Texto del asistente (plantillas; LLM opcional)

**Rol Médico** — siempre dos bloques separados:
* **Observación:** lo que muestran los datos.
* **Hipótesis:** posibles factores, **no confirmados**.

| Consulta rápida | Condición | Contenido |
| :--- | :--- | :--- |
| *(por defecto)* | Nivel global < 2 | Los 6 signos dentro del rango individual; estado basal estable; recordar que es apoyo sobre datos simulados |
| Resumen 24 h | Nivel global < 2 | Más del 96 % de muestras dentro de franja; sin alertas pendientes |
| Tendencia | Nivel global < 2 | HRV y FC actuales vs. rango; sin signos tempranos de fatiga |
| Protocolo | Nivel global < 2 | Umbrales activos en 6 sensores, actualización cada 1 s; si supera advertencia: pausar esfuerzo y notificar |
| *(cualquiera)* | Nivel global ≥ 2 | Observación: elevación simultánea de FC y FR con descenso de SpO₂ y HRV fuera del rango. Hipótesis: respuesta autonómica aguda o sobrecarga; reposo y reevaluar en 5 min |

**Rol Astronauta** — frase corta y llana:
* Nivel < 2: *"Tus signos vitales están dentro de tu rango habitual. Puedes continuar con tus rutinas diarias con normalidad."*
* Nivel ≥ 2: *"Tus pulsaciones y respiración están altas. Detén el ejercicio, descansa sentado y avisa al equipo médico."*
* Más la **siguiente rutina pendiente** con su XP.

### 6.3 Reglas del asistente (no negociables)
1. No diagnostica ni indica tratamientos.
2. No inventa valores: todo sale de la base de datos.
3. Texto plano, sin Markdown.
4. Si algo preocupa, indica avisar al equipo médico.
5. Menciona que los datos son simulados cuando sea relevante.
6. **Sin llamadas a servicios externos.** Si se usa un LLM, debe correr localmente (p. ej. `llama.cpp` u Ollama) detrás de una interfaz `generate_text(context) -> str` intercambiable.

---

## 7. Sistema de diseño (tokens y reglas)

### 7.1 Colores

| Token | Oscuro (por defecto) | Claro |
| :--- | :--- | :--- |
| `--bg` | `#101216` | `#EEF1F5` |
| `--text` | `#F2F4F7` | `#101216` |
| `--text2` | `#B4BCC8` | `#485160` |
| `--glass` | `rgba(24,27,34,.72)` | `rgba(255,255,255,.82)` |
| `--surface` | `rgba(255,255,255,.04)` | `rgba(255,255,255,.72)` |
| `--line` | `rgba(255,255,255,.10)` | `rgba(16,18,22,.10)` |
| `--green` | `#7DB843` | `#47761B` |
| `--blue` | `#5B9FEE` | `#2567BD` |
| `--amber` | `#E6AD52` | `#875A08` |
| `--red` | `#E05252` | `#B83232` |
| `--accent` | `#438FE8` | `#2567BD` |

Cada color semántico tiene variante de fondo con ~12–16 % de opacidad (`--green-bg`, etc.).

### 7.2 Superficies y forma
* **Glass sobrio:** `backdrop-filter: blur(24px)`, borde 1 px `--line`, brillo interno superior, **radio 16 px**, sin neón.
* Respaldo sin `backdrop-filter`: fondo sólido `--bg`.
* Botones y controles: radio 10–12 px.

### 7.3 Tipografía
* **Archivo** (texto y títulos) + **IBM Plex Mono** (cifras, etiquetas técnicas).
* Cifras tabulares: `font-variant-numeric: tabular-nums`.
* Valores grandes: 36–40 px en tarjetas. **Mínimo 14 px** en cualquier texto.
* Las fuentes deben **cargarse localmente** (empaquetadas), no desde Google Fonts, porque no hay red a bordo.

### 7.4 Accesibilidad (obligatorio)
* **Estado = color + forma + texto.** Nunca solo color.
* Foco visible: `outline: 2px solid var(--accent)`.
* Respetar `prefers-reduced-motion`.
* Gráfica navegable con **← →** y tooltip con valor y hora.
* Cierre de modales con **Esc**.
* Tarjetas clicables con `role="button"`, `tabindex="0"` y `aria-label` con valor y estado.

---

## 8. Panel unificado (replicar la referencia)

Una sola página, **sin barra lateral**, ancho máximo 1280 px. De arriba abajo:

### 8.1 Barra superior
* Izquierda: logotipo circular + `VITALIS · A-01 · DÍA 42`.
* Centro: selector de rol **Médico | Astronauta**.
* Derecha: estado `Simulado`, reloj de misión, botón **Simular evento** (cambia de texto: *Simular evento → Simular recuperación → Detener simulación*, con borde rojo/ámbar según fase) y botón de tema (sol/luna).

### 8.2 Franja de estado unificada
* Forma + color + título global, **preparación /100**, antigüedad del dato (`hace 1 s`).
* Derecha: **Exportar CSV** y **Avisar al equipo** (se pinta del color del nivel cuando el nivel ≥ 2).

### 8.3 Panel de emergencia
Visible si hay simulación activa **o** nivel global ≥ 2.
* **Médico:** insignia de fase (*Elevación aguda* / *Recuperación guiada*), tabla **Antes del evento / Ahora** (Parámetro · Previo · Actual · Cambio, cambio coloreado por nivel), acción recomendada, **registro de intervenciones** (campo + lista con hora de misión).
* **Astronauta:** versión simplificada con instrucción corta.

### 8.4 Matriz 3×2 de signos vitales
* 6 tarjetas, **sin micrográficas internas**.
* Fila 1: forma + nombre (abreviatura en Médico, nombre llano en Astronauta) + etiqueta de nivel (+ botón `?` solo en Astronauta).
* Fila 2: valor grande + unidad + rango individual.
* Fila 3: nombre clínico (Médico) o descripción llana (Astronauta).
* Clic o Enter/Espacio selecciona el indicador en la gráfica; la tarjeta seleccionada lleva borde `--accent`.

### 8.5 Sección inferior (7 + 5 columnas)
* **Evolución · [indicador]** (7 col.): selector **Vivo | 24 h | 7 d**; gráfica SVG con **franja verde = rango individual**, línea con área, **rombos ámbar = evento**, cursor vertical, tooltip; resumen *"Dentro del rango individual el X % del periodo"*; eje Y con 3 marcas.
* **IA Local · Apoyo a la decisión** (5 col.): contenido según rol (sección 6), botones de consulta rápida (solo Médico), píldora de siguiente rutina con botón de completar (solo Astronauta).

### 8.6 Pie permanente
> *Todos los valores son simulados · Herramienta de apoyo a bordo, no sustituye al personal médico.*

### 8.7 Modales
1. **Aviso al equipo médico:** muestra la instantánea de los 6 signos y el registro de eventos que se enviará "mediante el enlace local a bordo", perfil y preparación; botones *Cancelar* / *Confirmar envío*.
2. **Rutinas diarias:** lista de 5 rutinas con XP y botón *Completar*; nota *"Posponer una rutina nunca resta progreso"*; banner de **seguridad activa** si nivel ≥ 2; resumen `Nivel: Cadete · X / 200 XP`.
3. **Guía de indicador (`?`):** *¿Qué mide?* y *¿Cuándo avisar?*.

### 8.8 Toast
Confirmación silenciosa de 3,2 s (rutina completada, CSV exportado, evento iniciado, aviso enviado, etc.).

### 8.9 Rutinas diarias

| id | Rutina | XP | Ejercicio |
| :--- | :--- | ---: | :---: |
| `water` | Beber un vaso de agua | 10 | No |
| `breath` | Respiración guiada (4 ciclos) | 20 | No |
| `react` | Prueba de reacción (3 intentos) | 25 | No |
| `exercise` | Ejercicio de resistencia | 40 | **Sí** |
| `rest` | Rutina de descanso | 20 | No |

**Regla de seguridad:** si el nivel global es ≥ 2, `exercise` queda **pausado** ("Pausado por seguridad") y no se ofrece como siguiente rutina. Los niveles de progresión son 200 XP por nivel: Cadete → Especialista → Piloto → Comandante.

### 8.10 Exportación CSV
Columnas: `Tiempo, Parametro, Valor, Unidad, Rango_Individual, Origen`. Origen siempre `Simulado`. Nombre: `VITALIS_A01_{indicador}_{rango}.csv`. Genera el CSV del **indicador y rango seleccionados**.

---

## 9. UI de muñeca (a diseñar)

> **Supuestos por defecto** (cambiar en `wrist/config.ts` si el hardware real es otro):
> * Vista web a tamaño de reloj, con dos *presets*: **cuadrado 410 × 502** y **redondo 454 × 454**.
> * Entrada táctil; sin teclado.
> * Siempre en tema oscuro con opción de claro.

### 9.1 Principios
* **Glanceable:** el estado se entiende en menos de 2 segundos.
* Un dato principal por pantalla; el detalle es secundario.
* Objetivos táctiles **≥ 44 px**.
* Respuestas de IA de **1–2 frases**; **sin escritura libre** (solo consultas rápidas).
* Mismos tokens, formas y niveles que el panel (secciones 5 y 7).

### 9.2 Pantallas

| # | Pantalla | Contenido |
| :--- | :--- | :--- |
| 1 | **Estado** (inicio) | Forma + color + título global, preparación grande, un valor destacado (el indicador de mayor nivel), antigüedad del dato |
| 2 | **Signos** | Lista vertical de los 6 con forma, valor y unidad; toque abre detalle |
| 3 | **Detalle** | Valor, rango individual, mini-franja de posición dentro del rango, texto *¿Cuándo avisar?* |
| 4 | **Avisar** | Botón grande *Avisar al equipo médico* + confirmación en dos pasos |
| 5 | **Rutina** | Siguiente rutina, XP, completar; rutina de ejercicio bloqueada si nivel ≥ 2 |
| 6 | **Asistente** | Frase del asistente + 3 consultas rápidas |

### 9.3 Alertas
* Al subir de nivel: pantalla de alerta a pantalla completa con color, forma y acción en una línea; vibración (API de vibración / marcador de háptica para hardware real).
* Nivel Crítico: el botón **Avisar** aparece en el primer toque.
* **Enlace caído:** banda superior ámbar *"Sin enlace · último dato hace N s"*; el nivel mostrado se marca como desactualizado.

---

## 10. API del backend

| Método | Ruta | Función |
| :--- | :--- | :--- |
| `WS` | `/ws/telemetry` | Un mensaje por segundo: instantánea (valores, niveles, nivel global, preparación, fase de simulación, hora de misión) |
| `GET` | `/api/snapshot` | Instantánea actual |
| `GET` | `/api/series?indicator=fc&range=vivo\|24h\|7d` | Serie con etiquetas y marcadores de evento |
| `GET` | `/api/export.csv?indicator=fc&range=vivo` | CSV (sección 8.10) |
| `GET` | `/api/ai?role=medico\|astronauta&query=default\|resumen24h\|tendencia\|protocolo` | Texto del asistente |
| `POST` | `/api/simulate/cycle` | Avanza el ciclo Nominal → Evento → Recuperación → Nominal |
| `POST` | `/api/notify` | Registra aviso con instantánea y eventos |
| `POST` | `/api/interventions` | Registra intervención con hora de misión |
| `GET` | `/api/missions` · `POST /api/missions/{id}/toggle` | Rutinas y XP, respetando regla de seguridad |
| `GET` | `/api/events` | Historial de eventos |

**Formato de mensaje WebSocket (ejemplo):**
```json
{
  "met": "T+ 42d 14:22:08",
  "sim_phase": "off",
  "global_level": 0,
  "readiness": 86,
  "data_age_s": 1,
  "indicators": [
    {"id": "fc", "value": 72, "level": 0},
    {"id": "pa", "value": 118, "value2": 78, "level": 0}
  ]
}
```

---

## 11. Hitos de construcción

Cada hito termina con sus criterios de aceptación. **No avanzar sin cumplirlos.**

### Hito 1 — Núcleo de datos y clasificación
* Config de indicadores (sección 5.1), esquema SQLite, clasificador, preparación, simulador con ciclo de evento.
* **Aceptación:**
  - [ ] Con valores base, los 6 indicadores son nivel 0 y la preparación es 86.
  - [ ] Con los valores objetivo del evento (5.4), FC es nivel 3 y los otros 5 son nivel 2; nivel global 3.
  - [ ] Pruebas `pytest` cubren los límites exactos de `ref`, `warn` y `crit` (dentro y fuera).
  - [ ] En reposo, los valores nunca salen de su `ref`.

### Hito 2 — API y tiempo real
* FastAPI, WebSocket a 1 Hz, endpoints de la sección 10, retención y agregados.
* **Aceptación:**
  - [ ] Un cliente WebSocket recibe 1 mensaje por segundo durante 60 s sin huecos.
  - [ ] `/api/series` devuelve 24 h y 7 d desde agregados.
  - [ ] El CSV exportado abre correctamente y respeta coma decimal.
  - [ ] Todo funciona **sin conexión a internet**.

### Hito 3 — Motor de IA local
* Reglas + plantillas de texto (sección 6), interfaz `generate_text` intercambiable.
* **Aceptación:**
  - [ ] Texto de Médico siempre contiene los bloques *Observación* y *Hipótesis*.
  - [ ] Ningún texto contiene diagnóstico ni tratamiento.
  - [ ] Con nivel ≥ 2 las respuestas cambian al texto de alerta.
  - [ ] Si el LLM opcional falla, se devuelve la plantilla sin error.

### Hito 4 — Panel unificado
* Reimplementar la referencia (sección 8) conectada al backend.
* **Aceptación:**
  - [ ] Comparación visual lado a lado con `reference/vitalis_unificado.html` en ambos temas y ambos roles.
  - [ ] Todas las reglas de accesibilidad de 7.4 cumplidas.
  - [ ] Panel de emergencia aparece y desaparece según 8.3.
  - [ ] Modales, toast, CSV y registro de intervenciones funcionan.
  - [ ] Cero peticiones a dominios externos (fuentes empaquetadas).

### Hito 5 — Rutinas
* Rutinas, XP, niveles, regla de seguridad (8.9).
* **Aceptación:**
  - [ ] Con nivel ≥ 2, `exercise` está bloqueado en panel y no es "siguiente rutina".
  - [ ] Completar y desmarcar suma y resta XP correctamente.

### Hito 6 — UI de muñeca
* Pantallas de la sección 9 sobre los tokens compartidos.
* **Aceptación:**
  - [ ] Funciona en ambos *presets* (410 × 502 y 454 × 454) sin desbordes.
  - [ ] Estado legible a un vistazo; ningún texto menor de 14 px.
  - [ ] Alerta a pantalla completa al subir de nivel.
  - [ ] Con el backend detenido, se muestra el último dato con banda de enlace caído.

### Hito 7 — Pulido y pruebas de extremo a extremo
* Playwright: ciclo de evento completo, cambio de rol, cambio de tema, aviso, exportación.
* **Aceptación:** suite en verde y `README` con instrucciones de arranque.

---

## 12. Archivos de referencia

Copiar a `/reference/`:

| Archivo | Uso |
| :--- | :--- |
| `vitalis_centro_m_dico_unificado_y_monitoreo_espacial.html` (renombrar a `vitalis_unificado.html`) | **Fuente de verdad** de layout, comportamiento, textos y umbrales |
| `Vitalis Astronauta.dc.html`, `Centro de Control.dc.html` | Solo inspiración visual (fondo con estrellas, anillo de preparación, tabla de emergencia). **Si difieren del unificado, manda el unificado** |
| `assets/vitalis-logo.png` | Logotipo oficial |

> Los `.dc.html` usan un runtime propio (`support.js`) y una llamada a IA externa (`window.claude.complete`). **No portar ese runtime ni esa llamada.**

---

## 13. Reglas para el agente

1. **No inventar datos clínicos.** Umbrales, textos y rangos salen de este documento.
2. **Sin red en tiempo de ejecución:** sin CDN, sin Google Fonts, sin APIs externas.
3. **Un hito por vez.** Reportar resultados de criterios de aceptación al terminar cada uno.
4. **Estado nunca solo por color.**
5. **Todo dato mostrado indica que es simulado** (pie del panel, columna `Origen` del CSV).
6. **Si algo es ambiguo, usar el valor por defecto de este documento** y anotarlo en `DECISIONES.md`, no bloquearse.

---

## 14. Decisiones abiertas

| Tema | Valor por defecto asumido | Cambiar si… |
| :--- | :--- | :--- |
| Hardware de muñeca | Web a 410 × 502 o 454 × 454 | Se define un dispositivo real (Wear OS, watchOS, otro) |
| Motor de IA | Reglas + plantillas | Se decide incluir un LLM local y se define el modelo |
| Enlace backend ↔ muñeca | WebSocket sobre red local | Se usa BLE u otro enlace |
| Qué ve el astronauta en muñeca | Subconjunto de la vista Astronauta (9.2) | Se requiere más o menos detalle |
| Persistencia entre reinicios | Sí (SQLite en disco) | Se prefiere memoria volátil para la demo |
| Idiomas | Solo español | Se requiere multilenguaje |
