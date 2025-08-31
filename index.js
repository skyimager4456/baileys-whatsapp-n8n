const express = require('express');
const axios = require('axios');
const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');

const app = express();
app.use(express.json());

const VERIFY_TOKEN = "123leonid456"; // токен, который указываешь в Meta
const { state, saveState } = useSingleFileAuthState('./auth.json');

console.log("⏳ Запускаем Baileys...");

async function startBot() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
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

// 📌 Обработка GET-запроса от Meta (подтверждение webhook)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook подтверждён Meta");
    res.status(200).send(challenge);
  } else {
    console.warn("❌ Неверный токен подтверждения");
    res.sendStatus(403);
  }
});

// 📌 POST-запросы от Meta (можно обрабатывать при необходимости)
app.post("/webhook", (req, res) => {
  console.log("📨 Пришёл POST-запрос от Meta:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Express запущен на порту ${PORT}`);
});
