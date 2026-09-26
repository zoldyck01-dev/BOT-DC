/**
 * =====================================================================
 *  AVENOX CLOUD — DISCORD BOT (AI-Powered, Multi-Provider)
 * =====================================================================
 *
 *  CARA GANTI AI PROVIDER (tanpa edit logic bot sama sekali):
 *  --------------------------------------------------------------
 *  1. Buka file .env
 *  2. Ubah baris: AI_PROVIDER=ollama
 *     Pilihan valid: ollama | groq | openrouter | openai | anthropic
 *  3. Isi API key yang sesuai provider itu (lihat .env.example)
 *  4. Restart bot (npm start)
 *
 *  Semua provider dipanggil lewat HTTP biasa (axios) — TIDAK perlu
 *  install SDK tambahan apapun, cukup axios yang sudah ada di package.json.
 *
 *  Kalau mau nambah provider baru (misal Gemini, DeepSeek, dll):
 *  1. Tulis fungsi baru "callNamaProvider(userMessage)" di bagian
 *     "AI PROVIDER FUNCTIONS" di bawah — ikuti pola yang sudah ada.
 *  2. Tambahkan satu baris "case" di dalam fungsi getAIResponse().
 *  3. Tambahkan env var API key-nya di .env.
 *  Selesai — tidak ada tempat lain yang perlu diubah.
 * =====================================================================
 */

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActivityType } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

// ===== CONFIG =====
const PREFIX = process.env.BOT_PREFIX || '!';
const AI_PROVIDER = (process.env.AI_PROVIDER || 'ollama').toLowerCase();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  // Partials.Channel WAJIB ada supaya event DM (Direct Message) benar-benar diterima bot.
  // Tanpa ini, intent DirectMessages tidak akan berfungsi dan bot "diam" saat di-DM.
  partials: [Partials.Channel],
});

// ===== PRODUCT DATABASE =====
const AVENOX_INFO = {
  name: 'Avenox Cloud',
  tagline: 'Cloud Hosting & Server Panel Platform',
  description: 'Solusi hosting cloud modern dengan control panel yang user-friendly untuk developers dan businesses.',
  features: [
    '🚀 High-performance servers',
    '⚡ Auto-scaling capabilities',
    '🔒 Enterprise-grade security',
    '📊 Real-time monitoring dashboard',
    '🌍 Multi-region deployment',
    '💬 24/7 support',
  ],
  pricing: {
    starter: { name: 'Starter', price: '$5/mo', specs: '1 vCPU, 1GB RAM, 20GB SSD' },
    professional: { name: 'Professional', price: '$15/mo', specs: '4 vCPU, 8GB RAM, 100GB SSD' },
    enterprise: { name: 'Enterprise', price: 'Custom', specs: 'Custom specs & dedicated support' },
  },
  faq: [
    { q: 'Apa itu Avenox Cloud?', a: 'Avenox Cloud adalah platform hosting cloud modern yang menyediakan server management dengan control panel yang intuitif.' },
    { q: 'Berapa harga Avenox Cloud?', a: 'Kami punya 3 tier: Starter ($5/mo), Professional ($15/mo), dan Enterprise (custom). Cek !pricing untuk detail.' },
    { q: 'Apakah ada free trial?', a: 'Ya! Semua plan bisa trial 7 hari tanpa perlu kartu kredit.' },
    { q: 'Berapa uptime guarantee?', a: 'Kami guarantee 99.9% uptime dengan SLA backup dan automatic failover.' },
  ],
};

// ===== LEADS STORAGE (In-Memory — reset saat bot restart) =====
const leads = [];
// Format yang dikenali untuk capture lead: "Nama | email@contoh.com"
const LEAD_CAPTURE_REGEX = /^([^|]{2,50})\|\s*([^\s@]+@[^\s@]+\.[^\s@]+)\s*$/;
// Kata kunci yang memicu bot menawarkan follow-up sales
const LEAD_TRIGGER_KEYWORDS = ['harga', 'pricing', 'mau coba', 'interested', 'tertarik', 'beli', 'subscribe'];

