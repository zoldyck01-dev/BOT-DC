# Avenox Cloud Discord Bot 🤖

**AI-powered Discord bot untuk Avenox Cloud** — FAQ otomatis, lead generation, dan customer support. Mendukung **5 AI provider berbeda**, tinggal ganti 1 baris di `.env`.

---

## 🎯 Features

✅ **AI Chat** — mention bot atau DM untuk tanya apapun tentang Avenox Cloud
✅ **Multi-Command** — `!info`, `!pricing`, `!faq`, `!help`, `!leads`
✅ **Lead Capture** — otomatis nangkep "Nama \| email" dari chat
✅ **Multi-AI-Provider** — Ollama, Groq, OpenRouter, OpenAI, Anthropic (tinggal switch)
✅ **Bug-free** — DM, activity status, error handling semua sudah diperbaiki

---

## 📋 Requirements

- **Node.js** v16+
- **Discord Bot Token** — https://discord.com/developers/applications
- **Salah satu** akun AI provider (lihat tabel di bawah — ada yang gratis!)

---

## ⚡ Quick Start

```bash
npm install
cp .env.example .env
# Edit .env: isi DISCORD_TOKEN, OWNER_ID, dan AI_PROVIDER + API key-nya
npm start
```

---

## 🔀 Pilihan AI Provider

Cukup ubah `AI_PROVIDER` di `.env` — **tidak perlu edit kode apapun**.

| Provider | `AI_PROVIDER=` | Biaya | Setup | Daftar API Key |
|---|---|---|---|---|
| **Ollama** | `ollama` | Gratis (lokal) | Perlu install & run di komputer sendiri | https://ollama.ai |
| **Groq** | `groq` | Gratis (limit generous) | Tinggal daftar, sangat cepat | https://console.groq.com/keys |
| **OpenRouter** | `openrouter` | Gratis (model tertentu) | Tinggal daftar, banyak pilihan model | https://openrouter.ai/keys |
| **OpenAI** | `openai` | Berbayar | Tinggal daftar | https://platform.openai.com/api-keys |
| **Anthropic** | `anthropic` | Berbayar | Tinggal daftar | https://console.anthropic.com |

**Rekomendasi:**
- Mau **paling gampang & gratis tanpa install apapun** → pakai **Groq**
- Mau **jalan 100% lokal, privat, tanpa internet** → pakai **Ollama**
- Sudah punya budget & mau kualitas terbaik → **OpenAI** atau **Anthropic**

### Cara pindah provider (contoh: dari Ollama ke Groq)

1. Daftar gratis di https://console.groq.com/keys, copy API key-nya
2. Buka `.env`, ubah:
   ```env
   AI_PROVIDER=groq
   GROQ_API_KEY=gsk_xxxxxxxxxxxxx
   ```
3. `npm start` lagi — selesai, tidak ada yang lain perlu diubah.

---

## 🛠 Setup Detail

### 1. Setup Discord Bot

1. Buka https://discord.com/developers/applications → **New Application**
2. Tab **Bot** → **Add Bot** → copy **TOKEN** → taruh di `.env` sebagai `DISCORD_TOKEN`
3. Di tab **Bot**, aktifkan **MESSAGE CONTENT INTENT** (wajib, kalau tidak bot tidak bisa baca isi pesan)
4. Tab **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Permissions: `Send Messages`, `Embed Links`, `Read Message History`, `View Channels`
   - Buka URL yang dihasilkan di browser untuk invite bot ke server

### 2. Dapatkan Discord User ID (untuk `OWNER_ID`)

Discord Settings → Advanced → aktifkan **Developer Mode** → klik kanan nama sendiri → **Copy User ID**

### 3. Pilih & setup AI provider

Lihat tabel di atas, pilih satu, isi `.env` sesuai instruksi provider itu.

### 4. Install & run

```bash
npm install
npm start
```

Bot online → status "Listening to Avenox Cloud Questions". Kalau status berubah jadi "Config error - cek console", cek terminal untuk pesan error detailnya.

---

## 💬 Cara Pakai

