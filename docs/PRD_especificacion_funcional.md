# Especificación funcional — Copiloto Fuxion
### Pantallas, flujos y user stories por fase. Sin diseño visual — eso vive en DESIGN_BRIEF.md

> Objetivo de este documento: que Fable 5 sepa exactamente qué pantallas construir, qué hace cada
> una, y qué pasa cuando el usuario interactúa — antes de escribir una sola línea de UI.
> "Medio feo" está bien. Que falte un flujo completo, no.

## Mapa de pantallas (sitemap) por fase

```
FASE A
├── /login              (email/contraseña o magic link)
├── /registro
└── /dashboard           (shell vacío, navegación a todo lo demás)

FASE B
├── /dashboard/objeciones        (generador de guiones)
├── /dashboard/objeciones/historial
└── /dashboard/prioridades       (panel manual caliente/tibio/frío)

FASE C
├── /dashboard/prospectos        (CRM ligero)
├── /dashboard/prospectos/[id]
├── /dashboard/equipo             (solo visible si rol = líder)
├── /dashboard/suscripcion
└── /admin                        ("El Cerebro" — dashboard admin, rol restringido)

FASE D
├── /dashboard/hoy                (resumen diario de prioridades)
├── /dashboard/practica           (simulador de roleplay)
└── /dashboard/contenido          (generador de texto para reels)
```

---

## FASE A

### `/login` y `/registro`
- **Qué hace:** autenticación simple. Campos: email, contraseña (o magic link por email).
- **User story:** "Como distribuidor, quiero crear una cuenta con mi email para empezar a usar la
  herramienta sin fricción técnica."
- **Casos borde:** email ya registrado → mensaje claro, no error genérico. Contraseña débil →
  validación simple, sin exigir reglas complejas que confundan a un usuario no técnico.

### `/dashboard` (shell)
- **Qué hace:** layout base con navegación lateral o inferior (según se decida en el brief de
  diseño) a: Generador de objeciones, Prioridades, Prospectos, Ajustes. Las secciones que aún no
  existen en la fase actual muestran un estado "Próximamente" en vez de un enlace roto.
- **User story:** "Como distribuidor, al entrar quiero ver claramente qué puedo hacer hoy con la
  herramienta, aunque no todo esté construido todavía."

---

## FASE B

### `/dashboard/objeciones` (generador de guiones)
- **Qué hace:** el distribuidor pega o escribe la objeción del prospecto (campo de texto simple,
  NO un prompt libre — ver `skills/token-optimization/SKILL.md`), elige el modo/producto desde un
  selector (control de peso / energía-deporte / piel / general), y presiona "Generar". El sistema
  devuelve 2-3 respuestas sugeridas con botón de copiar en cada una.
- **User story:** "Como distribuidor, cuando un prospecto me pone una objeción difícil, quiero
  pegar lo que me dijo y recibir opciones de respuesta ya adaptadas a Fuxion, para no quedarme en
  blanco."
- **Estados de la pantalla:**
  - Vacío (primera vez, sin historial).
  - Cargando (llamada a Claude en curso — mostrar indicador, no dejar la pantalla congelada).
  - Con resultado (2-3 respuestas, cada una copiable).
  - Sin contexto suficiente en el RAG (ver `skills/rag-ingestion/SKILL.md`): mostrar aviso de que
    la respuesta es más general, no forzar una respuesta que aparente estar bien fundamentada sin
    estarlo.
  - Alerta de salud (si la objeción menciona una condición médica — ver Skill de cumplimiento):
    mostrar el recordatorio de "no ofrecer como tratamiento" de forma visible, no como texto
    pequeño al fondo.

### `/dashboard/objeciones/historial`
- **Qué hace:** lista de objeciones que el distribuidor ya generó, con fecha y la posibilidad de
  marcar "esto cerró la venta" / "esto no funcionó" (auto-reportado, alimenta las métricas de
  Fase C).
- **User story:** "Como distribuidor, quiero ver qué objeciones ya resolví antes para no repetir
  trabajo si me sale una parecida."

### `/dashboard/prioridades` (panel manual)
- **Qué hace:** lista de prospectos (puede empezar como texto libre simple: nombre/apodo +
  estado) que el distribuidor marca manualmente como caliente/tibio/frío. Ordenable por estado.
  Sin lógica automática todavía — eso es Fase D.
- **User story:** "Como distribuidor, quiero tener una lista simple de a quién le debo dar
  seguimiento hoy, sin depender de mi memoria o de anotaciones sueltas en WhatsApp."
- **Nota:** en Fase B esto puede vivir sin estar conectado todavía al CRM completo de Fase C — es
  intencional, para dar valor rápido sin esperar a la capa de consentimiento GDPR completa. Si el
  distribuidor introduce un nombre real de prospecto aquí antes de que exista el gate de
  consentimiento de Fase C, el campo debe tratarse igual de sensible — revisar con el Skill de
  cumplimiento si esto requiere adelantar el consentimiento a esta fase.

---

## FASE C

### `/dashboard/prospectos` y `/dashboard/prospectos/[id]` (CRM ligero)
- **Qué hace:** versión completa del panel de prioridades, ahora con: pseudónimo del prospecto,
  estado (frío/tibio/caliente/cliente/perdido), notas, historial de objeciones asociadas a ese
  prospecto, y el checkbox obligatorio de consentimiento antes de poder guardar cualquier dato.
