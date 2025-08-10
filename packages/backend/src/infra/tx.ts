export async function withTx<T>(db: any, fn: (trx: any)=>Promise<T>) {
  const trx = await db.transaction();
  try { const r = await fn(trx); await trx.commit(); return r; }
  catch(e){ await trx.rollback(); throw e; }
}
