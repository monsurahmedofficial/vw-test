const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/roleController');

router.get('/', authenticate, requireAdmin, c.listRoles);
router.post('/', authenticate, requireAdmin, c.createRole);
router.put('/:key', authenticate, requireAdmin, c.updateRole);
router.delete('/:key', authenticate, requireAdmin, c.deleteRole);

module.exports = router;
