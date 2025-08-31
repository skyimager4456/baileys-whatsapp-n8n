const { default: makeWASocket, useSingleFileAuthState } = require("@whiskeysockets/baileys");
const express = require("express");
const axios = require("axios");
const pino = require("pino");

// Логгер
const logger = pino({ level: 'info' });

const { state, saveState } = useSingleFileAuthState('./auth.json');
const app = express();
app.use(express.json());

// Запуск бота
async function startBot() {
  logger.info("⏳ Запускаем Baileys...");

  const sock = makeWASocket({
    logger,
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg?.message) return;

    const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || '';
    const sender = msg.key.remoteJid;

    logger.info(`📩 Сообщение от ${sender}: ${text}`);

    // Отправка текста в n8n (если указан Webhook)
    try {
      if (process.env.N8N_WEBHOOK_URL) {
        await axios.post(process.env.N8N_WEBHOOK_URL, { sender, text });
        logger.info("📨 Отправлено в n8n");
      } else {
        logger.warn("⚠️ Переменная N8N_WEBHOOK_URL не указана");
      }
    } catch (e) {
      logger.error("❌ Ошибка при отправке в n8n:", e.message);
    }
  });
}

startBot();

// Express сервер для webhook и проверки работоспособности
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("✅ Baileys WhatsApp бот запущен");
});

// Пример webhook-проверки (для Meta Webhooks)
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "123leonid456"; // должен совпадать с тем, что в Meta
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info("✅ Вебхук подтверждён");
    res.status(200).send(challenge);
  } else {
    logger.warn("❌ Неверный токен вебхука");
    res.sendStatus(403);
  }
});

app.listen(port, () => {
  console.log(`🚀 Express запущен на порту ${port}`);
});
