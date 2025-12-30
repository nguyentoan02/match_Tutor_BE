import { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../utils/error.response";
import { SuggestionSchedulesBody } from "../schemas/suggestionSchedule.schema";
import suggestionSchedulesService from "../services/suggestionSchedules.service";
import { CREATED, OK } from "../utils/success.response";

class SuggestionSchedulesController {
   // Gia sư tạo / cập nhật đề xuất lịch cho một teaching request
   async create(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const data: SuggestionSchedulesBody = req.body;
      const result = await suggestionSchedulesService.saveSuggestions(
         data,
         currentUser._id.toString()
      );

      new CREATED({ message: "suggestion created", metadata: result }).send(
         res
      );
   }

   async getByTRId(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }

      const { TRid } = req.params;
      if (!TRid) {
         throw new BadRequestError("invalid TRid params");
      }

      const result = await suggestionSchedulesService.getByTeachingRequest(
         TRid,
         currentUser._id.toString()
      );

      new OK({ message: "success", metadata: result }).send(res);
   }

   // Học sinh phản hồi đề xuất lịch (ACCEPT / REJECT + reason)
   async studentRespond(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }

      const { id } = req.params;
      const { decision, reason } = req.body as {
         decision: "ACCEPT" | "REJECT";
         reason?: string;
      };

      if (!decision || !["ACCEPT", "REJECT"].includes(decision)) {
         throw new BadRequestError("Invalid decision");
      }

      const result = await suggestionSchedulesService.studentRespond(
         id,
         currentUser._id.toString(),
         { decision, reason }
      );

      // Nếu có commitmentId (khi ACCEPT), trả về trong metadata
      const responseData: any = result;
      if ((result as any).commitmentId) {
         responseData.commitmentId = (result as any).commitmentId;
      }

      new OK({
         message: "Student responded to suggestion successfully",
         metadata: responseData,
      }).send(res);
   }

   // Gia sư chỉnh sửa và gửi lại đề xuất lịch sau khi học sinh góp ý / từ chối
   async tutorUpdate(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }

      const { id } = req.params;
      const { schedules, title, proposedTotalPrice } = req.body as SuggestionSchedulesBody;

      const result = await suggestionSchedulesService.tutorUpdateSuggestion(
         id,
         currentUser._id.toString(),
         { schedules, title, proposedTotalPrice }
      );

      new OK({
         message: "Suggestion updated successfully",
         metadata: result,
      }).send(res);
   }

   // Lấy tất cả suggestion schedules đang pending của gia sư
   async getMyPendingSuggestions(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }

      const result = await suggestionSchedulesService.getTutorPendingSuggestions(
         currentUser._id.toString()
      );

      new OK({
         message: "success",
         metadata: result,
      }).send(res);
   }
}

export default new SuggestionSchedulesController();
