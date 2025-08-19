import type { Knex } from 'knex';

export async function withTx<T>(
  db: Knex,
  fn: (trx: Knex.Transaction) => Promise<T>,
) {
  const trx = await db.transaction();
  try {
    const r = await fn(trx);
    await trx.commit();
    return r;
  } catch (e) {
    await trx.rollback();
    throw e;
  }
}
