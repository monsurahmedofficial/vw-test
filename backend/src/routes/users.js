const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { listUsers, createUser, updateUser, getUserStats } = require('../controllers/userController');

router.get('/', authenticate, requireAdmin, listUsers);
router.post('/', authenticate, requireAdmin, createUser);
router.put('/:id', authenticate, requireAdmin, updateUser);
router.get('/:id/stats', authenticate, requireAdmin, getUserStats);

module.exports = router;
