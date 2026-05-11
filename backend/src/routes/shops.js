const router = require('express').Router();
const { authenticate, requireAdmin, requireAdminOrHR } = require('../middleware/auth');
const c = require('../controllers/shopController');

router.get('/', authenticate, c.getShops);
router.get('/logs', authenticate, requireAdminOrHR, c.getLogs);
router.post('/', authenticate, requireAdmin, c.createShop);
router.put('/:id', authenticate, requireAdmin, c.updateShop);
router.delete('/:id', authenticate, requireAdmin, c.deleteShop);
router.post('/:id/override', authenticate, requireAdminOrHR, c.overrideShop);

module.exports = router;
