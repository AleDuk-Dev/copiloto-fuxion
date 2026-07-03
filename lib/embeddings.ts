// ─────────────────────────────────────────────────────────────
// Embeddings — Voyage AI
//
// ÚNICO archivo que sabe qué proveedor de embeddings se usa
// (ver skills/rag-ingestion/SKILL.md). Si se cambia de proveedor,
// solo se toca esto y la dimensión del vector en el schema.
//
// Solo se importa desde el servidor (API routes / scripts).
// ─────────────────────────────────────────────────────────────

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-3'

// Debe coincidir con vector(1024) en db/schema_fase_b.sql.
export const EMBEDDING_DIM = 1024

// Máximo de reintentos explícito — un retry sin límite multiplica
// el coste sin que nadie se dé cuenta (skill de optimización).
const MAX_REINTENTOS = 2

type TipoInput = 'query' | 'document'

async function llamarVoyage(textos: string[], tipo: TipoInput): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) {
    throw new Error('Falta la variable de entorno VOYAGE_API_KEY')
  }

  let ultimoError: Error | null = null

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    try {
      const res = await fetch(VOYAGE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: textos,
          model: VOYAGE_MODEL,
          input_type: tipo,
        }),
      })

      if (!res.ok) {
        // 4xx (salvo 429) no se reintenta — es un error de la petición.
        const cuerpo = await res.text()
        const err = new Error(`Voyage AI respondió ${res.status}: ${cuerpo.slice(0, 200)}`)
        if (res.status >= 400 && res.status < 500 && res.status !== 429) throw err
        ultimoError = err
        continue
      }

      const data = (await res.json()) as {
        data: { embedding: number[]; index: number }[]
      }

      // Voyage devuelve en orden, pero ordenamos por index por seguridad.
      return data.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding)
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Voyage AI respondió 4')) throw err
      ultimoError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw ultimoError ?? new Error('Voyage AI no respondió')
}

/** Embedding de una consulta del usuario (retrieval). */
export async function embeddingConsulta(texto: string): Promise<number[]> {
  const [embedding] = await llamarVoyage([texto], 'query')
  return embedding
}

/** Embeddings de chunks del corpus (ingestión, en batch). */
export async function embeddingsDocumentos(textos: string[]): Promise<number[][]> {
  return llamarVoyage(textos, 'document')
}
