---
name: token-optimization
description: Consulta este skill ANTES de construir cualquier endpoint que llame a la API de Claude o genere un prompt. El objetivo es que el coste de IA por usuario se mantenga bajo y predecible, porque los usuarios finales no son técnicos y nunca deben escribir o ajustar un prompt libre.
---

# Skill de optimización de coste — Copiloto Fuxion

## El problema que resuelve este skill

Si se deja que cada distribuidor escriba texto libre que va directo a un prompt sin control, el
coste de API por usuario se vuelve impredecible y puede comerse el margen (que en un SaaS bien
diseñado debería ser altísimo). La solución NO es pedirle al usuario que "escriba mejor" — nunca
va a pasar, no es su trabajo. La solución es que el usuario **nunca vea ni construya un prompt
libre**. Tres mecanismos, todos obligatorios desde el primer endpoint:

## Mecanismo 1 — Plantillas fijas, no prompts libres

- El usuario interactúa con campos estructurados (pegar objeción, elegir modo/producto desde un
  selector, elegir tono desde opciones predefinidas) — nunca con una caja de texto libre que diga
  "escribe tu prompt".
- El system prompt completo vive en el servidor (`lib/claude.ts` o equivalente), versionado en el
  código, no editable desde la UI ni desde variables que el usuario controle.
- Cuando se necesite variar el comportamiento (ej. distintos modos por producto), usa plantillas
  de prompt parametrizadas por el backend, no prompts distintos escritos por cada usuario.

## Mecanismo 2 — Límite de contexto por consulta

- El RAG recupera un máximo de 3–5 chunks relevantes (ver `skills/rag-ingestion/SKILL.md`), nunca
  el catálogo completo ni el corpus entero como contexto.
- No incluyas historial de conversación completo en cada llamada si no es estrictamente necesario
  — pasa solo el resumen o los últimos N turnos relevantes.
- Define y documenta un tope de `max_tokens` de salida razonable por tipo de endpoint (ej. una
  respuesta a objeción no necesita 4000 tokens de salida) en vez de dejar el default sin pensar.

## Mecanismo 3 — Límite de uso por plan (atar coste variable a ingreso variable)

- Desde el diseño del esquema de suscripciones (Fase C), cada tier tiene un número de generaciones
  por mes: ej. tier individual = X generaciones/mes, tier equipo = mayor o "ilimitado dentro de lo
  razonable" con alerta si un usuario se sale muchísimo del promedio.
- Cuando un usuario se acerca al límite, el sistema debe avisarlo con anticipación (no cortarlo de
  golpe sin aviso) — mejor experiencia y menos soporte.
- Guarda desde el día 1 el conteo de tokens/coste real por llamada (aunque sea solo para
  logging interno) — sin esto, no vas a poder validar si el pricing de cada tier realmente cubre
  el coste de API a medida que crece el uso.

## Buenas prácticas adicionales de coste

- **Cachea agresivamente lo que se repite**: si dos distribuidores preguntan por una objeción muy
  similar sobre el mismo producto, evalúa si tiene sentido cachear la respuesta base y solo
  personalizar una parte, en vez de regenerar todo desde cero cada vez (relevante a partir de
  volumen real, no crítico en Fase 0-1, pero diséñalo pensando en esto).
- **No uses el modelo más caro disponible por defecto** si un modelo más económico cumple la
  tarea igual de bien para casos simples (ej. clasificar el tipo de objeción antes de generar la
  respuesta completa puede ser una llamada más barata que una sola llamada grande que hace todo).
- **Registra fallos y reintentos**: un retry automático sin límite ante un error de la API puede
  multiplicar el coste sin que nadie se dé cuenta. Pon un máximo de reintentos explícito.

## Checklist antes de dar por terminado un endpoint que llama a Claude

- [ ] ¿El usuario final puede escribir texto que se inserta directo en el prompt sin pasar por una
      plantilla controlada por el backend?
- [ ] ¿Cuántos chunks de contexto se están pasando como máximo? ¿Está limitado explícitamente?
- [ ] ¿Hay un tope de `max_tokens` de salida definido, o se dejó el default?
- [ ] ¿Este endpoint cuenta contra algún límite de plan, o quedó "gratis e ilimitado" por omisión?
