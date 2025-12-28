import suggestSchedulesModel from "../models/suggestSchedules.model";
import { SuggesstionSchedules } from "../types/types/suggestionSchedules";
import { ISuggestionSchedules } from "../types/types/suggestionSchedules";

class SuggestionSchedulesService {
   async saveSuggestions(
      schedules: SuggesstionSchedules,
      tutorId: string
   ): Promise<ISuggestionSchedules> {
      const s = await suggestSchedulesModel.create({
         tutorId,
         schedules: schedules.schedules,
         title: schedules.title,
         teachingRequestId: schedules.TRId,
      });
      return s;
   }

   async getByTeachingRequest(TRid: string) {
      const result = await suggestSchedulesModel.findOne({
         teachingRequestId: TRid,
      });

      return result;
   }
}

export default new SuggestionSchedulesService();
