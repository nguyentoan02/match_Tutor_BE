export enum SessionHistoryActionEnum {
   CREATE = "CREATE",
   UPDATE = "UPDATE",
   CONFIRM = "CONFIRM",
   REJECT = "REJECT",
   CANCEL = "CANCEL",
   COMPLETE = "COMPLETE",
   RESCHEDULE = "RESCHEDULE",
   UPLOAD_MATERIAL = "UPLOAD_MATERIAL",
}

export const SESSION_HISTORY_ACTION_VALUES = Object.values(
   SessionHistoryActionEnum
) as SessionHistoryActionEnum[];
