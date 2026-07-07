# Copiloto Fuxion — Instrucciones del proyecto para Claude Code

> Este archivo se lee automáticamente al abrir el proyecto en Claude Code. No lo borres ni lo
> muevas. Si algo aquí contradice lo que te pido en el chat, dilo antes de continuar — puede ser
> que el proyecto haya evolucionado y este archivo esté desactualizado.

## Qué es este proyecto

Copiloto de ventas para distribuidores de Fuxion (empresa de venta directa / MLM de suplementos).
Ayuda a manejar objeciones de venta, prioriza prospectos, y con el tiempo aprende de datos reales
de la red. NO es un bot que vende solo — es una herramienta que multiplica a un vendedor humano
que sigue tomando cada decisión final.

**Autor/producto owner:** Alejandro Duque Jaramillo — dev senior fullstack, construye esto con
ayuda de Claude Code. Su madre es Diamante en Fuxion (líder de red) y es el canal de distribución
inicial.

## Las 4 reglas que NUNCA se rompen, en ningún archivo, en ninguna fase

Léelas antes de escribir una sola línea de código. Si una tarea que te piden en el chat entra en
conflicto con alguna de estas cuatro, dilo explícitamente antes de construir — no la "arregles"
en silencio ni la omitas en silencio.

1. **Humano siempre en el loop.** Ninguna función envía un mensaje a un prospecto o cliente real
   de forma automática. El sistema genera y sugiere; una persona copia, revisa y decide enviar.
   Esto aplica a texto, no solo a "mensajería masiva" — incluso una sola sugerencia no se autoenvía.
2. **Cero health claims sin revisión humana.** Fuxion vende suplementos. El sistema nunca afirma
   ni implica que un producto cura, trata, previene o diagnostica una condición médica. Cualquier
   salida que toque temas de salud pasa por el Skill de cumplimiento (`skills/compliance-fuxion/`)
   antes de mostrarse al usuario.
3. **Ningún dato de prospecto se guarda sin consentimiento explícito.** Es un gate técnico (a nivel
   de constraint de base de datos o validación de API), no una nota en un prompt. Si una tabla o
   endpoint toca datos de un prospecto, revisa primero `db/schema.sql` y el Skill de cumplimiento.
4. **Nada de scraping, cruce de datos de terceros, o mensajería masiva/automatizada.** Ni para
   "buscar prospectos" ni para "optimizar alcance". Si una idea se parece a esto, se rechaza aunque
   funcione mejor técnicamente.

## Stack técnico (ya decidido — no lo cambies sin preguntar)

- **Frontend:** Next.js 14 (React), Tailwind para estilos.
- **Backend:** Node, vía API routes de Next.js (no separamos backend todavía).
- **Base de datos:** Supabase (Postgres) con extensión `pgvector` para el RAG.
- **IA:** Claude API (Anthropic) para generación; Voyage AI para embeddings (intercambiable, ver
  `lib/embeddings.ts`).
- **Despliegue:** Vercel (plan Hobby por ahora).
- **Repo:** `AleDuk-Dev/copiloto-fuxion` — es el MISMO repo del prototipo "Mago de Oz" (Fase 0).
  No es un producto distinto, es el mismo producto creciendo. No crear un repo nuevo.

### Estrategia de rama (importante)

- Trabaja en una rama nueva por fase (ej. `feature/fase-a-fundaciones`), nunca directo en `main`.
  `main` es el Mago de Oz desplegado en Vercel — puede que Alejandro lo retome antes de que Fase A
  esté lista, así que no debe quedar roto a medio construir.
- Antes de tocar la base de datos: revisa qué tablas existen YA en el proyecto de Supabase (el
  Mago de Oz probablemente tiene una tabla simple de objeción/respuesta). El schema nuevo (usuarios,
  sesiones, prospectos, pgvector) se **suma** a lo que ya existe — no se borra ni se reemplaza sin
  confirmar con Alejandro primero. Usa el mismo proyecto de Supabase, solo activa la extensión
  `pgvector` si no está activada.
- Al terminar cada fase y confirmar que funciona, se hace merge a `main` — no antes.

## Dónde está cada cosa

