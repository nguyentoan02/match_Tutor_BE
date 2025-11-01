import { Router } from "express";
import { validate } from "../middlewares/validation.middleware";
import packageController from "../controllers/package.controller";
import { z } from "zod";

// Schema validation cho public package routes
const listPackagesPublicSchema = z.object({
   query: z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      popular: z.enum(["true", "false"]).optional(),
   }),
});

const getPackageByIdPublicSchema = z.object({
   params: z.object({ id: z.string().min(1) }),
});

const router = Router();

// Public routes - không cần authentication
router.get("/", validate(listPackagesPublicSchema), packageController.getAllPackages);
router.get("/:id", validate(getPackageByIdPublicSchema), packageController.getPackageById);

export default router;

