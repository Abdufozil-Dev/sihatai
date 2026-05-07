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
    // accept number or string; store as timestamptz
    const dt =
      typeof patch.createdAt === 'number'
        ? new Date(patch.createdAt)
        : new Date(String(patch.createdAt));
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
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawUrl || !key) {
    throw new Error('SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY .env da yo‘q');
  }
  const url = rawUrl.replace(/\/rest\/v1\/?$/i, '');
  supabaseAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (key.startsWith('eyJ')) {
    console.warn(
      "⚠️ SUPABASE_SERVICE_ROLE_KEY eski JWT ko‘rinishda. Agar loyihada Legacy API keys o‘chirilgan bo‘lsa, Project API'dagi yangi secret key (sb_secret_...) ni qo‘ying."
    );
  }
  console.log('✅ Supabase (service role) ulandi');
  return supabaseAdmin;
}

async function startServer() {
  const app = express();
const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json({ limit: '15mb' }));

  // Cleanup old bot instance if exists
  if (botInstance) {
    console.log('⚠️ Stopping old bot instance...');
    botInstance.stopPolling();
    botInstance = null;
  }

  // Initialize Telegram Bot
  botInstance = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!);

  // Test bot connection
  botInstance.getMe().then((botInfo) => {
    console.log('✅ Bot connected:', botInfo.username);
  }).catch((err) => {
    console.error('❌ Bot connection error:', err.message);
  });

  // Start polling for bot commands
  botInstance.setWebHook('').catch((err) => console.log('WebHook clear:', err));
  botInstance.startPolling({ interval: 1000, allowed_updates: ['message'] });

  // Handle /start command
  botInstance.on('message', (msg) => {
    console.log('📩 Message received:', {
      text: msg.text,
      chatId: msg.chat.id,
      username: msg.from?.username
    });

    if (msg.text?.trim() === '/start') {
      const appUrl = process.env.APP_URL || 'https://your-public-url.com';
      console.log('📤 Sending start message with URL:', appUrl);
      
      botInstance!.sendMessage(msg.chat.id, 'Salom! Sihat AI Mini App ni ochish uchun quyidagi tugmani bosing:', {
        reply_markup: {
          inline_keyboard: [[
            { text: '🩺 Mini App Ochish', web_app: { url: appUrl } }
          ]]
        }
      }).then(() => {
        console.log('✅ Message sent successfully');
      }).catch((err) => {
        console.error('❌ Send message error:', err.message);
      });
    }
  });

  botInstance.on('polling_error', (error) => {
    if (!error.message.includes('409')) {
      console.error('⚠️ Polling error:', error.message);
    }
  });

  console.log('✅ Telegram Bot initialized and polling started');

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Send notification via Telegram Bot
  app.post('/api/send-notification', async (req, res) => {
    const { chatId, message } = req.body;
    if (!chatId || !message) return res.status(400).json({ error: 'Missing chatId or message' });

    try {
      if (!botInstance) return res.status(500).json({ error: 'Bot not initialized' });
      await botInstance.sendMessage(chatId, message);
      res.json({ success: true });
    } catch (err) {
      console.error('Telegram send error:', err);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  // Users (Supabase)
  app.get('/api/users', async (_req, res) => {
    try {
      const sb = getSupabaseAdmin();
      const { data, error } = await sb
        .from('users')
        .select('*')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) return res.status(500).json({ error: error.message });
      res.json((data || []).map(mapUserRowToProfile));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      const sb = getSupabaseAdmin();
      const id = String(req.params.id);
      const { data, error } = await sb.from('users').select('*').eq('id', id).maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      res.json(mapUserRowToProfile(data) || null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  });

  app.patch('/api/users/:id', async (req, res) => {
    try {
      const sb = getSupabaseAdmin();
      const id = String(req.params.id);
      const patch = req.body || {};
      const payload = mapUserPatchToRow(id, patch);
      if (!payload.created_at) payload.created_at = new Date().toISOString();
      const { data, error } = await sb.from('users').upsert(payload, { onConflict: 'id' }).select('*').maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true, user: mapUserRowToProfile(data) || null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  });

  // Reminders (Supabase)
  app.get('/api/reminders', async (req, res) => {
    try {
      const sb = getSupabaseAdmin();
      const userId = String(req.query.userId || '').trim();
      if (!userId) return res.status(400).json({ error: 'userId kerak' });
      const { data, error } = await sb
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      res.json((data || []).map(mapReminderRow));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/reminders', async (req, res) => {
    try {
      const sb = getSupabaseAdmin();
      const body = req.body || {};
      const payload = {
        user_id: body.userId,
        medicine_name: body.medicineName,
        dosage: body.dosage,
        time: body.time,
        days: body.days,
        is_active: body.isActive ?? true,
        created_at: new Date().toISOString(),
      };
      if (!payload.user_id || !payload.medicine_name || !payload.time) {
        return res.status(400).json({ error: 'Missing fields' });
      }
      const { data, error } = await sb.from('reminders').insert(payload).select('*').maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true, reminder: mapReminderRow(data) });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  });

  app.patch('/api/reminders/:id', async (req, res) => {
    try {
      const sb = getSupabaseAdmin();
      const id = String(req.params.id);
      const { isActive } = req.body || {};
      const { data, error } = await sb
        .from('reminders')
        .update({ is_active: Boolean(isActive) })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true, reminder: mapReminderRow(data) || null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/reminders/:id', async (req, res) => {
    try {
      const sb = getSupabaseAdmin();
      const id = String(req.params.id);
      const { error } = await sb.from('reminders').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
