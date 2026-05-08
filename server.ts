import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import TelegramBot from 'node-telegram-bot-api';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let botInstance: TelegramBot | null = null;
let supabaseAdmin: SupabaseClient | null = null;

function mapUserRowToProfile(row: any) {
  if (!row) return null;
  return {
    uid: String(row.id),
    displayName: row.display_name ?? null,
    username: row.username ?? null,
    email: row.email ?? null,
    photoURL: row.photo_url ?? null,
    phone: row.phone ?? undefined,
    gender: row.gender ?? undefined,
    age: row.age ?? undefined,
    height: row.height ?? undefined,
    weight: row.weight ?? undefined,
    bloodGroup: row.blood_group ?? undefined,
    bloodPressure: row.blood_pressure ?? undefined,
    chronicDiseases: row.chronic_diseases ?? undefined,
    allergies: row.allergies ?? undefined,
    dailyRequestCount: Number(row.daily_request_count ?? 0),
    lastRequestDate: row.last_request_date ?? new Date().toISOString().split('T')[0],
    isBlocked: Boolean(row.is_blocked ?? false),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

function mapUserPatchToRow(id: string, patch: any) {
  const row: any = { id, updated_at: new Date().toISOString() };
  const setIfDefined = (k: string, v: any) => {
    if (v !== undefined) row[k] = v;
  };
  setIfDefined('display_name', patch.displayName);
  setIfDefined('username', patch.username);
  setIfDefined('email', patch.email);
  setIfDefined('photo_url', patch.photoURL);
  setIfDefined('phone', patch.phone);
  setIfDefined('gender', patch.gender);
  setIfDefined('age', patch.age);
  setIfDefined('height', patch.height);
  setIfDefined('weight', patch.weight);
  setIfDefined('blood_group', patch.bloodGroup);
  setIfDefined('blood_pressure', patch.bloodPressure);
  setIfDefined('chronic_diseases', patch.chronicDiseases);
  setIfDefined('allergies', patch.allergies);
  setIfDefined('daily_request_count', patch.dailyRequestCount);
  setIfDefined('last_request_date', patch.lastRequestDate);
  setIfDefined('is_blocked', patch.isBlocked);
  if (patch.createdAt !== undefined) {
    const dt = typeof patch.createdAt === 'number' ? new Date(patch.createdAt) : new Date(String(patch.createdAt));
    if (!isNaN(dt.getTime())) row.created_at = dt.toISOString();
  }
  return row;
}

function mapReminderRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    medicineName: row.medicine_name,
    dosage: row.dosage,
    time: row.time,
    days: row.days,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/i, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Supabase configuration missing');
  supabaseAdmin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return supabaseAdmin;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const appUrl = process.env.APP_URL || 'https://your-public-url.com';

  app.use(cors());
  app.use(express.json({ limit: '15mb' }));

  if (botInstance) {
    botInstance.stopPolling();
    botInstance = null;
  }

  botInstance = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!);
  botInstance.setWebHook('').catch(() => {});
  botInstance.startPolling({ interval: 1000, allowed_updates: ['message', 'callback_query'] });

  // --- Admin Panel Logic ---
  const ADMIN_IDS = [process.env.ADMIN_ID || '5102555555']; // O'zingizning TG ID'ingizni .env ga qo'shing

  botInstance.on('message', async (msg) => {
    const text = msg.text?.trim();
    const chatId = msg.chat.id;
    const userId = String(msg.from?.id);

    if (text === '/admin' && ADMIN_IDS.includes(userId)) {
      const adminMenu = {
        inline_keyboard: [
          [{ text: '📊 Statistika', callback_data: 'admin_stats' }],
          [{ text: '👥 Foydalanuvchilar', callback_data: 'admin_users' }],
          [{ text: '📢 Xabar yuborish', callback_data: 'admin_broadcast' }]
        ]
      };

      return botInstance!.sendMessage(chatId, `👨‍💻 *Admin Panelga xush kelibsiz!*\n\nKerakli bo'limni tanlang:`, {
        parse_mode: 'Markdown',
        reply_markup: adminMenu
      });
    }

    if (text === '/start') {
      const chatId = msg.chat.id;
      const userId = String(msg.from?.id);
      const appUrl = process.env.APP_URL || 'https://your-public-url.com';

      try {
        const supabase = getSupabaseAdmin();
        const { data: user } = await supabase.from('users').select('phone').eq('id', userId).maybeSingle();

        if (user?.phone) {
          // Allaqachon ro'yxatdan o'tgan - FAQAT bitta xabar
          return await botInstance!.sendMessage(chatId, `*Sihat AI ga qaytganingizdan xursandmiz!*\n\nIlovani ochib sog'lig'ingizni kuzatishda davom eting.`, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: '🩺 Sihat Ai ni ochish', web_app: { url: appUrl } }]]
            }
          });
        }

        // Ro'yxatdan o'tmagan - Ro'yxatdan o'tish xabari
        const fullName = `${msg.from?.first_name || ''} ${msg.from?.last_name || ''}`.trim() || 'Foydalanuvchi';
        const welcomeMessage = `🩺 *Sihat AI ga xush kelibsiz!*\n\nIsmingizni yozing yoki quyidagi tugmani bosing\n(hozir profilda: ${fullName}).\n\nIsmdan so'ng telefon nomeringizni so'raymiz — shundan keyin ilova ochiladi.`;
        
        return botInstance!.sendMessage(chatId, welcomeMessage, { 
          parse_mode: 'Markdown', 
          reply_markup: {
            inline_keyboard: [[{ text: '✅ Telegramdan ismni olish', callback_data: 'get_name_from_tg' }]]
          } 
        });
      } catch (err) {
        console.error("Start command error:", err);
      }
    }
  });

  botInstance.on('callback_query', async (query) => {
    if (query.data === 'get_name_from_tg' && query.message) {
      const fullName = `${query.from.first_name || ''} ${query.from.last_name || ''}`.trim() || 'Foydalanuvchi';
      await botInstance!.answerCallbackQuery(query.id, { text: `Ism qabul qilindi: ${fullName}` });
      const phoneRequestMessage = `✅ *Ismingiz:* ${fullName}\n\nEndi telefon raqamingizni yuboring — sog'liq ma'lumotlaringizni saqlash uchun kerak.`;
      await botInstance!.sendMessage(query.message.chat.id, phoneRequestMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: '📱 Telefon raqamni yuborish', request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    }

    // Handle Admin Callbacks
    const userId = String(query.from.id);
    const data = query.data;

    if (data?.startsWith('admin_') && ADMIN_IDS.includes(userId)) {
      const supabase = getSupabaseAdmin();

      if (data === 'admin_stats') {
        const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: remindersCount } = await supabase.from('reminders').select('*', { count: 'exact', head: true });
        const { count: logsCount } = await supabase.from('medicine_logs').select('*', { count: 'exact', head: true });

        const statsText = 
          `📊 *BOT STATISTIKASI*\n\n` +
          `👥 Foydalanuvchilar: ${usersCount || 0}\n` +
          `⏰ Jami eslatmalar: ${remindersCount || 0}\n` +
          `💊 Ichilgan dorilar: ${logsCount || 0}`;

        return botInstance!.sendMessage(query.message!.chat.id, statsText, { parse_mode: 'Markdown' });
      }

      if (data === 'admin_users') {
        const { data: users } = await supabase.from('users').select('display_name, phone').limit(10);
        let userList = `👥 *OXIRGI 10 FOYDALANUVCHI:*\n\n`;
        users?.forEach((u, i) => {
          userList += `${i+1}. ${u.display_name} (${u.phone || 'Tel yo\'q'})\n`;
        });
        return botInstance!.sendMessage(query.message!.chat.id, userList, { parse_mode: 'Markdown' });
      }

      if (data === 'admin_broadcast') {
        return botInstance!.sendMessage(query.message!.chat.id, 
          `📢 *XABAR YUBORISH*\n\nBarcha foydalanuvchilarga xabar yuborish uchun quyidagi formatda yozing:\n\n\`/send [xabar matni]\``, 
          { parse_mode: 'Markdown' }
        );
      }
    }
  });

  // Handle Broadcast command
  botInstance.on('message', async (msg) => {
    const userId = String(msg.from?.id);
    if (msg.text?.startsWith('/send ') && ADMIN_IDS.includes(userId)) {
      const broadcastText = msg.text.replace('/send ', '').trim();
      const supabase = getSupabaseAdmin();
      const { data: users } = await supabase.from('users').select('id');

      let successCount = 0;
      if (users) {
        for (const u of users) {
          try {
            await botInstance!.sendMessage(u.id, broadcastText);
            successCount++;
          } catch (err) {}
        }
      }
      return botInstance!.sendMessage(msg.chat.id, `✅ Xabar ${successCount} ta foydalanuvchiga yuborildi!`);
    }
  });

  // Handle received contact
  botInstance.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const contact = msg.contact;
    if (!contact) return;

    const firstName = msg.from?.first_name || '';
    const lastName = msg.from?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Foydalanuvchi';
    const appUrl = process.env.APP_URL || 'https://your-public-url.com';

    try {
      // Save user data to Supabase
      const supabase = getSupabaseAdmin();
      const userId = String(msg.from?.id);
      
      await supabase.from('users').upsert({
        id: userId,
        display_name: fullName,
        phone: contact.phone_number,
        username: msg.from?.username || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      // Birinchi xabar: Tasdiqlash
      await botInstance!.sendMessage(chatId, `✅ *Rahmat, ${fullName}! Siz ro'yxatdan o'tdingiz!*`, {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true }
      });

      // Ikkinchi xabar: Xush kelibsiz va tugma
      const welcomeMessage = `*Sihat AI ga xush kelibsiz!*\n\nIlovani ochib sog'lig'ingizni kuzatishni boshlang.`;
      await botInstance!.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🩺 Sihat Ai ni ochish', web_app: { url: appUrl } }]]
        }
      });
    } catch (err) {
      // Fallback message if DB fails
      await botInstance!.sendMessage(chatId, `*Sihat AI ga xush kelibsiz!*\n\nIlovani ochib davom eting.`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🩺 Sihat Ai ni ochish', web_app: { url: appUrl } }]]
        }
      });
    }
  });

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.post('/api/send-notification', async (req, res) => {
    const { chatId, message, title } = req.body;
    if (!chatId || !message || !botInstance) return res.status(400).json({ error: 'Invalid request' });
    try {
      // 1. Send to Telegram
      await botInstance.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      
      // 2. Save to DB Notifications (for Mini App real-time)
      const supabase = getSupabaseAdmin();
      await supabase.from('notifications').insert({
        user_id: String(chatId),
        title: title || 'Yangi xabar',
        message: message.replace(/\*/g, ''), // Remove markdown for in-app
        is_read: false
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to send' });
    }
  });

  app.get('/api/users', async (_req, res) => {
    try {
      const { data, error } = await getSupabaseAdmin().from('users').select('*').order('updated_at', { ascending: false }).limit(500);
      if (error) throw error;
      res.json((data || []).map(mapUserRowToProfile));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Background Reminder Service ---
  setInterval(async () => {
    if (!botInstance) return;

    try {
      // Uzbekistan vaqtini olish (UTC+5)
      const now = new Date();
      const uzTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
      const currentTime = uzTime.getUTCHours().toString().padStart(2, '0') + ':' + 
                          uzTime.getUTCMinutes().toString().padStart(2, '0');
      
      const daysOfWeek = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
      const currentDay = daysOfWeek[uzTime.getUTCDay()];

      const supabase = getSupabaseAdmin();
      // Faol eslatmalarni va aynan shu vaqtdagilarni qidirish
      const { data: reminders, error } = await supabase
        .from('reminders')
        .select('*, users(display_name)')
        .eq('is_active', true)
        .eq('time', currentTime);

      if (error) throw error;

      if (reminders && reminders.length > 0) {
        for (const r of reminders) {
          // Kunlarni tekshirish (agar kunlar ko'rsatilgan bo'lsa)
          const reminderDays = Array.isArray(r.days) ? r.days : [];
          if (reminderDays.length > 0 && !reminderDays.includes(currentDay)) {
            continue;
          }

          const userName = r.users?.display_name || 'Foydalanuvchi';
          
          // Chiroyli formatdagi xabar (Foydalanuvchi xohlagan formatda)
           const message = 
             `🔔 *DIQQAT, DORI ICHISH VAQTI!*\n\n` +
             `Hurmatli *${userName}*, sog'lig'ingiz uchun dorilaringizni vaqtida ichishni unutmang:\n\n` +
             `*${r.medicine_name}* ni ichib oling siz uchun bu muhim\n\n` +
             `✅ Dorini ichgan bo'lsangiz, ilovada belgilab qo'yishingiz mumkin.`;

          const keyboard = {
             inline_keyboard: [
               [{ text: '🩺 Ilovani ochish', web_app: { url: process.env.APP_URL || 'https://your-public-url.com' } }]
             ]
           };
 
           botInstance.sendMessage(r.user_id, message, { 
             parse_mode: 'Markdown',
             reply_markup: keyboard
           }).catch(err => console.error(`Failed to send reminder to ${r.user_id}:`, err.message));

           // Mini App bildirishnomalar jadvaliga ham saqlash
           supabase.from('notifications').insert({
             user_id: r.user_id,
             title: 'Dori ichish vaqti!',
             message: `${r.medicine_name} ni ichib oling siz uchun bu muhim`,
             is_read: false
           }).then(({ error }) => {
             if (error) console.error('Failed to save notification to DB:', error.message);
           });
         }
       }
    } catch (err) {
      console.error('Reminder service error:', err);
    }
  }, 60000); // Har 60 soniyada tekshiradi
  // -----------------------------------

  app.get('/api/users/:id', async (req, res) => {
    try {
      const { data, error } = await getSupabaseAdmin().from('users').select('*').eq('id', req.params.id).maybeSingle();
      if (error) throw error;
      res.json(mapUserRowToProfile(data));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/users/:id', async (req, res) => {
    try {
      const payload = mapUserPatchToRow(req.params.id, req.body);
      const { data, error } = await getSupabaseAdmin().from('users').upsert(payload, { onConflict: 'id' }).select('*').maybeSingle();
      if (error) throw error;
      res.json({ success: true, user: mapUserRowToProfile(data) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/reminders', async (req, res) => {
    try {
      const userId = String(req.query.userId || '').trim();
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const { data, error } = await getSupabaseAdmin().from('reminders').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      res.json((data || []).map(mapReminderRow));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/reminders', async (req, res) => {
    try {
      const { data, error } = await getSupabaseAdmin().from('reminders').insert({
        user_id: req.body.userId,
        medicine_name: req.body.medicineName,
        dosage: req.body.dosage,
        time: req.body.time,
        days: req.body.days,
        is_active: req.body.isActive ?? true,
        created_at: new Date().toISOString(),
      }).select('*').maybeSingle();
      if (error) throw error;
      res.json({ success: true, reminder: mapReminderRow(data) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/reminders/:id', async (req, res) => {
    try {
      const { data, error } = await getSupabaseAdmin().from('reminders').update({ is_active: Boolean(req.body.isActive) }).eq('id', req.params.id).select('*').maybeSingle();
      if (error) throw error;
      res.json({ success: true, reminder: mapReminderRow(data) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/reminders/:id', async (req, res) => {
    try {
      const { error } = await getSupabaseAdmin().from('reminders').delete().eq('id', req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Notifications API ---
  app.get('/api/notifications', async (req, res) => {
    try {
      const userId = String(req.query.userId || '').trim();
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const { data, error } = await getSupabaseAdmin()
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      res.json(data || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
      const { error } = await getSupabaseAdmin()
        .from('notifications')
        .update({ is_read: true })
        .eq('id', req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Medicine Logs API ---
  app.post('/api/medicine-logs', async (req, res) => {
    try {
      const { userId, reminderId, medicineName } = req.body;
      if (!userId || !medicineName) return res.status(400).json({ error: 'userId and medicineName required' });
      
      const { data, error } = await getSupabaseAdmin()
        .from('medicine_logs')
        .insert({
          user_id: userId,
          reminder_id: reminderId || null,
          medicine_name: medicineName,
          taken_at: new Date().toISOString()
        })
        .select('*')
        .maybeSingle();

      if (error) throw error;
      res.json({ success: true, log: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*splat', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {});
}

startServer();