- **User story:** "Como distribuidor, quiero un lugar central donde ver todo lo que sé de un
  prospecto — qué objeciones puso, en qué estado está, y qué sigue — sin tener que buscar en mis
  chats de WhatsApp."
- **Caso borde crítico:** si el distribuidor intenta guardar un prospecto sin marcar
  consentimiento, el sistema bloquea el guardado con un mensaje claro de por qué (no un error
  técnico genérico).

### `/dashboard/prospectos` — pegar conversación de WhatsApp (dentro del CRM)
- **Qué hace:** en la ficha de un prospecto (o al crearlo), el distribuidor pega el texto completo
  de una conversación de WhatsApp (copiar/pegar manual — NO integración con WhatsApp Business API,
  ver "No construir todavía" en el roadmap). El sistema devuelve: (a) un resumen corto de la
  conversación, y (b) un estado inicial **sugerido** (caliente/tibio/frío). El distribuidor lo
  confirma o lo ajusta antes de guardar — **la sugerencia nunca se guarda automáticamente**
  (Regla 1: humano en el loop, aplica también a la clasificación, no solo al envío de mensajes).
  Origen: Pregunta 02 del documento vivo del plan de negocio original.
- **User story:** "Como distribuidor, quiero pegar la conversación completa que tuve con un
  prospecto y que el sistema me la resuma y me sugiera qué tan caliente está, para no tener que
  releer todo el chat ni clasificar de memoria — pero decidiendo yo el estado final."
- **Casos borde:**
  - **Texto pegado muy largo:** límite de caracteres explícito en el campo (con contador visible).
    Si se excede, se avisa antes de enviar — no se trunca en silencio ni se manda completo a la
    API (ver `skills/token-optimization/SKILL.md`: entrada acotada, nunca prompt libre sin tope).
  - **Consentimiento GDPR:** aplica el mismo gate técnico del CRM — si el prospecto no tiene
    `consent_given = true`, no se puede guardar ni el resumen ni el estado. La conversación pegada
    NUNCA se persiste completa: solo el resumen y el estado confirmado. El texto crudo se descarta
    tras generar la sugerencia.
  - **Menciones de salud en la conversación:** si el texto menciona condiciones médicas, aplica la
    misma detección y alerta del generador de objeciones (Skill de cumplimiento) — el resumen no
    debe reproducir ni amplificar health claims.
  - **El distribuidor no confirma:** si cierra o abandona sin confirmar el estado sugerido, no se
    guarda nada.

### `/dashboard/equipo` (solo rol líder)
- **Qué hace:** vista agregada — cuántos miembros del equipo están activos, uso promedio, sin
  acceso a conversaciones o prospectos individuales de cada uno.
- **User story:** "Como líder/Diamante, quiero ver si mi equipo está usando la herramienta y
  sacándole valor, sin invadir la privacidad de cada distribuidor."

### `/dashboard/suscripcion`
- **Qué hace:** ver plan actual, límite de generaciones usadas/disponibles (ver Skill de
  optimización de tokens), opción de cambiar de plan.
- **User story:** "Como distribuidor, quiero saber cuántas generaciones me quedan este mes antes
  de quedarme sin poder usar la herramienta a mitad de una conversación importante."

### `/admin` ("El Cerebro" — dashboard admin)
- **Qué hace:** panel restringido (rol admin, es decir Alejandro) para: subir/gestionar documentos
  de ingestión al RAG, revisar objeciones nuevas capturadas por distribuidores, ver métricas
  agregadas (activación, uso recurrente, conversión, MRR, churn).
- **User story:** "Como administrador del producto, quiero un lugar para mantener actualizado el
  contenido del RAG y ver si el negocio está creciendo, sin tener que consultar la base de datos
  directamente."
- **Nota de diseño:** funcional y simple en Fase C. La versión visual 3D/interactiva es Fase D —
  no bloquear esta pantalla esperando el diseño bonito.

---

## FASE D

### `/dashboard/hoy`
- **Qué hace:** resumen diario generado automáticamente ("tus 5 prioridades de hoy") basado en
  señales del motor de timing/triggers.
- **User story:** "Como distribuidor, quiero abrir la app y saber en 10 segundos a quién debo
  contactar hoy, sin tener que revisar toda mi lista de prospectos manualmente."

### `/dashboard/practica`
- **Qué hace:** simulador de roleplay — Claude hace de prospecto difícil (con un perfil/objeción
  elegido), el distribuidor practica su respuesta en texto (o voz, si se decide más adelante) y
  recibe feedback.
- **User story:** "Como distribuidor, quiero practicar cómo responder antes de hablar con un
  prospecto real, para sentirme más seguro."

### `/dashboard/contenido`
- **Qué hace:** generador de texto (hooks, guiones de reel, captions) para redes — mismo motor RAG
  que objeciones, distinto prompt. **Solo texto — nunca genera video, imagen, ni avatar** (ver
  nota de Fuxion Avatar en el roadmap).
- **User story:** "Como distribuidor, quiero ideas de qué publicar sobre un producto sin tener que
  pensarlo desde cero cada vez."

---

## Fuera de alcance de este documento (y por qué)

- **No incluye flujos de video/avatar** — decisión explícita, ver `ROADMAP_fable5.md`.
- **No incluye flujo de "buscador de prospecciones"** — descartado por riesgo legal, ver el
  Documento Maestro de funcionalidades (PDF ya entregado). La alternativa de "pedir referencia" no
  está especificada aquí todavía porque no es prioritaria; se detalla cuando se aborde Fase D en
  profundidad.
