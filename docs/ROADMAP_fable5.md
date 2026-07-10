# Roadmap técnico — Copiloto Fuxion
### Para Fable 5 en Claude Code · v1.1 (actualizado con hallazgo de encuesta y contexto de Fuxion Avatar)

> Este documento le dice a Fable 5 QUÉ construir y en qué orden. Se lee junto con `CLAUDE.md`
> (reglas generales) y los Skills en `skills/`. No se salta ninguna fase sin que Alejandro lo pida.

## Estado actual (2026-07-07)

- **Desplegado en producción (`main`):** Fase A, Fase B y Fase C1 (monetización + roles).
  A y B confirmadas funcionando end-to-end. El RAG de Fase B corre con datos de ejemplo
  (`es_dato_ejemplo = true`) — el gate de Fase 0 sigue sin confirmarse formalmente.
- **Fase C1 probada end-to-end en producción (2026-07-07):** pago real con tarjeta de prueba de
  Stripe (MODO TEST) confirmado; Supabase actualiza plan/estado/customer_id/subscription_id
  correctamente; webhook validado por separado con un evento de Stripe (200, delivered).
  **Prueba pendiente, no bloqueador de código:** el flujo de rol líder + equipo (generar código
  de invitación, canjearlo con un segundo usuario, ver métricas agregadas en `/dashboard/equipo`)
  — se prueba cuando haya más de un usuario real disponible, junto con la resolución del dominio
  de email.
- **Bloqueador de negocio pendiente:** los emails de auth salen del dominio de pruebas de Resend
  (`onboarding@resend.dev`), que solo entrega al dueño de la cuenta. Sin dominio propio
  verificado, ningún usuario real puede registrarse — bloquea toda prueba con usuarios reales.
- **Resto de Fase C (C2): no ha comenzado** — CRM de prospectos con consentimiento, pegar
  conversación de WhatsApp, dashboard admin `/admin`, instrumentación de métricas.
- **Pendiente de confirmar:** el fix de `NavLinks.tsx` (Equipo visible en desktop para rol
  líder) se aplicó pero no se probó visualmente esta sesión — verificar en la próxima.

## Cambios respecto a la v1.0

1. **Fase B ahora incluye un panel simple de priorización manual** (caliente/tibio/frío) desde el
   primer MVP — la encuesta de Fase 0 (6/6 respuestas) mostró que "decidir a quién contactar" pesa
   tanto como las objeciones, no menos. Antes esto vivía solo en la Fase D.
2. **Ninguna fase incluye generación de video o avatares.** Fuxion ya está construyendo esto
   internamente ("Fuxion Avatar", liderado por el CEO). Construirlo aquí sería duplicar esfuerzo en
   la pieza donde menos ventaja tenemos. El diferencial de este producto es el dataset de
   objeciones + CRM, no el contenido visual.

## Cómo leer las fases

Cada fase tiene: **Depende de** (si necesita un gate de negocio cumplido), **Construir** (qué
entra), **Criterio de terminado** (cómo se sabe que está lista, sin ambigüedad), y **No construir
todavía** (qué queda fuera a propósito).

---

## FASE A — Fundaciones ✅ COMPLETADA (2026-07-03, en producción)

**Depende de:** nada.

**Construir:**
- Autenticación de distribuidores: email + contraseña o magic link. Sin OAuth social todavía.
- Base de datos completa (ver `db/schema.sql`): usuarios/distribuidores, sesiones.
- Dashboard shell: layout con navegación (Generador de objeciones / Prioridades / Prospectos /
  Ajustes), vacío de contenido real, secciones futuras marcadas "próximamente".
- Sistema de diseño base: paleta púrpura/magenta de la marca (ver `docs/DESIGN_BRIEF.md`),
  componentes reutilizables (botón, tarjeta, input, badge de estado).
- Despliegue: Vercel + Supabase (ya en uso), variables de entorno documentadas en `.env.example`.

**Criterio de terminado:** un distribuidor crea cuenta, inicia sesión, y navega un dashboard vacío
pero funcional con las secciones futuras visibles.

**No construir todavía:** roles de equipo/líder, recuperación de contraseña avanzada,
invitaciones — eso es Fase C.

---

## FASE B — El Cerebro: generador de guiones + priorización manual ✅ COMPLETADA (2026-07-03, en producción, con datos de ejemplo en el RAG)

**Depende de:** Gate de Fase 0 (5+ usuarios recurrentes del Mago de Oz que pagarían) — o
construirse con datos de ejemplo/mock mientras se espera el gate, dejando claro en el código
(comentario o flag) que no se activa con distribuidores reales hasta pasar el gate.

**Construir:**
- Pipeline de ingestión de documentos (catálogo, transcripciones, objeciones) → chunking →
  embeddings → pgvector. Ver `skills/rag-ingestion/SKILL.md`.
- Motor de recuperación con filtro por producto/perfil.
- Endpoint + UI de generación: el distribuidor pega una objeción, recibe 2-3 respuestas sugeridas.
  Ver `skills/token-optimization/SKILL.md` y `skills/compliance-fuxion/SKILL.md` antes de escribir
  el system prompt.
- Modos por producto/perfil (control de peso, energía/deporte, piel) — selector simple.
- **Nuevo: panel de priorización manual.** Lista de prospectos con estado editable
  (caliente/tibio/frío), ordenable, sin lógica automática de scoring todavía — el distribuidor lo
  marca a mano. Esto es intencionalmente simple; el motor automático de señales es Fase D.
