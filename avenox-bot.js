const { Client, GatewayIntentBits, ChannelType, EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Ollama Configuration
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral'; // lightweight & fast

// Test Ollama connection on startup
async function testOllamaConnection() {
  try {
    const response = await axios.get(`${OLLAMA_API_URL}/api/tags`);
    console.log('✅ Ollama connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Ollama connection failed. Make sure Ollama is running!');
    console.error('   Run: ollama serve');
    return false;
  }
}

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
    {
      q: 'Apa itu Avenox Cloud?',
      a: 'Avenox Cloud adalah platform hosting cloud modern yang menyediakan server management dengan control panel yang intuitif.',
    },
    {
      q: 'Berapa harga Avenox Cloud?',
      a: 'Kami punya 3 tier: Starter ($5/mo), Professional ($15/mo), dan Enterprise (custom). Cek pricing untuk detail.',
    },
    {
      q: 'Apakah ada free trial?',
      a: 'Ya! Semua plan bisa trial 7 hari tanpa perlu kartu kredit.',
    },
    {
      q: 'Berapa uptime guarantee?',
      a: 'Kami guarantee 99.9% uptime dengan SLA backup dan automatic failover.',
    },
  ],
};

// ===== LEADS STORAGE (In-Memory) =====
const leads = [];

// ===== AI CONTEXT =====
const SYSTEM_PROMPT = `Kamu adalah AI assistant untuk Avenox Cloud, sebuah platform cloud hosting modern.

INFORMASI PRODUK:
- Nama: ${AVENOX_INFO.name}
- Deskripsi: ${AVENOX_INFO.description}
- Features: ${AVENOX_INFO.features.join(', ')}

TUGAS KAMU:
1. Answer pertanyaan tentang Avenox Cloud dengan friendly dan profesional
2. Promote value propositions dari Avenox Cloud
3. Collect lead info jika user tertarik (nama, email, kebutuhan)
4. Provide technical support untuk onboarding questions
5. Suggest pricing tier yang sesuai dengan kebutuhan user

PENTING:
- Selalu response dalam bahasa yang user gunakan (Indonesian/English)
- Jangan pernah claim features yang tidak ada di AVENOX_INFO
- Jika user tanya tentang hal di luar scope Avenox Cloud, redirect dengan friendly ke produk
- Encourage users untuk subscribe atau contact sales`;

// ===== BOT COMMANDS =====
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Channel-based atau DM
  if (message.channel.isDMBased()) {
    // Direct message handling
    await handleAIChat(message);
  } else if (message.mentions.has(client.user)) {
    // Mention di channel
    await handleAIChat(message);
  }

  // Commands
  if (message.content.startsWith('!')) {
    const args = message.content.slice(1).split(/ +/);
    const command = args[0].toLowerCase();

    switch (command) {
      case 'ping':
        message.reply('🏓 Pong! Bot is online.');
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
        if (message.author.id === process.env.OWNER_ID) {
          await sendLeadsList(message);
        } else {
          message.reply('❌ Unauthorized.');
        }
        break;

      case 'help':
        await sendHelp(message);
        break;

      default:
        message.reply(
          '❓ Command tidak dikenali. Ketik `!help` untuk melihat daftar command.'
        );
    }
  }
});

// ===== AI CHAT HANDLER =====
async function handleAIChat(message) {
  if (message.content.length < 3) return;

  // Show typing indicator
  await message.channel.sendTyping();

  try {
    const userMessage = message.mentions.has(client.user)
      ? message.content.replace(`<@${client.user.id}>`, '').trim()
      : message.content;

    if (!userMessage) return;

    // Call Ollama API
    const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: `${SYSTEM_PROMPT}\n\nUser: ${userMessage}\n\nAssistant:`,
      stream: false,
      temperature: 0.7,
    });

    const aiResponse = response.data.response.trim();

    // Split long messages
    if (aiResponse.length > 2000) {
      const chunks = aiResponse.match(/[\s\S]{1,1990}/g);
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } else {
      await message.reply(aiResponse);
    }

    // Check if user might be a lead
    if (
      userMessage.toLowerCase().includes('harga') ||
      userMessage.toLowerCase().includes('pricing') ||
      userMessage.toLowerCase().includes('mau coba') ||
      userMessage.toLowerCase().includes('interested')
    ) {
      // Prompt for lead info
      const followUp = await message.reply(
        '💡 Kelihatannya Vb tertarik! Bisa kasih tau nama & email untuk follow-up dari tim sales kami? (Format: `Nama | email@example.com`)'
      );
    }
  } catch (error) {
    console.error('AI Error:', error);
    message.reply(
      '❌ Ada error saat process chat. Make sure Ollama is running! (Error: ' +
        error.message +
        ')'
    );
  }
}

