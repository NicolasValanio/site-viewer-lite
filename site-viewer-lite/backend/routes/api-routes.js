const express = require('express');
const authenticate = require('../middleware/authenticate');
const validateProjectId = require('../middleware/validate-project-id');
const projectController = require('../controllers/project-controller');

const router = express.Router();

router.use(authenticate);
router.param('id', validateProjectId);
router.get('/health', (_request, response) => response.json({ status: 'ok' }));
router.get('/projects', projectController.listProjects);
router.get('/projects/:id', projectController.getProject);
router.get('/projects/:id/spaces', projectController.getSpaces);
router.get('/projects/:id/cloud', projectController.getCloud);
router.post('/projects/:id/issues', projectController.createIssue);

module.exports = router;
