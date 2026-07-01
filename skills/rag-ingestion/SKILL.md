---
name: rag-ingestion
description: Consulta este skill cuando construyas o modifiques el pipeline de ingestión de documentos (catálogo, transcripciones, objeciones) hacia pgvector, o cuando ajustes la lógica de recuperación (retrieval) del RAG.
---

# Skill de ingestión RAG — Copiloto Fuxion

## Principio general

El RAG de este proyecto NO es "meter 100 libros de ventas". Claude ya conoce Cialdini, SPIN,
Challenger Sale, Cardone de su entrenamiento general — no hace falta ingestarlos. El RAG existe
para aportar lo que el modelo NO tiene de fábrica: el catálogo real de Fuxion, transcripciones de
capacitaciones de Diamantes de la red de Alejandro, y objeciones reales capturadas de
distribuidores reales. Es un RAG pequeño y curado (50-200 páginas), no uno masivo.

## Chunking

- Trocea por **unidad de sentido**, no por conteo fijo de caracteres: una objeción completa
  (pregunta + respuesta), un producto completo (nombre + descripción + ingredientes + precio), un
  segmento coherente de una transcripción — no cortes a la mitad de una idea.
- Rango objetivo: 300–800 palabras por chunk. Si una unidad de sentido natural es más larga,
  está bien que el chunk sea más largo; no fragmentes artificialmente para cumplir el rango.
- Cada chunk lleva metadata obligatoria:
  - `source_type`: `catalogo` | `transcripcion_diamante` | `objecion_real` | `guion_curso`
  - `product_tag`: a qué producto o línea de producto aplica (si aplica) — usar los modos ya
    definidos: control de peso, energía/deporte, piel, u otro.
  - `objection_type`: si es una objeción, clasificar (precio, tiempo, escepticismo, "ya lo probé y
    no funcionó", salud/seguridad, otro).
  - `date_captured`: cuándo se agregó — importante para poder purgar contenido desactualizado si
    Fuxion cambia catálogo o plan de compensación.

## Embeddings

- Usa Voyage AI (ya elegido, compatible con Claude) vía `lib/embeddings.ts`. Es el único archivo
  que debería saber qué proveedor de embeddings se usa — si se cambia de proveedor, solo se toca
  ahí.
- Genera el embedding del chunk completo (texto + metadata relevante concatenada como contexto),
  no solo del texto crudo, para que la búsqueda capture mejor la intención.

## Retrieval (recuperación)

- Al buscar, siempre filtra primero por `product_tag` si el usuario seleccionó un modo/producto en
  la UI — no hagas búsqueda vectorial pura sobre todo el corpus si hay un filtro obvio disponible.
  Esto además baja el coste de tokens (menos contexto irrelevante pasado al modelo).
- Recupera un máximo de 3–5 chunks por consulta salvo que se te pida explícitamente más — ver
  `skills/token-optimization/SKILL.md` para el porqué.
- Si la búsqueda no encuentra chunks con similitud suficiente (define un umbral, ej. coseno > 0.7),
  el sistema debe decirlo explícitamente en vez de forzar una respuesta con contexto irrelevante:
  "No tengo información específica sobre esto en la base — aquí va una respuesta general, revísala
  con más cuidado antes de usarla."

## Ingestión continua (no es un proceso de una sola vez)

- Cada objeción nueva capturada en Fase 0/1 (vía el flujo manual o el CRM) debe poder añadirse al
  corpus sin re-procesar todo lo demás — diseña el script de ingestión (`scripts/ingest.ts`) para
  que funcione de forma incremental, no solo como carga masiva inicial.
- Cuando el catálogo de Fuxion cambie (nuevo producto, precio actualizado), el chunk viejo debe
  poder marcarse como obsoleto (no necesariamente borrarse — puede servir de histórico) y
  reemplazarse por uno nuevo con `date_captured` actualizado.

## Qué NO hacer

- No ingestar documentos completos de terceros con copyright (libros, manuales no oficiales) — ver
  la Sección 2.3 del plan de negocio: es un problema legal y no aporta valor que el modelo no
  tenga ya.
- No mezclar en un mismo chunk contenido de fuentes distintas (ej. un fragmento de catálogo con un
  fragmento de transcripción) — dificulta la trazabilidad y el filtrado.