// ===== COMMAND RESPONSES =====
async function sendProductInfo(message) {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`🎯 ${AVENOX_INFO.name}`)
    .setDescription(AVENOX_INFO.description)
    .addFields(
      {
        name: 'Features:',
        value: AVENOX_INFO.features.join('\n'),
        inline: false,
      },
      {
        name: 'Commands:',
        value: '`!pricing` - Lihat pricing\n`!faq` - FAQs\n`!help` - Bantuan',
        inline: false,
      }
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
      {
        name: pricing.starter.name,
        value: `${pricing.starter.price}\n${pricing.starter.specs}`,
        inline: true,
      },
      {
        name: pricing.professional.name,
        value: `${pricing.professional.price}\n${pricing.professional.specs}`,
        inline: true,
      },
      {
        name: pricing.enterprise.name,
        value: `${pricing.enterprise.price}\n${pricing.enterprise.specs}`,
        inline: true,
      },
      {
        name: 'Info Tambahan:',
        value:
          '✅ 7-hari free trial untuk semua plan\n✅ 99.9% uptime guarantee\n✅ Money-back guarantee 30 hari',
        inline: false,
      }
    )
    .setFooter({ text: 'Hubungi sales kami untuk custom plan' });

  message.reply({ embeds: [embed] });
}

async function sendFAQ(message) {
  const faqText = AVENOX_INFO.faq
    .map((item, i) => `**${i + 1}. ${item.q}**\n${item.a}`)
    .join('\n\n');

  const embed = new EmbedBuilder()
    .setColor('#ffaa00')
    .setTitle('❓ FAQ - Avenox Cloud')
    .setDescription(faqText)
    .setFooter({ text: 'Ada pertanyaan lain? Tanya ke AI assistant kami!' });

  message.reply({ embeds: [embed] });
}

async function sendHelp(message) {
  const embed = new EmbedBuilder()
    .setColor('#9900ff')
    .setTitle('🆘 Help - Avenox Cloud Bot')
    .setDescription('Perintah yang tersedia:')
    .addFields(
      {
        name: '💬 AI Chat',
        value: 'Mention bot (`@Avenox Bot`) atau DM untuk tanya apapun tentang Avenox Cloud',
      },
      {
        name: '!info',
        value: 'Lihat info produk Avenox Cloud',
      },
      {
        name: '!pricing',
        value: 'Lihat pricing dan paket yang tersedia',
      },
      {
        name: '!faq',
        value: 'Lihat frequently asked questions',
      },
      {
        name: '!help',
        value: 'Lihat pesan bantuan ini',
      }
    )
    .setFooter({ text: 'Avenox Cloud - Siap membantu 24/7' });

  message.reply({ embeds: [embed] });
}

async function sendLeadsList(message) {
  if (leads.length === 0) {
    message.reply('📋 Belum ada leads yang terkumpul.');
    return;
  }

  const leadsList = leads
    .map((lead, i) => `${i + 1}. **${lead.name}** - ${lead.email} (${lead.date})`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('📊 Leads List')
    .setDescription(leadsList)
    .setFooter({ text: `Total: ${leads.length} leads` });

  message.reply({ embeds: [embed] });
}

// ===== BOT READY =====
client.once('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  console.log(`🤖 Using model: ${OLLAMA_MODEL}`);
  
  // Test Ollama connection
  const ollamaOk = await testOllamaConnection();
  
  if (ollamaOk) {
    client.user.setActivity('Avenox Cloud Questions', { type: 'LISTENING' });
  } else {
    client.user.setActivity('Waiting for Ollama...', { type: 'WATCHING' });
  }
});

// ===== LOGIN =====
client.login(process.env.DISCORD_TOKEN);

module.exports = { leads, AVENOX_INFO };
