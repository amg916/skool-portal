import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import adminUsersRouter from "./adminUsers.js";
import channelsRouter from "./channels.js";
import postsRouter from "./posts.js";
import commentsRouter from "./comments.js";
import schoolReadRouter from "./schoolRead.js";
import schoolAdminRouter from "./schoolAdmin.js";
import uploadsRouter from "./uploads.js";
import progressRouter from "./progress.js";
import membersRouter from "./members.js";
import leaderboardsRouter from "./leaderboards.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminUsersRouter);
router.use(channelsRouter);
router.use(postsRouter);
router.use(commentsRouter);
router.use(schoolReadRouter);
router.use(schoolAdminRouter);
router.use(uploadsRouter);
router.use(progressRouter);
router.use(membersRouter);
router.use(leaderboardsRouter);

export default router;
