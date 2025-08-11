import {
  TG_BOT_TOKEN,
  TG_WEBHOOK_PATH,
  TG_WEBHOOK_SECRET,
  PUBLIC_URL,
} from "../src/config/env";

const cmd = process.argv[2];

async function main() {
  if (!TG_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN missing");
  const base = `https://api.telegram.org/bot${TG_BOT_TOKEN}`;
  if (cmd === "set") {
    const url = `${PUBLIC_URL}${TG_WEBHOOK_PATH}/${TG_WEBHOOK_SECRET}`;
    const body = new URLSearchParams({
      url,
      secret_token: TG_WEBHOOK_SECRET,
    });
    await fetch(`${base}/setWebhook`, { method: "POST", body });
    console.log("set webhook", url);
  } else if (cmd === "delete") {
    const body = new URLSearchParams({ drop_pending_updates: "false" });
    await fetch(`${base}/deleteWebhook`, { method: "POST", body });
    console.log("deleted webhook");
  } else if (cmd === "get") {
    const res = await fetch(`${base}/getWebhookInfo`);
    console.log(await res.json());
  } else {
    console.log("usage: ts-node tg-webhook.ts <set|delete|get>");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
