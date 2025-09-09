export enum ReminderMethodEnum {
   IN_APP = "IN_APP",
   EMAIL = "EMAIL",
   SMS = "SMS",
}

export const REMINDER_METHOD_VALUES = Object.values(
   ReminderMethodEnum
) as ReminderMethodEnum[];
