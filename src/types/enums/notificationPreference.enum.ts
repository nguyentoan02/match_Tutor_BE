export enum FrequencyEnum {
   INSTANT = "INSTANT",
   DAILY = "DAILY",
   WEEKLY = "WEEKLY",
}

export enum DeliveryMethodEnum {
   IN_APP = "IN_APP",
   EMAIL = "EMAIL",
   SMS = "SMS",
}

export const FREQUENCY_VALUES = Object.values(FrequencyEnum) as FrequencyEnum[];
export const DELIVERY_METHOD_VALUES = Object.values(
   DeliveryMethodEnum
) as DeliveryMethodEnum[];
