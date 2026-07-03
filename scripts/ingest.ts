// ─────────────────────────────────────────────────────────────
// Ingestión del corpus RAG → documentos_rag (pgvector)
//
// Uso:   npm run ingest              (solo chunks nuevos)
//        npm run ingest -- --force   (re-procesa y actualiza todo)
//
// Es INCREMENTAL (skill de RAG: la ingestión no es de una sola
// vez): usa `fuente_id` como clave natural y se salta lo que ya
// existe, así una objeción nueva se añade sin re-procesar el resto.
//
// ⚠️ GATE DE NEGOCIO: el gate de Fase 0 no está confirmado, por lo
// que este script ingiere DATOS DE EJEMPLO (db/seed/datos_ejemplo.json,
// es_dato_ejemplo = true). No activar con distribuidores reales
// hasta pasar el gate. Purga: delete from documentos_rag where
// es_dato_ejemplo = true.
//
// Requiere en .env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// (la anon key NO puede escribir en documentos_rag — RLS sin
// policies a propósito) y VOYAGE_API_KEY.
// ─────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Carga .env.local sin dependencia de dotenv.
function cargarEnvLocal() {
  try {
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
  } catch {
    // Sin .env.local (ej. CI) — se asume que las vars ya están en el entorno.
  }
}
cargarEnvLocal()

// Importar DESPUÉS de cargar el entorno.
import { embeddingsDocumentos } from '../lib/embeddings'

interface ChunkSeed {
  fuente_id: string
  source_type: 'catalogo' | 'transcripcion_diamante' | 'objecion_real' | 'guion_curso'
  product_tag: 'general' | 'peso' | 'energia' | 'piel' | null
  objection_type: string | null
  titulo: string
  contenido: string
}

// El embedding se genera sobre texto + metadata relevante (skill de
// RAG: captura mejor la intención que el texto crudo solo).
function textoParaEmbedding(chunk: ChunkSeed): string {
  const partes = [
    `Título: ${chunk.titulo}`,
    `Tipo de fuente: ${chunk.source_type}`,
    chunk.product_tag ? `Línea de producto: ${chunk.product_tag}` : null,
    chunk.objection_type ? `Tipo de objeción: ${chunk.objection_type}` : null,
    chunk.contenido,
  ]
  return partes.filter(Boolean).join('\n')
}

async function main() {
  const force = process.argv.includes('--force')

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
    process.exit(1)
  }
  if (!process.env.VOYAGE_API_KEY) {
    console.error('Falta VOYAGE_API_KEY en .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const seedPath = resolve(process.cwd(), 'db/seed/datos_ejemplo.json')
  const seed = JSON.parse(readFileSync(seedPath, 'utf8')) as { chunks: ChunkSeed[] }
  console.log(`Corpus fuente: ${seed.chunks.length} chunks en ${seedPath}`)

  // Incremental: qué fuente_id ya existen.
  const { data: existentes, error: errExistentes } = await supabase
    .from('documentos_rag')
    .select('fuente_id')
  if (errExistentes) {
    console.error('Error leyendo documentos existentes:', errExistentes.message)
    process.exit(1)
  }
  const yaIngeridos = new Set((existentes ?? []).map((d) => d.fuente_id))

  const pendientes = force
    ? seed.chunks
    : seed.chunks.filter((c) => !yaIngeridos.has(c.fuente_id))

  if (pendientes.length === 0) {
    console.log('Nada nuevo que ingerir. Usa --force para re-procesar todo.')
    return
  }
  console.log(`Procesando ${pendientes.length} chunks${force ? ' (--force)' : ' nuevos'}...`)

  // Un solo batch a Voyage (corpus pequeño y curado, <200 chunks).
  const embeddings = await embeddingsDocumentos(pendientes.map(textoParaEmbedding))

  const filas = pendientes.map((chunk, i) => ({
    fuente_id: chunk.fuente_id,
    source_type: chunk.source_type,
    product_tag: chunk.product_tag,
    objection_type: chunk.objection_type,
    titulo: chunk.titulo,
    contenido: chunk.contenido,
    embedding: embeddings[i],
    es_dato_ejemplo: true, // gate de Fase 0 no confirmado
    date_captured: new Date().toISOString(),
  }))

  const { error: errUpsert } = await supabase
    .from('documentos_rag')
    .upsert(filas, { onConflict: 'fuente_id' })
  if (errUpsert) {
    console.error('Error insertando chunks:', errUpsert.message)
    process.exit(1)
  }

  console.log(`Listo: ${filas.length} chunks ingeridos/actualizados.`)
}

main().catch((err) => {
  console.error('Ingestión fallida:', err instanceof Error ? err.message : err)
  process.exit(1)
})
