import { buildIndex } from '../src/search/semanticSearch';

async function run() {
  const count = await buildIndex();
  console.log(`Reindexed ${count} questions`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
