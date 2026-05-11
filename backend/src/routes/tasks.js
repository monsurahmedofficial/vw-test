const router = require('express').Router();
const upload = require('../middleware/upload');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getTasks, getTask, createTask, updateTaskStatus,
  addUpdate, deleteTask, getDashboardStats
} = require('../controllers/taskController');

router.get('/stats/dashboard', authenticate, requireAdmin, getDashboardStats);
router.get('/', authenticate, getTasks);
router.get('/:id', authenticate, getTask);
router.post('/', authenticate, requireAdmin, createTask);
router.patch('/:id/status', authenticate, upload.single('proof'), updateTaskStatus);
router.post('/:id/updates', authenticate, upload.single('proof'), addUpdate);
router.delete('/:id', authenticate, requireAdmin, deleteTask);

module.exports = router;
