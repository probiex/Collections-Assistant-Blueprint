import { Router, type IRouter } from "express";
import collectionsRouter from "./collections";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(collectionsRouter);

router.use(healthRouter);

export default router;
