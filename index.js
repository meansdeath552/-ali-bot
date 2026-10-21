const express = require('express');
const { IgApiClient } = require('instagram-private-api');
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.get('/', (req,res)=> res.send('Ali Ugur Bot Aktif 👑'));

const IG_USER = process.env.IG_USER;
const IG_PASS = process.env.IG_PASS;
const GROQ_KEY = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const IZINLI = (process.env.IZINLI_KISILER || "").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);

console.log("Izinli liste:", IZINLI);
console.log("GROQ var mi:", !!GROQ_KEY);

const ig = new IgApiClient();
const groq = GROQ_KEY ? new Groq({ apiKey: GROQ_KEY }) : null;
const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;

async function groqCevap(mesaj, kisitliMi){
  if(!groq) return "Ali Bey müsait olunca dönecektir reis.";
  try{
    const prompt = kisitliMi 
      ? "Sen Ali Bey'in ajanisin. Kisa cevap ver, 1 cumle."
      : "Sen Ali Uğur'un kankasisin. Reis diye hitap et. Kisa, samimi, komik cevap ver. Gaziantep agzi kullan.";
    const r = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {role:"system", content: prompt},
        {role:"user", content: mesaj}
      ],
      max_tokens: 300
    });
    return r.choices[0].message.content;
  }catch(e){
    console.error("GROQ hata:", e.message);
    return "Beynim yandi reis, birazdan yaz 👑";
  }
}

async function startBot(){
  try{
    ig.state.generateDevice(IG_USER);
    await ig.account.login(IG_USER, IG_PASS);
    console.log("✅ Giris basarili:", IG_USER);
    setInterval(async () => {
      try{
        const inbox = ig.feed.directInbox();
        const threads = await inbox.items();
        for(let thread of threads){
          const lastItem = thread.items[0];
          if(!lastItem) continue;
          if(lastItem.user_id == ig.state.cookieUserId) continue;
          let username = thread.users[0]?.username?.toLowerCase();
          let text = lastItem.text || "selam";
          console.log(`Mesaj ${username}: ${text}`);
          let cevap = "";
          if(!IZINLI.includes(username)){
            cevap = await groqCevap(text, true);
          } else {
            cevap = await groqCevap(text, false);
          }
          await ig.entity.directThread(thread.thread_id).broadcastText(cevap);
          await ig.entity.directThread(thread.thread_id).markItemSeen(lastItem.item_id);
        }
      }catch(err){ console.log("Loop hata:", err.message); }
    }, 10000);
  }catch(e){ console.log("Giris hatasi:", e.message); }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> {
  console.log("Server acik", PORT);
  startBot();
});
