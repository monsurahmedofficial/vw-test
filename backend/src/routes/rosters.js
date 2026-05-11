const router = require('express').Router();
const { authenticate, requireAdminOrHR } = require('../middleware/auth');
const c = require('../controllers/rosterController');

router.get('/today',       authenticate,                    c.getTodayRoster);
router.get('/defaults',    authenticate, requireAdminOrHR,  c.getDefaults);
router.get('/',            authenticate, requireAdminOrHR,  c.getRosters);
router.post('/defaults',   authenticate, requireAdminOrHR,  c.saveDefaultPattern);
router.post('/',           authenticate, requireAdminOrHR,  c.createRoster);
router.delete('/defaults', authenticate, requireAdminOrHR,  c.deleteDefaultPattern);
router.delete('/by-user-date', authenticate, requireAdminOrHR, c.deleteByUserDate);
router.delete('/:id',     authenticate, requireAdminOrHR,  c.deleteRoster);

module.exports = router;
