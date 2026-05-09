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
    pulse: row.pulse ?? undefined,
    chronicDiseases: row.chronic_diseases ?? undefined,
    allergies: row.allergies ?? undefined,
    subscription: row.subscription ?? 'none',
    expiresAt: row.expires_at ?? undefined,
    trialUsed: Boolean(row.trial_used ?? false),
    dailyRequestCount: Number(row.daily_request_count ?? 0),
    lastRequestDate: row.last_request_date ?? new Date().toISOString().split('T')[0],
    isBlocked: Boolean(row.is_blocked ?? false),
    role: row.role ?? 'user',
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
  setIfDefined('pulse', patch.pulse);
  setIfDefined('chronic_diseases', patch.chronicDiseases);
  setIfDefined('allergies', patch.allergies);
  setIfDefined('subscription', patch.subscription);
  setIfDefined('expires_at', patch.expiresAt);
  setIfDefined('trial_used', patch.trialUsed);
  setIfDefined('daily_request_count', patch.dailyRequestCount);
  setIfDefined('last_request_date', patch.lastRequestDate);
  setIfDefined('is_blocked', patch.isBlocked);
  setIfDefined('role', patch.role);
  if (patch.createdAt !== undefined) {
    const dt = typeof patch.createdAt === 'number' ? new Date(patch.createdAt) : new Date(String(patch.createdAt));
    if (!isNaN(dt.getTime())) row.created_at = dt.toISOString();
  }
  return row;
}

function mapClinicRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    services: row.services,
    photoUrl: row.photo_url,
    description: row.description,
    workingHours: row.working_hours,
    locationUrl: row.location_url,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function mapDoctorRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    name: row.name,
    specialty: row.specialty,
    phone: row.phone,
    photoUrl: row.photo_url,
    experience: row.experience,
    education: row.education,
    bio: row.bio,
    availability: row.availability,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function mapPaymentRequestRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    userDisplayName: row.user_display_name,
    planName: row.plan_name,
    amount: row.amount,
    payerName: row.payer_name,
    screenshotBase64: row.screenshot_base64,
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).getTime() : undefined,
  };
}

function mapNotificationRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function mapMedicineLogRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    reminderId: row.reminder_id,
    medicineName: row.medicine_name,
    takenAt: row.taken_at ? new Date(row.taken_at).getTime() : Date.now(),
  };
}

function mapChatHistoryRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    expertId: row.expert_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function mapUserActivityRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    activityType: row.activity_type,
    details: row.details,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
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

  botInstance.on('message', async (msg) => {
    if (msg.text?.trim() === '/start') {
      const userId = String(msg.from?.id);
      const supabase = getSupabaseAdmin();

      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (existingUser) {
          const welcomeBackMessage = `*Sihat AI ga qaytganingizdan xursandmiz!*\n\nIlovani ochib sog'lig'ingizni kuzatishda davom eting.`;
          const appUrl = process.env.APP_URL || 'https://your-public-url.com';
          
          await botInstance!.sendMessage(msg.chat.id, welcomeBackMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: '🩺 Sihat Ai ni ochish', web_app: { url: appUrl } }]]
            }
          });
          return;
        }
      } catch (err) {
        // User not found or DB error, continue to registration
      }

      const fullName = `${msg.from?.first_name || ''} ${msg.from?.last_name || ''}`.trim() || 'Foydalanuvchi';
      const welcomeMessage = `🩺 *Sihat AI ga xush kelibsiz!*\n\nIsmingizni yozing yoki quyidagi tugmani bosing\n(hozir profilda: ${fullName}).\n\nIsmdan so'ng telefon nomeringizni so'raymiz — shundan keyin ilova ochiladi.`;
      
      const keyboard = {
        inline_keyboard: [
          [{ text: '✅ Telegramdan ismni olish', callback_data: 'get_name_from_tg' }]
        ]
      };

      try {
        await botInstance!.sendMessage(msg.chat.id, welcomeMessage, { parse_mode: 'Markdown', reply_markup: keyboard });
      } catch (err) {}
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
    const { chatId, message } = req.body;
    if (!chatId || !message || !botInstance) return res.status(400).json({ error: 'Invalid request' });
    try {
      await botInstance.sendMessage(chatId, message);
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

  // Clinics
  app.get('/api/clinics', async (_req, res) => {
    try {
      const { data, error } = await getSupabaseAdmin().from('clinics').select('*').order('name');
      if (error) throw error;
      res.json((data || []).map(mapClinicRow));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Doctors
  app.get('/api/doctors', async (req, res) => {
    try {
      const clinicId = req.query.clinicId as string;
      let query = getSupabaseAdmin().from('doctors').select('*');
      if (clinicId) query = query.eq('clinic_id', clinicId);
      const { data, error } = await query.order('name');
      if (error) throw error;
      res.json((data || []).map(mapDoctorRow));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Payment Requests
  app.post('/api/payment-requests', async (req, res) => {
    try {
      const { data, error } = await getSupabaseAdmin().from('payment_requests').insert({
        user_id: req.body.userId,
        user_display_name: req.body.userDisplayName,
        plan_name: req.body.planName,
        amount: req.body.amount,
        payer_name: req.body.payerName,
        screenshot_base64: req.body.screenshotBase64,
        status: 'pending'
      }).select('*').maybeSingle();
      if (error) throw error;
      res.json({ success: true, request: mapPaymentRequestRow(data) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Notifications
  app.get('/api/notifications', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const { data, error } = await getSupabaseAdmin().from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      res.json((data || []).map(mapNotificationRow));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Medicine Logs
  app.get('/api/medicine-logs', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const { data, error } = await getSupabaseAdmin().from('medicine_logs').select('*').eq('user_id', userId).order('taken_at', { ascending: false });
      if (error) throw error;
      res.json((data || []).map(mapMedicineLogRow));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Chat History
  app.get('/api/chat-history', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const expertId = req.query.expertId as string;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      
      let query = getSupabaseAdmin().from('chat_history').select('*').eq('user_id', userId);
      if (expertId) query = query.eq('expert_id', expertId);
      
      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw error;
      res.json((data || []).map(mapChatHistoryRow));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/chat-history', async (req, res) => {
    try {
      const { userId, expertId, role, content } = req.body;
      if (!userId || !expertId || !role || !content) return res.status(400).json({ error: 'Missing fields' });
      
      const { data, error } = await getSupabaseAdmin().from('chat_history').insert({
        user_id: userId,
        expert_id: expertId,
        role: role,
        content: content,
        created_at: new Date().toISOString()
      }).select('*').maybeSingle();
      
      if (error) throw error;
      res.json({ success: true, message: mapChatHistoryRow(data) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // System Settings
  app.get('/api/settings', async (_req, res) => {
    try {
      const { data, error } = await getSupabaseAdmin().from('system_settings').select('*').eq('id', 'global').maybeSingle();
      if (error) throw error;
      res.json(data?.data || {});
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
