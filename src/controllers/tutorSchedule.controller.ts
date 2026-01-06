import { Request, Response, NextFunction } from "express";
import { SuccessResponse } from "../utils/success.response";
import tutorScheduleService from "../services/tutorSchedule.service";
import { GetTutorSessionsPublicQuery } from "../schemas/tutorSchedule.schema";

export class TutorScheduleController {
   /**
    * Get tutor sessions for public view
    * Students can see tutor's schedule to check availability
    */
   async getTutorSessions(req: Request, res: Response, next: NextFunction) {
      try {
         const { tutorId } = req.params;
         const query = req.query as GetTutorSessionsPublicQuery;

         const result = await tutorScheduleService.getTutorSessionsForPublic(tutorId, {
            startDate: query.startDate,
            endDate: query.endDate,
            view: query.view,
         });

         new SuccessResponse({
            message: "Lịch dạy của gia sư lấy thành công",
            metadata: result,
         }).send(res);
      } catch (error) {
         next(error);
      }
   }
}

export default new TutorScheduleController();
