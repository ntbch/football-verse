import { Pool } from 'pg';
import { LocalTransformersEmbeddingProvider } from './embedding/local-transformers-provider';
import { buildClusteringText } from './embedding/embedding-text';

const pool = new Pool({
  connectionString: process.env.INGESTION_DB_URL || 'postgresql://football_verse:football_verse@postgres:5432/football_verse'
});

const provider = new LocalTransformersEmbeddingProvider();
const BACKEND_URL = process.env.BACKEND_URL || 'http://core-service:8080';
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'super_secure_internal_token_for_services_12345';

async function main() {
  console.log('[Recluster] Starting database vector backfill and reclustering for all raw items...');

  let processedCount = 0;
  let batchIndex = 1;

  while (true) {
    // Fetch raw items that need embeddings
    const { rows: items } = await pool.query(
      `SELECT r.id, r.connector_id, r.publisher_id, r.provider, r.identity_key, r.revision_fingerprint, 
              r.original_url, r.content_type, r.title, r.description, r.discovered_at, r.canonical_url_hash
       FROM raw_items r
       WHERE r.status = 'ACTIVE' AND r.embedding IS NULL
       ORDER BY r.id DESC LIMIT 100`
    );

    if (items.length === 0) {
      console.log(`[Recluster] All raw items processed! Total backfilled: ${processedCount}`);
      break;
    }

    console.log(`[Recluster] Batch #${batchIndex}: Processing ${items.length} raw items...`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const text = buildClusteringText({
        title: item.title,
        description: item.description,
        provider: item.provider
      } as any);
      const [vector] = await provider.embed([text]);

      const payload = {
        connectorId: item.connector_id,
        publisherId: item.publisher_id,
        provider: item.provider,
        identityKey: item.identity_key,
        revisionFingerprint: item.revision_fingerprint,
        originalUrl: item.original_url,
        contentType: item.content_type,
        title: item.title,
        description: item.description,
        discoveredAt: item.discovered_at,
        collectedAt: item.discovered_at,
        idempotencyKey: item.canonical_url_hash || 'a'.repeat(64),
        schemaVersion: 2,
        embedding: {
          model: provider.modelId,
          revision: provider.modelVersion,
          dimensions: provider.dimensions,
          vector: vector
        }
      };

      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/internal/news/raw-items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': INTERNAL_TOKEN
          },
          body: JSON.stringify(payload)
        });
        const data = (await res.json()) as any;
        processedCount++;
        if ((i + 1) % 20 === 0 || i === items.length - 1) {
          console.log(`[Recluster] Progress: ${i + 1}/${items.length} in Batch #${batchIndex} (Total: ${processedCount})`);
        }
      } catch (err) {
        console.error(`[Recluster] Item ${item.id} failed:`, (err as Error).message);
      }
    }
    batchIndex++;
  }

  await pool.end();
}

main().catch(console.error);
