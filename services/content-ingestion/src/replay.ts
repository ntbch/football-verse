import { initDbSchema, pool } from './db/pool';
import { replayFailedSpoolItems } from './spool';

async function main(): Promise<void> {
  const requested = Number.parseInt(process.argv[2] ?? '100', 10);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 10_000) : 100;
  await initDbSchema();
  const replayed = await replayFailedSpoolItems(limit);
  console.log(`[Replay] Requeued ${replayed} failed ingestion item(s)`);
  await pool.end();
}

if (require.main === module) {
  main().catch(async error => {
    console.error(`[Replay] Failed: ${String(error?.message ?? 'REPLAY_FAILED').slice(0, 120)}`);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
}
