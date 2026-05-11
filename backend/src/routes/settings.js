const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getSettings, updateSettings } = require('../controllers/settingsController');

router.get('/', authenticate, getSettings);
router.put('/', authenticate, requireAdmin, updateSettings);

module.exports = router;
