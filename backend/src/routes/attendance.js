const router = require('express').Router();
const { authenticate, requireAdminOrHR } = require('../middleware/auth');
const c = require('../controllers/attendanceController');

router.get('/today', authenticate, c.getTodayStatus);
router.post('/checkin', authenticate, c.checkIn);
router.post('/checkout', authenticate, c.checkOut);
router.get('/board', authenticate, requireAdminOrHR, c.getAttendanceBoard);

module.exports = router;
