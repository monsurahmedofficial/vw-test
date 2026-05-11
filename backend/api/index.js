const { testConnection } = require('../src/config/db');
const { startReminderCron } = require('../src/services/reminderService');

// Initialize on cold start
testConnection().catch(console.error);
// Note: cron reminders won't persist on Vercel serverless.
// Use Vercel Cron Jobs (vercel.json crons) or Supabase pg_cron for production reminders.

const app = require('../src/app');
module.exports = app;
