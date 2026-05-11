const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { listTemplates, createTemplate, updateTemplate, deleteTemplate } = require('../controllers/templateController');

router.get('/', authenticate, listTemplates);
router.post('/', authenticate, requireAdmin, createTemplate);
router.put('/:id', authenticate, requireAdmin, updateTemplate);
router.delete('/:id', authenticate, requireAdmin, deleteTemplate);

module.exports = router;
