// Herramienta de calibración del retrieval — llama a la RPC
// buscar_documentos directo, con umbral 0, para ver los scores
// reales de similitud de cada consulta contra todo el corpus.
// Uso: npx tsx scripts/debug-retrieval.ts
//
// Se mantiene en el repo a propósito: sirve para re-calibrar
// UMBRAL_SIMILITUD (lib/rag.ts) cuando se cargue el corpus real
// en Fase 0/1. Contexto: con voyage-3 asimétrico (query corta vs
// document largo) los matches correctos del corpus de ejemplo
// midieron 0.35–0.57 — por eso el umbral es 0.30 y no 0.7. Edita
// CONSULTAS abajo con casos representativos del corpus nuevo.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function cargarEnvLocal() {
  const contenido = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  for (const linea of contenido.split('\n')) {
    const limpia = linea.trim()
    if (!limpia || limpia.startsWith('#')) continue
    const igual = limpia.indexOf('=')
    if (igual === -1) continue
    const clave = limpia.slice(0, igual).trim()
    const valor = limpia.slice(igual + 1).trim()
    if (!(clave in process.env)) process.env[clave] = valor
  }
}
cargarEnvLocal()

import { embeddingConsulta } from '../lib/embeddings'

const CONSULTAS = [
  { texto: 'me parece muy caro', esperado: 'ejemplo-objecion-precio-caro' },
  { texto: 'tengo diabetes, ¿esto es seguro?', esperado: 'ejemplo-objecion-salud-seguridad' },
]

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Estado del corpus
  const { data: docs, error: errDocs } = await supabase
    .from('documentos_rag')
    .select('fuente_id, product_tag, obsoleto')
    .order('fuente_id')
  if (errDocs) throw new Error(`Leyendo corpus: ${errDocs.message}`)
  const conEmbedding = await supabase
    .from('documentos_rag')
    .select('fuente_id')
    .not('embedding', 'is', null)
  console.log(`Corpus: ${docs?.length} chunks, ${conEmbedding.data?.length} con embedding\n`)

  for (const consulta of CONSULTAS) {
    console.log(`── Consulta: "${consulta.texto}" (esperado: ${consulta.esperado})`)
    const embedding = await embeddingConsulta(consulta.texto)
    console.log(`   Embedding consulta: dim=${embedding.length}`)

    // Umbral 0 y sin filtro de producto: ver TODOS los scores.
    const { data, error } = await supabase.rpc('buscar_documentos', {
      query_embedding: embedding,
      filtro_producto: null,
      umbral: 0,
      limite: 5,
    })
    if (error) {
      console.log(`   ERROR en RPC: ${error.message}`)
      continue
    }
    if (!data || data.length === 0) {
      console.log('   RPC devolvió 0 filas incluso con umbral 0')
      continue
    }
    for (const fila of data) {
      console.log(
        `   similitud=${Number(fila.similitud).toFixed(4)}  ${fila.titulo ?? fila.id} (tag=${fila.product_tag})`
      )
    }
  }
}

main().catch((err) => {
  console.error('Fallo:', err instanceof Error ? err.message : err)
  process.exit(1)
})
