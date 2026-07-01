---
name: compliance-fuxion
description: Consulta este skill SIEMPRE que escribas un system prompt, un endpoint que genere texto para el usuario final, o cualquier tabla/endpoint que toque datos de un prospecto. Cubre: prohibición de health claims, consentimiento GDPR, humano-en-el-loop, y confidencialidad de datos de red. Basado en el Manual de Políticas y Procedimientos de Fuxion (M-SAE-01 v02) y su Código de Ética.
---

# Skill de cumplimiento — Copiloto Fuxion

## Por qué existe este skill

Fuxion tuvo una sanción de INDECOPI por health claims. Su Manual de Políticas y Procedimientos
(P&P 3.5.1) incluye una cláusula de indemnización que traslada la responsabilidad legal de
violaciones al distribuidor — es decir, a quien usa esta app. Un error de cumplimiento no es solo
un bug: es un riesgo legal real para el usuario final. Por eso este skill no es una sugerencia de
estilo, es un gate.

## Regla 1 — Cero health claims

**Nunca generar ni permitir que el modelo genere texto que:**
- Afirme que un producto cura, trata, previene, o diagnostica cualquier enfermedad o condición
  médica ("esto cura la diabetes", "elimina la ansiedad", "sustituye tu medicación").
- Prometa un resultado de salud específico y garantizado ("vas a bajar 5kg en 2 semanas").
- Use lenguaje médico/clínico para describir un suplemento (no es un medicamento).

**Sí está permitido:**
- Describir ingredientes y su función nutricional general, tal como aparece en el catálogo oficial
  de Fuxion.
- Hablar de bienestar, energía, hábitos saludables, en términos generales y no prescriptivos.
- Citar testimonios SOLO si están explícitamente marcados como experiencia personal, no como
  garantía ("a mí me ayudó con..." vs "esto elimina...").

**Implementación técnica:**
- Todo system prompt de generación (objeciones, guiones, respuestas) debe incluir explícitamente
  la instrucción de no hacer claims de salud, con 2-3 ejemplos de qué SÍ y qué NO, no solo la regla
  abstracta — los modelos siguen mejor instrucciones con ejemplos concretos.
- Si el endpoint detecta que el prospecto mencionó una condición médica específica (diabetes,
  cáncer, embarazo, medicación), la respuesta generada debe incluir un recordatorio visible al
  distribuidor: "Este tema toca una condición de salud — no ofrezcas el producto como tratamiento,
  sugiere consultar a un profesional."
- Nunca ocultar o eliminar ese recordatorio para "mejorar la experiencia" — es una decisión de
  producto ya cerrada, no un detalle de UX a optimizar.

## Regla 2 — Consentimiento GDPR antes de guardar cualquier dato de prospecto

- Ningún registro en la tabla de prospectos se crea sin un campo `consent_given = true` explícito.
  Esto es un constraint de base de datos (`NOT NULL`, `CHECK`), no solo una validación de frontend
  que se puede saltar.
- El consentimiento es del **prospecto**, no del distribuidor. El distribuidor confirma que lo
  obtuvo; el sistema no lo verifica de forma independiente (no hay forma técnica de hacerlo en
  Fase 0-2), pero el campo debe existir y ser obligatorio desde el primer día.
- Datos de salud mencionados por un prospecto (alergias, condiciones, medicación) son categoría
  especial bajo GDPR art. 9. Seudonimizar en cuanto sea posible: no guardar el nombre completo del
  prospecto junto al detalle de salud en la misma fila si se puede evitar; usar un identificador
  interno y separar el detalle sensible en una tabla aparte con acceso restringido.
- Retención: define un campo de fecha de consentimiento y un proceso (aunque sea manual al
  principio) para poder borrar datos de un prospecto si lo pide.

## Regla 3 — Humano siempre en el loop

- Ningún endpoint envía un mensaje directamente a un tercero (prospecto, cliente). Todo endpoint
  de generación devuelve texto a la UI del distribuidor, quien decide copiar/editar/enviar por su
  cuenta, fuera de la app.
- No construir integración de envío automático de WhatsApp/Instagram/email a un prospecto, ni
  aunque el distribuidor lo "programe" de antemano. Si en algún momento se evalúa la API oficial
  de WhatsApp Business (fase futura), sigue aplicando esta regla: la API se usaría para que el
  distribuidor envíe manualmente desde la app, no para automatizar el envío.
- Cualquier feature que se presente como "ahorra tiempo automatizando el contacto" debe rechazarse
  o reformularse como "ahorra tiempo generando el borrador, tú lo envías".

## Regla 4 — Confidencialidad de datos de red

- Un líder/Diamante puede ver métricas **agregadas** de su equipo (cuántos activos, volumen de uso)
  pero NUNCA el contenido de conversaciones o prospectos individuales de otro distribuidor sin el
  consentimiento de ese distribuidor.
- No exponer en ningún endpoint o vista datos de un distribuidor a otro distribuidor del mismo
  nivel (peer), solo relaciones jerárquicas explícitas y agregadas.

## Checklist rápido antes de dar por terminada cualquier tarea

- [ ] ¿Este endpoint genera texto que un usuario final podría leer? → revisar Regla 1.
- [ ] ¿Este endpoint o tabla toca datos de un prospecto? → revisar Regla 2.
- [ ] ¿Esta función podría, directa o indirectamente, enviar algo a un tercero sin acción humana
      explícita? → revisar Regla 3.
- [ ] ¿Esta vista expone datos de un distribuidor a otro? → revisar Regla 4.

Si la respuesta a cualquiera es "sí" o "no estoy seguro", dilo en el resumen de la tarea antes de
continuar — no asumas que está bien y sigas construyendo.
