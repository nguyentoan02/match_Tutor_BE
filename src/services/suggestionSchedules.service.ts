import suggestSchedulesModel from "../models/suggestSchedules.model";
import {
   ISuggestionSchedules,
   SuggesstionSchedules,
} from "../types/types/suggestionSchedules";

class SuggestionSchedulesService {
   async saveSuggestions(
      schedules: SuggesstionSchedules,
      tutorId: string
   ): Promise<ISuggestionSchedules> {
      const s = await suggestSchedulesModel.create({
         tutorId,
         ...schedules,
      });
      return s;
   }
}

export default new SuggestionSchedulesService();
