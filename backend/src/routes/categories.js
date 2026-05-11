const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/categoryController');

router.get('/', authenticate, c.getCategories);
router.post('/', authenticate, requireAdmin, c.createCategory);
router.put('/:id', authenticate, requireAdmin, c.updateCategory);
router.delete('/:id', authenticate, requireAdmin, c.deleteCategory);

module.exports = router;
