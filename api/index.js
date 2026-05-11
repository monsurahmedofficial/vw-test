// Vercel serverless entry — loads Express app from backend/
const { testConnection } = require('../backend/src/config/db');

// Initialize DB on cold start
testConnection().catch(console.error);

const app = require('../backend/src/app');
module.exports = app;
