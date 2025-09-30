import { Router } from "express";
import controller from "../controllers/session.controller";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
   createSessionSchema,
   updateSessionSchema,
} from "../schemas/session.schema";
import { Role } from "../types/enums/role.enum";

const router = Router();

// Tất cả các route trong file này đều yêu cầu đăng nhập
router.use(authenticate, isRole(Role.STUDENT, Role.TUTOR));

// Lấy tất cả session của user hiện tại (student hoặc tutor)
router.get("/me", controller.listForUser);

// Tạo một session mới cho một teaching request
router.post("/", validate(createSessionSchema), controller.create);

// Lấy danh sách các session của một teaching request
router.get("/request/:teachingRequestId", controller.listByTeachingRequest);

// Lấy chi tiết một session
router.get("/:id", controller.getById);

// Cập nhật một session
router.patch("/:id", validate(updateSessionSchema), controller.update);

// Xóa một session
router.delete("/:id", controller.delete);

export default router;
