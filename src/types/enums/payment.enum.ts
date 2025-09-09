export enum PaymentStatusEnum {
   PENDING = "PENDING",
   PAID = "PAID",
   FAILED = "FAILED",
   REFUNDED = "REFUNDED",
}

export const PAYMENT_STATUS_VALUES = Object.values(
   PaymentStatusEnum
) as PaymentStatusEnum[];
