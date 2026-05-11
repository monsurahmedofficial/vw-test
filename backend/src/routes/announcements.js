const router = require('express').Router();
const { authenticate, requireAdminOrHR } = require('../middleware/auth');
const c = require('../controllers/announcementController');

router.get('/', authenticate, c.getAnnouncements);
router.post('/', authenticate, requireAdminOrHR, c.createAnnouncement);
router.put('/:id', authenticate, requireAdminOrHR, c.updateAnnouncement);
router.delete('/:id', authenticate, requireAdminOrHR, c.deleteAnnouncement);
router.post('/:id/acknowledge', authenticate, c.acknowledge);
router.get('/:id/status', authenticate, requireAdminOrHR, c.getAckStatus);

module.exports = router;
