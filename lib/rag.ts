// ─────────────────────────────────────────────────────────────
// Motor de recuperación (retrieval) del RAG — Fase B
//
// Reglas (skills/rag-ingestion + token-optimization):
//   - Filtra primero por product_tag si hay modo seleccionado.
//   - Máximo 4 chunks por consulta (límite explícito, tope 5 en DB).
//   - Umbral de similitud coseno (ver nota en UMBRAL_SIMILITUD):
//     por debajo, se declara contexto insuficiente en vez de
//     forzar contexto irrelevante.
//
// Solo servidor. La lectura del corpus pasa por la RPC
// buscar_documentos (security definer) — la tabla no es legible
// directo con la anon key.
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import { embeddingConsulta } from '@/lib/embeddings'
import type { ChunkRecuperado, Modo } from '@/types'

// ¿Por qué 0.30 y no el 0.7 clásico? voyage-3 en modo asimétrico
// (input_type 'query' para la consulta vs 'document' para chunks
// largos con metadata concatenada) produce similitudes coseno en un
// rango más bajo: medido con scripts/debug-retrieval.ts sobre el
// corpus de ejemplo, un match claramente correcto sale entre 0.35 y
// 0.57, y con 0.7 NADA pasaba el umbral (todo salía "sin contexto
// suficiente"). 0.30 incluye los matches correctos medidos; el ruido
// residual lo controla el tope de 4 chunks + el ranking.
// ⚠️ Re-calibrar con scripts/debug-retrieval.ts cuando se cargue el
// corpus real (Fase 0/1) — los scores cambiarán con contenido real.
const UMBRAL_SIMILITUD = 0.3
const MAX_CHUNKS = 4

export interface ResultadoRetrieval {
  chunks: ChunkRecuperado[]
  contextoSuficiente: boolean
}

export async function recuperarContexto(
  supabase: SupabaseClient,
  objecion: string,
  modo: Modo
): Promise<ResultadoRetrieval> {
  let embedding: number[]
  try {
    embedding = await embeddingConsulta(objecion)
  } catch (err) {
    // Si Voyage falla, degradamos a respuesta sin contexto (la UI
    // avisa que es más general) en vez de tumbar la generación.
    console.error(
      '[RAG] Falló el embedding de la consulta:',
      err instanceof Error ? err.message : err
    )
    return { chunks: [], contextoSuficiente: false }
  }

  const { data, error } = await supabase.rpc('buscar_documentos', {
    query_embedding: embedding,
    // 'general' no filtra: busca en todo el corpus.
    filtro_producto: modo === 'general' ? null : modo,
    umbral: UMBRAL_SIMILITUD,
    limite: MAX_CHUNKS,
  })

  if (error) {
    console.error('[RAG] Error en buscar_documentos:', error.message)
    return { chunks: [], contextoSuficiente: false }
  }

  const chunks = (data ?? []) as ChunkRecuperado[]
  return { chunks, contextoSuficiente: chunks.length > 0 }
}