| Archivo | Qué contiene |
|---|---|
| `CLAUDE.md` | Este archivo — reglas y contexto general |
| `docs/ROADMAP_fable5.md` | Fases A–D de construcción técnica, en qué orden, criterios de "terminado" |
| `docs/PRD_especificacion_funcional.md` | Pantallas, flujos, user stories — qué construir en cada pantalla |
| `docs/DESIGN_BRIEF.md` | Dirección visual: paleta, tono, qué SÍ y qué NO copiar de la competencia |
| `skills/compliance-fuxion/SKILL.md` | Reglas de cumplimiento accionables — consúltalo en cualquier tarea que genere texto o guarde datos de prospectos |
| `skills/rag-ingestion/SKILL.md` | Cómo trocear/etiquetar documentos para el RAG |
| `skills/token-optimization/SKILL.md` | Cómo evitar que el coste de API se coma el margen — aplica desde el primer endpoint |

## Contexto de negocio que afecta decisiones técnicas

- **Estado (2026-07-07): Fases A, B y C1 (monetización + roles) completas y en producción
  (`main`).** A y B confirmadas end-to-end (auth, dashboard, RAG con datos de ejemplo, generador
  de objeciones, historial, panel de prioridades). C1 probada end-to-end en producción: pago real
  con tarjeta de prueba de Stripe (MODO TEST) confirmado, Supabase actualiza
  plan/estado/customer_id/subscription_id correctamente, y el webhook validado por separado con
  un evento de Stripe (200, delivered). **Prueba pendiente (no bloqueador de código):** el flujo
  de rol líder + equipo (generar código de invitación, canjearlo con un segundo usuario, ver
  métricas agregadas en `/dashboard/equipo`) — se prueba cuando haya más de un usuario real
  disponible, junto con la resolución del dominio de email (ver bloqueador de abajo).
- **Stripe sigue en MODO TEST.** No activar modo live sin decisión explícita de Alejandro.
- **Bloqueador activo — emails de auth:** el envío de correos sigue en el dominio de pruebas de
  Resend (`onboarding@resend.dev`), que solo entrega a la cuenta propia del dueño. Hasta que se
  verifique un dominio propio, NINGÚN usuario real puede registrarse con su propio email — esto
  bloquea cualquier prueba con usuarios reales (incluida la madre de Alejandro, primera usuaria
  prevista), no solo un caso puntual.
- **Fuxion ya tiene su propia app de IA interna** ("Fuxion Avatar" — genera videos con avatar para
  prospección en redes, construida por el CEO). No compite directamente con este producto (el
  Copiloto es texto/objeciones/CRM, no video), pero por eso: NO priorices generación de video o
  avatares en este proyecto — sería redundante con lo que Fuxion ya está desplegando a toda la red.
  El valor de este producto está en el dataset propietario de objeciones reales y en el CRM ligero,
  no en features visuales llamativas.
- **Gate de negocio activo:** todavía no se ha confirmado formalmente la validación de Fase 0
  (5+ usuarios recurrentes del "Mago de Oz" que dicen que pagarían). Por eso la Fase B, aunque ya
  está construida y desplegada, funciona con datos de ejemplo en el RAG (`es_dato_ejemplo = true`,
  purgables) y no se activa con distribuidores reales todavía. Pregunta si no estás seguro de si
  el gate ya se cumplió.
- **Optimización de coste de tokens es una decisión de arquitectura, no un ajuste posterior.** Los
  usuarios finales no son técnicos y nunca deben escribir un prompt libre. Ver
  `skills/token-optimization/SKILL.md` antes de construir cualquier endpoint que llame a Claude.

## Cómo trabajar conmigo (Alejandro) en este proyecto

- Prefiero ir fase por fase, confirmando antes de la siguiente. No construyas más de una fase del
  roadmap sin que yo lo pida explícitamente.
- Avísame en texto plano, al final de cada sesión, qué construiste, qué falta, y qué decisión de
  las cuatro reglas de arriba tocaste (si tocaste alguna).
- Si una tarea es ambigua entre "más simple pero feo" y "más pulido pero lento": elige simple y
  feo. El diseño visual pulido se hace después con Claude Design, no aquí.
