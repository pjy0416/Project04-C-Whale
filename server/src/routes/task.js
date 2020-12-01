const router = require('express').Router();
const taskController = require('@controllers/task');

router.get('/:taskId', taskController.getTaskById);
router.patch('/:taskId', taskController.updateTask);
router.delete('/:taskId', taskController.deleteTask);

router.get('/:taskId/comment', taskController.getComments);
router.post('/:taskId/comment', taskController.createComment);
router.put('/:taskId/comment/:commentId', taskController.updateComment);
router.delete('/:taskId/comment/:commentId', taskController.deleteComment);

module.exports = router;
