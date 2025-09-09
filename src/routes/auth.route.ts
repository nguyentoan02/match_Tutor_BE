import { Router } from "express";
import authController from "../controllers/auth.controller";
import { validate } from "../middlewares/validation.middleware";
import {
   registerSchema,
   loginSchema,
   googleLoginSchema,
   verifyEmailSchema,
   forgotPasswordSchema,
   resetPasswordSchema,
   changePasswordSchema,
} from "../schemas/auth.schema";
import { authenticate } from "../middlewares/auth.middleware"; // { changed code }

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.get(
   "/verify-email",
   validate(verifyEmailSchema),
   authController.verifyEmail
);
router.post("/login", validate(loginSchema), authController.login);
router.post(
   "/forgot-password",
   validate(forgotPasswordSchema),
   authController.forgotPassword
);
router.post(
   "/reset-password",
   validate(resetPasswordSchema),
   authController.resetPassword
);
// apply authenticate to change-password
router.post(
   "/change-password",
   authenticate,
   validate(changePasswordSchema),
   authController.changePassword
);
router.post("/google", validate(googleLoginSchema), authController.googleLogin);
// protect /me
router.get("/me", authenticate, authController.me);

export default router;