- Historial personal: cada distribuidor ve las objeciones que ya consultó.

**Criterio de terminado:** un distribuidor pega una objeción real, recibe respuestas basadas en
contenido ingerido (no genéricas de memoria del modelo), puede copiarlas con un clic, y puede ver
una lista de prospectos priorizada manualmente.

**No construir todavía:** edición colaborativa de respuestas, calificación estructurada por
respuesta, scoring automático de prioridad.

---

## FASE C — Monetización + CRM ligero + Dashboard admin

**Depende de:** Fase B en uso recurrente real ("esto me ahorra tiempo", no solo registro).

**Construir:**
- ✅ **C1 — COMPLETADA (2026-07-07, en producción, Stripe en MODO TEST):** suscripciones
  (tier individual 15€/mes + tier líder/equipo 79€/mes vía Stripe Checkout + Customer Portal +
  webhook), roles con invitación por código, métricas agregadas en `/dashboard/equipo`,
  límites de generaciones por plan, pantalla `/dashboard/suscripcion`. Pago y webhook probados
  end-to-end; el flujo líder+equipo con un segundo usuario queda pendiente de prueba (requiere
  resolver el dominio de email).
- Suscripciones: tier individual + tier líder/equipo (Stripe o similar). ✅ C1
- Roles: distribuidor individual vs. líder de equipo con acceso a métricas **agregadas** de su
  línea (nunca conversaciones privadas de cada uno — ver Regla 4 del Skill de cumplimiento). ✅ C1
- CRM de prospectos: pseudónimo obligatorio, estado (frío/tibio/caliente/cliente/perdido), campo
  de consentimiento GDPR como gate técnico — nada se guarda sin `consent_given = true`.
- Panel de "mis prospectos" dentro del dashboard, integrado con el panel de priorización de Fase B.
- **Dashboard admin ("El Cerebro"):** panel para gestionar ingestión de contenido al RAG, revisar
  objeciones nuevas capturadas, y ver métricas agregadas de uso (activación, uso recurrente,
  conversión curso→app, MRR, churn — ver Sección 8 del plan de negocio original).
- Instrumentación de métricas por usuario desde este punto: objeciones generadas, marcadas como
  "usada"/"cerró venta" (auto-reportado), frecuencia de uso semanal, tiempo hasta primera
  generación real.
- **Nuevo: pegar conversación completa de WhatsApp en `/dashboard/prospectos`.** El distribuidor
  pega el texto de una conversación (no solo una objeción suelta); el sistema la resume y
  **sugiere** un estado inicial del prospecto (caliente/tibio/frío) — el distribuidor lo confirma
  o ajusta, nunca se guarda automático (Regla 1: humano en el loop, aplica también a la
  clasificación). Viene de la Pregunta 02 del documento vivo del plan de negocio original, que no
  estaba aterrizada en ningún documento técnico. Ver la especificación de pantalla en el PRD.

**Criterio de terminado:** un distribuidor puede pagar, un líder ve agregados de su equipo, ningún
prospecto se guarda sin consentimiento, y el dashboard admin muestra métricas reales de uso.

**No construir todavía:** integración directa con WhatsApp Business API — sigue siendo
copiar/pegar manual. Diseño visual pulido del dashboard admin (la versión 3D/interactiva es Fase D
o posterior, ver `docs/DESIGN_BRIEF.md`).

---

## FASE D — Motor de timing/triggers, escala y funcionalidades de retención

**Depende de:** MRR creciendo con churn bajo en Fase C.

**Construir:**
- Motor de "a quién contactar hoy y por qué" (consequence-chain), basado en señales guardadas
  (última interacción, tipo de objeción, tiempo sin seguimiento) — ahora sí automatiza el scoring
  que en Fase B era manual.
- Resumen diario: "tus 5 prioridades de hoy" en el dashboard.
- Soporte multi-línea: un líder nuevo puede invitar a su equipo sin intervención manual de
  Alejandro.
- Mantenimiento del RAG: proceso claro para re-ingestar catálogo actualizado sin downtime.
- Simulador de práctica (roleplay de objeciones/presentaciones) como funcionalidad de retención.
- Generador de texto para reels (hooks, captions — solo texto, nunca video/avatar).
- Capa visual 3D/interactiva del dashboard admin ("El Cerebro" con estética de red neuronal) —
  ahora sí, como pieza de marketing y disfrute del producto, no como bloqueador de funcionalidad.

**Criterio de terminado:** el dashboard muestra prioridades diarias reales y accionables, y un
líder nuevo (no la madre de Alejandro) puede onboardear a su equipo solo.

**No construir todavía:** expansión fuera de Fuxion a otros MLM — eso es Fase 4 de negocio (mes
9+), fuera de este roadmap técnico.

---

## Reglas que aplican a TODAS las fases

Repetidas aquí porque deben verse en el roadmap, no solo en el Skill:

1. Ninguna respuesta se envía automáticamente a un tercero.
2. Ningún dato de prospecto se guarda sin consentimiento — gate técnico, no solo UX.
3. Nada de mensajería masiva o auto-envío, aunque "mejore la eficiencia".
4. Todo dato de salud se trata como categoría especial (seudonimizado).
5. Nada de generación de video/avatar — es terreno de Fuxion Avatar, no de este producto.
