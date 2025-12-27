import { Request, Response } from "express";
import { UnauthorizedError } from "../utils/error.response";
import { SuggestionSchedulesBody } from "../schemas/suggestionSchedule.schema";
import suggestionSchedulesService from "../services/suggestionSchedules.service";
import { CREATED } from "../utils/success.response";

class SuggestionSchedulesController {
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
}

export default new SuggestionSchedulesController();
