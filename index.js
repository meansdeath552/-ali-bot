const express = require('express');
const { IgApiClient } = require('instagram-private-api');
const Groq = require('groq-sdk');

const app = express();
app.get('/', (req,res)=> res.send('Ali Ugur Bot FIX - Aktif 👑'));

const IG_USER = process.env.IG_USER;
const IG_PASS = process.env.IG_PASS;
const GROQ_KEY = process.env.GROQ_API_KEY;
const IZINLI = (process.env.IZINLI_KISILER || "").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);

console.log("Izinli liste:", IZINLI);
console.log("GROQ var mi:", !!GROQ_KEY);

const ig = new IgApiClient();
const groq = GROQ_KEY ? new Groq({ apiKey: GROQ_KEY }) : null;

async function aiCevap(mesaj){
  try{
    const r = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{role:"user", content: mesaj}],
      max_tokens: 250
    });
    return r.choices[0].message.content;
  }catch(e){ return "Şuan müsait değilim reis 👑"; }
}

async function startBot(){
  try{
    ig.state.generateDevice(IG_USER);
    await ig.simulate.preLoginFlow();
    const loggedUser = await ig.account.login(IG_USER, IG_PASS);
    process.nextTick(async () => await ig.simulate.postLoginFlow());
    
    console.log(`✅ GIRIS BASARILI: ${loggedUser.username}`);

    setInterval(async () => {
      try{
        const inbox = ig.feed.directInbox();
        const threads = await inbox.items();
        for(let t of threads){
          const item = t.items[0];
          if(!item || item.user_id == ig.state.cookieUserId) continue;
          let username = t.users[0]?.username || "bilinmeyen";
          console.log(`Mesaj ${username}: ${item.text}`);
          let cevap = await aiCevap(item.text || "selam");
          await ig.entity.directThread(t.thread_id).broadcastText(cevap);
        }
      }catch(err){ console.log("Loop hata:", err.message); }
    }, 15000);

  }catch(e){
    console.log("Giris hatasi:", e.message);
  }
}

app.listen(process.env.PORT || 10000, ()=> {
  console.log("Server acik 10000");
  startBot();
});
