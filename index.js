const express = require('express');
const { IgApiClient } = require('instagram-private-api');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.get('/', (req,res)=> res.send('Ali Ugur Bot Aktif 👑'));

// AYARLARI RENDER'DAN ALACAK - KODLA OYNAMANA GEREK YOK
const IG_USER = process.env.IG_USER;
const IG_PASS = process.env.IG_PASS;
const OPENAI_KEY = process.env.OPENAI_KEY;
const GEMINI_KEY = process.env.GEMINI_KEY;
const CLAUDE_KEY = process.env.CLAUDE_KEY;
const IZINLI = (process.env.IZINLI_KISILER || "").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);

console.log("Izinli liste:", IZINLI);

const ig = new IgApiClient();
const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;
const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;
const claude = CLAUDE_KEY ? new Anthropic({ apiKey: CLAUDE_KEY }) : null;

async function chatgptKisitli(mesaj){
  if(!openai) return "Ali Bey müsait olunca size dönecektir.";
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {role:"system", content: "Sen Ali Bey'in yapay zeka ajanısın. Ali Bey müsait olunca size dönecektir de. Sorulara çok kısa cevap ver, uzatma, asla araştırma yapma. Maks 1-2 cümle."},
      {role:"user", content: mesaj}
    ]
  });
  return r.choices[0].message.content;
}

async function chatgptArastir(mesaj){
  if(!openai) return "Araştırma servisi kapalı.";
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{role:"user", content: mesaj}]
  });
  return r.choices[0].message.content;
}

async function claudeDuyguAnaliz(){
  if(!claude) return "kardeslik";
  try{
    const m = await claude.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 10,
      messages: [{role:"user", content: "Gelen video için tek kelime söyle: komik, duygusal, kardeslik"}]
    });
    return m.content[0].text.toLowerCase();
  }catch(e){ return "kardeslik"; }
}

async function startBot(){
  try{
    ig.state.generateDevice(IG_USER);
    await ig.account.login(IG_USER, IG_PASS);
    console.log("✅ Instagram giriş başarılı:", IG_USER);
    
    setInterval(async () => {
      try{
        const inbox = ig.feed.directInbox();
        const threads = await inbox.items();
        for(let thread of threads){
          if(thread.is_seen) continue;
          let item = thread.items[0];
          if(!item) continue;
          let username = thread.users[0]?.username?.toLowerCase();
          let text = item.text || "";
          
          console.log(`Yeni mesaj ${username}: ${text} tip:${item.item_type}`);

          if(!IZINLI.includes(username)){
            let cevap = await chatgptKisitli(text || "selam");
            await ig.entity.directThread(thread.thread_id).broadcastText(cevap);
          } else {
            // IZINLI KISI
            if(item.item_type === "clip" || item.item_type === "media" || item.item_type === "media_share"){
              let duygu = await claudeDuyguAnaliz();
              let emoji = "👑🫡";
              if(duygu.includes("komik")) emoji = "🤣";
              else if(duygu.includes("duygusal")) emoji = "🥺";
              await ig.entity.directThread(thread.thread_id).broadcastText(emoji);
            } else if(text.toLowerCase().includes("resim") || text.toLowerCase().includes("çiz") || text.toLowerCase().includes("görsel") || text.toLowerCase().includes("inek")){
              await ig.entity.directThread(thread.thread_id).broadcastText("Tamam kral, görseli oluşturuyorum 👑 (Gemini yakında aktif)");
              // Gemini resim oluşturma için Imagen API eklenecek - su an metin olarak cevap
              if(genAI){
                // Buraya Gemini image generation eklenecek
              }
            } else {
              let cevap = await chatgptArastir(text);
              await ig.entity.directThread(thread.thread_id).broadcastText(cevap);
            }
          }
          await ig.entity.directThread(thread.thread_id).markItemSeen(item.item_id);
        }
      }catch(err){ console.error("Loop hata:", err.message); }
    }, 15000); // 15 saniyede bir kontrol

  }catch(e){
    console.error("Giriş hatası:", e.message);
  }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> {
  console.log("Web server acik port", PORT);
  startBot();
});