// ===== SYSTEM PROMPT (dipakai oleh SEMUA provider AI) =====
const SYSTEM_PROMPT = `Kamu adalah AI assistant untuk Avenox Cloud, sebuah platform cloud hosting modern.

INFORMASI PRODUK:
- Nama: ${AVENOX_INFO.name}
- Deskripsi: ${AVENOX_INFO.description}
- Features: ${AVENOX_INFO.features.join(', ')}

TUGAS KAMU:
1. Answer pertanyaan tentang Avenox Cloud dengan friendly dan profesional
2. Promote value propositions dari Avenox Cloud
3. Jika user tertarik, arahkan mereka kirim pesan format "Nama | email@contoh.com" agar dicatat sebagai lead
4. Provide technical support untuk onboarding questions
5. Suggest pricing tier yang sesuai dengan kebutuhan user

PENTING:
- Selalu response dalam bahasa yang user gunakan (Indonesian/English)
- Jangan pernah claim features yang tidak ada di atas
- Jawaban singkat dan jelas, maksimal beberapa paragraf
- Jika user tanya di luar topik Avenox Cloud, redirect dengan friendly ke produk`;

// =====================================================================
// AI PROVIDER FUNCTIONS
// Setiap fungsi menerima (userMessage) dan WAJIB return string (jawaban AI).
// Semua pakai axios murni — tidak butuh SDK tambahan.
// =====================================================================

// --- 1. OLLAMA (Local, 100% gratis, jalan di komputer sendiri) ---
async function callOllama(userMessage) {
  const url = process.env.OLLAMA_API_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'mistral';

  const response = await axios.post(`${url}/api/generate`, {
    model,
    prompt: `${SYSTEM_PROMPT}\n\nUser: ${userMessage}\n\nAssistant:`,
    stream: false,
    options: {
      temperature: 0.7, // options HARUS nested di sini, bukan di top-level (bug lama)
    },
  });

  return response.data.response.trim();
}

// --- 2. GROQ (Cloud, ada free tier generous, super cepat) ---
// Daftar API key gratis: https://console.groq.com/keys
async function callGroq(userMessage) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY belum diisi di .env');
  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 500,
    },
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  return response.data.choices[0].message.content.trim();
}

// --- 3. OPENROUTER (Cloud gateway, banyak model gratis tersedia) ---
// Daftar API key gratis: https://openrouter.ai/keys
async function callOpenRouter(userMessage) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY belum diisi di .env');
  const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
    },
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  return response.data.choices[0].message.content.trim();
}

// --- 4. OPENAI (Cloud, berbayar) ---
async function callOpenAI(userMessage) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY belum diisi di .env');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
    },
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  return response.data.choices[0].message.content.trim();
}

// --- 5. ANTHROPIC / CLAUDE (Cloud, berbayar) ---
async function callAnthropic(userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY belum diisi di .env');
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );

  return response.data.content[0].text.trim();
}

// --- ROUTER: pilih provider berdasarkan .env AI_PROVIDER ---
async function getAIResponse(userMessage) {
  switch (AI_PROVIDER) {
    case 'ollama':
      return callOllama(userMessage);
    case 'groq':
      return callGroq(userMessage);
    case 'openrouter':
      return callOpenRouter(userMessage);
    case 'openai':
      return callOpenAI(userMessage);
    case 'anthropic':
      return callAnthropic(userMessage);
    default:
      throw new Error(
        `AI_PROVIDER "${AI_PROVIDER}" tidak dikenal. Pilihan valid: ollama, groq, openrouter, openai, anthropic`
      );
  }
}

// =====================================================================
// DISCORD EVENT HANDLERS
// =====================================================================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  // 1. Command diperiksa PALING AWAL supaya tidak bentrok dengan AI chat
  //    (bug lama: DM berisi "!ping" trigger AI chat DAN command bersamaan)
  if (content.startsWith(PREFIX)) {
    await handleCommand(message, content);
    return;
  }

  // 2. Cek apakah pesan ini format capture lead: "Nama | email@contoh.com"
  const leadMatch = content.match(LEAD_CAPTURE_REGEX);
  if (leadMatch) {
    await handleLeadCapture(message, leadMatch);
    return;
  }

  // 3. AI chat: hanya jalan kalau DM atau bot di-mention
  const isDM = message.channel.isDMBased();
  const isMentioned = message.mentions.has(client.user);
  if (isDM || isMentioned) {
    await handleAIChat(message, isMentioned);
  }
});

