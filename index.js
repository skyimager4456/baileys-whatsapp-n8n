const makeWASocket = require('@whiskeysockets/baileys').default;
const { useSingleFileAuthState } = require('@whiskeysockets/baileys/lib/auth-utils');
const express = require('express');
const axios = require('axios');

// Авторизация Baileys
const { state, saveState } = useSingleFileAuthState('./auth.json');

const app = express();
app.use(express.json());

async function startBot() {
  console.log('⏳ Запускаем Baileys...');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0]?.message;
    if (!msg) return;

    const text = msg.conversation || msg.extendedTextMessage?.text;
    const sender = messages[0].key.remoteJid;

    console.log('📩 Получено сообщение от', sender, ':', text);

    try {
      if (process.env.N8N_WEBHOOK_URL) {
        await axios.post(process.env.N8N_WEBHOOK_URL, { sender, text });
        console.log('✅ Сообщение отправлено в n8n');
      } else {
        console.warn('⚠️ Переменная окружения N8N_WEBHOOK_URL не задана!');
      }
    } catch (err) {
      console.error('❌ Ошибка при отправке в n8n:', err.message);
    }
  });
}

startBot();

// Запуск Express
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Express запущен на порту ${port}`);
});
