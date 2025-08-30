const { useSingleFileAuthState, makeWASocket, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const express = require("express");
const axios = require("axios");
const P = require("pino");

const app = express();
app.use(express.json());

const { state, saveState } = useSingleFileAuthState("./auth.json");

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveState);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    const msg = messages[0];
    if (!msg.message) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    const sender = msg.key.remoteJid;

    console.log("📩 Получено сообщение:", sender, text);

    try {
      if (process.env.N8N_WEBHOOK_URL) {
        await axios.post(process.env.N8N_WEBHOOK_URL, { sender, text });
        console.log("✅ Отправлено в n8n");
      } else {
        console.warn("⚠️ Переменная окружения N8N_WEBHOOK_URL не задана");
      }
    } catch (err) {
      console.error("❌ Ошибка отправки в n8n:", err.message);
    }
  });
}

startBot();

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Express сервер запущен на порту ${port}`));