// ===== COMMAND ROUTER =====
async function handleCommand(message, content) {
  const args = content.slice(PREFIX.length).split(/ +/);
  const command = args[0].toLowerCase();

  switch (command) {
    case 'ping':
      message.reply(`🏓 Pong! Bot online. AI provider: **${AI_PROVIDER}**`);
      break;
    case 'info':
      await sendProductInfo(message);
      break;
    case 'pricing':
      await sendPricingInfo(message);
      break;
    case 'faq':
      await sendFAQ(message);
      break;
    case 'leads':
      if (process.env.OWNER_ID && message.author.id === process.env.OWNER_ID) {
        await sendLeadsList(message);
      } else {
        message.reply('❌ Command ini hanya untuk owner bot.');
      }
      break;
    case 'help':
      await sendHelp(message);
      break;
    default:
      message.reply(`❓ Command tidak dikenali. Ketik \`${PREFIX}help\` untuk daftar command.`);
  }
}

// ===== AI CHAT HANDLER =====
async function handleAIChat(message, isMentioned) {
  const userMessage = isMentioned
    ? message.content.replace(`<@${client.user.id}>`, '').trim()
    : message.content.trim();

  if (userMessage.length < 2) return;

  await message.channel.sendTyping();

  try {
    const aiResponse = await getAIResponse(userMessage);

    // Discord limit 2000 karakter per pesan — pecah kalau lebih panjang
    if (aiResponse.length > 2000) {
      const chunks = aiResponse.match(/[\s\S]{1,1990}/g);
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } else {
      await message.reply(aiResponse);
    }

    // Tawarkan lead capture kalau user nunjukin minat
    const lower = userMessage.toLowerCase();
    if (LEAD_TRIGGER_KEYWORDS.some((kw) => lower.includes(kw))) {
      await message.reply(
        '💡 Kalau mau di-follow-up tim sales kami, kirim format:\n`Nama | email@contoh.com`'
      );
    }
  } catch (error) {
    console.error('AI Error:', error.message);
    await message.reply(
      `❌ Ada masalah saat menghubungi AI (provider: **${AI_PROVIDER}**).\n` +
        `Detail: ${error.message}\n` +
        (AI_PROVIDER === 'ollama'
          ? 'Pastikan Ollama sudah jalan (`ollama serve`) dan model sudah di-pull.'
          : 'Cek API key di file .env sudah benar dan masih aktif.')
    );
  }
}

// ===== LEAD CAPTURE HANDLER =====
async function handleLeadCapture(message, leadMatch) {
  const name = leadMatch[1].trim();
  const email = leadMatch[2].trim();

  leads.push({
    name,
    email,
    userId: message.author.id,
    username: message.author.tag,
    date: new Date().toLocaleString('id-ID'),
  });

  await message.reply(
    `✅ Terima kasih, **${name}**! Tim sales kami akan follow-up ke **${email}** secepatnya.`
  );
}

// ===== COMMAND RESPONSES =====
async function sendProductInfo(message) {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`🎯 ${AVENOX_INFO.name}`)
    .setDescription(AVENOX_INFO.description)
    .addFields(
      { name: 'Features:', value: AVENOX_INFO.features.join('\n'), inline: false },
      { name: 'Commands:', value: `\`${PREFIX}pricing\` - Lihat pricing\n\`${PREFIX}faq\` - FAQs\n\`${PREFIX}help\` - Bantuan`, inline: false }
    )
    .setFooter({ text: 'Avenox Cloud - Modern Cloud Hosting' });

  message.reply({ embeds: [embed] });
}

