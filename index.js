const express = require("express");
const axios = require("axios");
const { makeWASocket, useSingleFileAuthState } = require("@whiskeysockets/baileys");
const app = express();
app.use(express.json());

const VERIFY_TOKEN = "123leonid456"; // тот же, что и в Meta
const { state, saveState } = useSingleFileAuthState("./auth.json");

// ✅ Webhook GET проверка от Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✔️ Вебхук подтверждён!");
    res.status(200).send(challenge);
  } else {
    console.warn("❌ Вебхук отклонён. Неверный токен.");
    res.sendStatus(403);
  }
});

// 🔄 Обработка POST (если понадобится позже)
app.post("/webhook", (req, res) => {
  console.log("📩 Получен POST webhook:", req.body);
  res.sendStatus(200);
});

async function startBot() {
  const sock = makeWASocket({ auth: state, printQRInTerminal: true });
  sock.ev.on("creds.update", saveState);
}

startBot();

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Express запущен на порту ${port}`));
