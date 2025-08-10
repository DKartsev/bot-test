import app from './server/app';
import './bot/commands';

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
if (!TG_BOT_TOKEN) {
  throw new Error('TG_BOT_TOKEN is not set');
}

async function main() {
  await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'start', description: 'Начать' },
        { command: 'help', description: 'Справка' },
        { command: 'ticket', description: 'Создать тикет' },
      ],
    }),
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`[server] listening on ${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