**AI Chat:**
```
@NamaBot Berapa harga Avenox Cloud?
```
atau DM langsung ke bot.

**Commands:**
| Command | Fungsi |
|---|---|
| `!info` | Info produk |
| `!pricing` | Daftar harga |
| `!faq` | FAQ |
| `!help` | Bantuan |
| `!leads` | Lihat leads (khusus `OWNER_ID`) |
| `!ping` | Cek bot online + provider aktif |

**Lead capture:** kirim pesan format:
```
Budi Santoso | budi@contoh.com
```
Bot otomatis catat sebagai lead.

---

## 🐞 Bug yang Sudah Diperbaiki dari Versi Sebelumnya

| Bug | Penjelasan | Fix |
|---|---|---|
| DM tidak diterima bot | Intent `DirectMessages` butuh `Partials.Channel` | Ditambahkan `partials: [Partials.Channel]` |
| `setActivity` error/invalid | `type: 'LISTENING'` (string) tidak valid di discord.js v14 | Diganti `ActivityType.Listening` (enum) |
| Command bentrok dengan AI chat di DM | Urutan pengecekan salah, command ikut dikirim ke AI | Command dicek **paling awal**, baru AI chat |
| Ollama `temperature` diabaikan | Ditaruh di top-level body, seharusnya di dalam `options` | Dipindah ke `options: { temperature }` |
| Lead collection tidak pernah capture data | Cuma nanya, tidak ada listener buat nangkep jawaban | Ditambahkan regex capture + handler |
| Import `ChannelType` tidak dipakai | Sisa kode lama | Dihapus |

---

## ➕ Menambah Provider AI Baru (misal Gemini, DeepSeek, dll)

Buka `avenox-bot.js`, bagian **AI PROVIDER FUNCTIONS**:

1. Tulis fungsi baru mengikuti pola yang ada:
   ```javascript
   async function callProviderBaru(userMessage) {
     const apiKey = process.env.PROVIDER_BARU_API_KEY;
     if (!apiKey) throw new Error('PROVIDER_BARU_API_KEY belum diisi di .env');

     const response = await axios.post('URL_API_PROVIDER', {
       // sesuaikan format body dengan dokumentasi provider tsb
     }, { headers: { Authorization: `Bearer ${apiKey}` } });

     return response.data /* sesuaikan path ke teks jawaban */;
   }
   ```
2. Tambahkan satu baris di fungsi `getAIResponse()`:
   ```javascript
   case 'providerbaru':
     return callProviderBaru(userMessage);
   ```
3. Tambahkan `PROVIDER_BARU_API_KEY=` di `.env`
4. Set `AI_PROVIDER=providerbaru`

Tidak ada tempat lain di kode yang perlu disentuh.

---

## 🛠 Customize Info Produk

Edit object `AVENOX_INFO` di `avenox-bot.js` — nama, deskripsi, fitur, harga, FAQ semua ada di satu tempat.

---

## ⚠️ Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| Bot offline di Discord | Token salah | Cek ulang `DISCORD_TOKEN` |
| Bot online tapi tidak balas | `MESSAGE CONTENT INTENT` belum aktif | Aktifkan di Developer Portal → Bot |
| "Ollama tidak terjangkau" | Ollama belum jalan | `ollama serve` di terminal terpisah |
| "GROQ_API_KEY belum diisi" | Env var kosong | Isi di `.env`, restart bot |
| Bot balas AI chat & command bersamaan | (Sudah diperbaiki di versi ini) | Pastikan pakai script versi terbaru ini |
| Leads tidak muncul di `!leads` | Bot baru restart (in-memory, reset tiap restart) | Untuk persistent storage, tambahkan database |

---

## 📝 Next Steps (opsional)

1. Tambahkan database (MongoDB/SQLite) supaya leads tidak hilang saat restart
2. Ganti command `!` jadi Discord slash command (`/`)
3. Deploy ke VPS/Railway/Replit supaya bot online 24/7
4. Integrasi webhook dengan API Avenox Cloud untuk update real-time

---

**Built for Avenox Cloud | BIL CLOUD**
