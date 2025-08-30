const makeWASocket = require("@whiskeysockets/baileys").default;
const { useSingleFileAuthState } = require("@whiskeysockets/baileys");
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const { state, saveState } = useSingleFileAuthState("./auth.json");

async function startBot() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveState);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    const msg = messages[0]?.message;
    if (!msg) return;

    const text = msg.conversation || msg.extendedTextMessage?.text;
    const sender = messages[0].key.remoteJid;

    console.log("📩 Сообщение от", sender, ":", text);

    try {
      if (process.env.N8N_WEBHOOK_URL) {
        await axios.post(process.env.N8N_WEBHOOK_URL, { sender, text });
        console.log("📨 Отправлено в n8n");
      } else {
        console.warn("⚠️ N8N_WEBHOOK_URL не задан!");
      }
    } catch (e) {
      console.error("❌ Ошибка отправки в n8n:", e.message);
    }
  });
}

startBot();

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Express запущен на порту ${port}`));

