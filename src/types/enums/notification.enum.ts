export enum NotificationTypeEnum {
   TEACHING_REQUEST = "TEACHING_REQUEST",
   SESSION_REMINDER = "SESSION_REMINDER",
   MATERIAL_UPLOADED = "MATERIAL_UPLOADED",
   QUIZ_ASSIGNED = "QUIZ_ASSIGNED",
   TUTOR_MATCH = "TUTOR_MATCH",
}

export const NOTIFICATION_TYPE_VALUES = Object.values(
   NotificationTypeEnum
) as NotificationTypeEnum[];
