import os
import time
from 【entity-instagrapi¦canonical_name=Instagram】 import Client
from groq import Groq
from flask import Flask

# Render ayakta kalsin diye
app = Flask(__name__)
@app.route('/')
def home():
    return "Ali Bot Python Aktif 👑"

# ENV OKUMA - ARTIK DUZGUN
IG_USER = os.getenv("IG_USER")
IG_PASS = os.getenv("IG_PASS")
GROQ_KEY = os.getenv("GROQ_A") or os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API")
RAW_IZINLI = os.getenv("IZINLI_KISILER") or ""

print(f"=== BOT BASLIYOR ===")
print(f"IG_USER: {IG_USER}")
print(f"GROQ var mi: {bool(GROQ_KEY)}")
print(f"IZINLI HAM: {RAW_IZINLI}")

izinli_liste = [x.strip().lower() for x in RAW_IZINLI.split(",") if x.strip()]
print(f"Izinli liste duzeltilmis: {izinli_liste}")

# Groq
groq_client = Groq(api_key=GROQ_KEY) if GROQ_KEY else None

def ai_cevap(mesaj):
    try:
        if not groq_client:
            return "Ali Bey suan mesgul reis 👑"
        chat = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": mesaj}],
            max_tokens=250
        )
        return chat.choices[0].message.content
    except Exception as e:
        print(f"Groq hata: {e}")
        return "Bir hata oldu reis"

# 【entity-Instagram¦canonical_name=Instagram】 Giris
cl = Client()
try:
    print("【entity-Instagram¦canonical_name=Instagram】 giris deneniyor...")
    cl.login(IG_USER, IG_PASS)
    print(f"✅✅✅ GIRIS BASARILI: {cl.account_info().username}")
except Exception as e:
    print(f"❌ GIRIS HATASI: {e}")
    print("Eger 2FA hatasi verirse, IG hesabinda 2FA kapat reis!")

# Mesajlari dinle
def botu_baslat():
    gorulenler = set()
    while True:
        try:
            threads = cl.direct_threads(20)
            for thread in threads:
                if not thread.messages:
                    continue
                last_msg = thread.messages[0]
                # Kendi mesajimizi gorme
                if last_msg.user_id == cl.user_id:
                    continue
                # Daha once cevap verdigimizi gorme
                if last_msg.id in gorulenler:
                    continue
                
                username = cl.user_info(last_msg.user_id).username
                text = last_msg.text or "selam"
                print(f"Mesaj geldi {username}: {text}")
                
                cevap = ai_cevap(text)
                print(f"Cevap: {cevap}")
                
                cl.direct_send(cevap, thread_ids=[thread.id])
                gorulenler.add(last_msg.id)
                
        except Exception as e:
            print(f"Loop hata: {e}")
        time.sleep(10)

# Render icin
if __name__ == "__main__":
    import threading
    threading.Thread(target=botu_baslat, daemon=True).start()
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
