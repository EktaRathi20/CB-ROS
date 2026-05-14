import { Router } from 'express';
import {
  DiscoveryController,
  ExperimentController,
  DemoController,
  ProjectController,
  ReactionController,
  AuditController,
  UserController,
  CompanyController,
  InboxController,
  DashboardController,
} from '../controllers/api.controller.js';

const router = Router();

// Login picker (mock multi-tenant)
router.get('/companies', CompanyController.list);
router.get('/users', UserController.list);

// Notifications inbox (per-user)
router.get('/inbox', InboxController.list);

// Dashboard (per-user, scoped to their company)
router.get('/dashboard', DashboardController.get);

// Projects
router.post('/projects', ProjectController.create);
router.get('/projects', ProjectController.list);
router.get('/projects/:id', ProjectController.getById);
router.patch('/projects/:id', ProjectController.update);
router.get('/projects/:id/candidates', DiscoveryController.listCandidates);
router.post('/projects/:id/candidates', DiscoveryController.createUserCandidate);
router.post('/projects/:id/retrain', DiscoveryController.retrain);
router.get('/projects/:id/audit', AuditController.dashboard);

// Step 1+2: reaction resolution
router.post('/reactions/resolve', ReactionController.resolve);

// Step 3+4: catalyst discovery
router.post('/discovery', DiscoveryController.start);
router.post('/discovery/stream', DiscoveryController.startStream);

// Step 5: experiments + peer reviews
router.get('/experiments', ExperimentController.library);
router.post('/experiments', ExperimentController.submit);
router.post('/experiments/:id/reviews', ExperimentController.addReview);

// Demo
router.get('/demo', DemoController.runFullDemo);

export default router;