async function sendPricingInfo(message) {
  const pricing = AVENOX_INFO.pricing;
  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('💰 Pricing - Avenox Cloud')
    .setDescription('Pilih plan yang sesuai kebutuhan Vb')
    .addFields(
      { name: pricing.starter.name, value: `${pricing.starter.price}\n${pricing.starter.specs}`, inline: true },
      { name: pricing.professional.name, value: `${pricing.professional.price}\n${pricing.professional.specs}`, inline: true },
      { name: pricing.enterprise.name, value: `${pricing.enterprise.price}\n${pricing.enterprise.specs}`, inline: true },
      {
        name: 'Info Tambahan:',
        value: '✅ 7-hari free trial untuk semua plan\n✅ 99.9% uptime guarantee\n✅ Money-back guarantee 30 hari',
        inline: false,
      }
    )
    .setFooter({ text: 'Hubungi sales kami untuk custom plan' });

  message.reply({ embeds: [embed] });
}

async function sendFAQ(message) {
  const faqText = AVENOX_INFO.faq.map((item, i) => `**${i + 1}. ${item.q}**\n${item.a}`).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor('#ffaa00')
    .setTitle('❓ FAQ - Avenox Cloud')
    .setDescription(faqText)
    .setFooter({ text: 'Ada pertanyaan lain? Mention bot untuk tanya AI assistant kami!' });

  message.reply({ embeds: [embed] });
}

async function sendHelp(message) {
  const embed = new EmbedBuilder()
    .setColor('#9900ff')
    .setTitle('🆘 Help - Avenox Cloud Bot')
    .setDescription('Perintah yang tersedia:')
    .addFields(
      { name: '💬 AI Chat', value: `Mention bot (@${client.user.username}) atau DM untuk tanya apapun tentang Avenox Cloud` },
      { name: `${PREFIX}info`, value: 'Lihat info produk Avenox Cloud' },
      { name: `${PREFIX}pricing`, value: 'Lihat pricing dan paket yang tersedia' },
      { name: `${PREFIX}faq`, value: 'Lihat frequently asked questions' },
      { name: `${PREFIX}help`, value: 'Lihat pesan bantuan ini' },
      { name: 'Lead capture', value: 'Kirim `Nama | email@contoh.com` untuk didaftarkan ke tim sales' }
    )
    .setFooter({ text: 'Avenox Cloud - Siap membantu 24/7' });

  message.reply({ embeds: [embed] });
}

async function sendLeadsList(message) {
  if (leads.length === 0) {
    message.reply('📋 Belum ada leads yang terkumpul.');
    return;
  }

  const leadsList = leads.map((lead, i) => `${i + 1}. **${lead.name}** - ${lead.email} (${lead.date})`).join('\n');

  const embed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('📊 Leads List')
    .setDescription(leadsList.slice(0, 4000))
    .setFooter({ text: `Total: ${leads.length} leads` });

  message.reply({ embeds: [embed] });
}

// ===== STARTUP CHECKS =====
async function checkProviderReady() {
  if (AI_PROVIDER === 'ollama') {
    try {
      const url = process.env.OLLAMA_API_URL || 'http://localhost:11434';
      await axios.get(`${url}/api/tags`);
      console.log('✅ Ollama terhubung.');
      return true;
    } catch {
      console.error('❌ Ollama tidak terjangkau. Jalankan `ollama serve` dulu.');
      return false;
    }
  }

  // Untuk provider cloud, cukup pastikan API key ada
  const keyMap = {
    groq: 'GROQ_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
  };
  const requiredKey = keyMap[AI_PROVIDER];
  if (requiredKey && !process.env[requiredKey]) {
    console.error(`❌ ${requiredKey} belum diisi di .env untuk provider "${AI_PROVIDER}".`);
    return false;
  }
  console.log(`✅ Provider "${AI_PROVIDER}" siap (API key ditemukan).`);
  return true;
}

// ===== BOT READY =====
client.once('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  console.log(`🤖 AI Provider aktif: ${AI_PROVIDER}`);

  const ready = await checkProviderReady();
  client.user.setActivity(
    ready ? 'Avenox Cloud Questions' : 'Config error - cek console',
    { type: ready ? ActivityType.Listening : ActivityType.Watching }
  );
});

// ===== ERROR HANDLING GLOBAL =====
client.on('error', (err) => console.error('Discord client error:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));

// ===== LOGIN =====
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN belum diisi di .env. Bot tidak bisa start.');
  process.exit(1);
}
client.login(process.env.DISCORD_TOKEN);

module.exports = { leads, AVENOX_INFO, getAIResponse };
