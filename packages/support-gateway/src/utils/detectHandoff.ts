export function detectHandoff(text: string): boolean {
  const keys = ['оператор','человек','поддержка','сотрудник','менеджер','связаться','живой','operator','human','support','agent'];
  const t = (text || '').toLowerCase();
  return keys.some(k => t.includes(k)) || /^\/(help|operator)\b/i.test(t);
}
