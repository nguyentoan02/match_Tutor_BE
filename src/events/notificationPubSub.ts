import { redisPublisher, redisSubscriber } from "../config/redis";

export type NotificationEventPayload =
   | { userId: string; title: string; message: string }
   | { userIds: string[]; title: string; message: string };

const NOTIFICATION_CHANNEL = "notifications:events";
let isSubscribed = false;

export async function publishNotificationEvent(
   payload: NotificationEventPayload
) {
   await redisPublisher.publish(NOTIFICATION_CHANNEL, JSON.stringify(payload));
}

export function subscribeNotificationEvents(
   handler: (payload: NotificationEventPayload) => Promise<void> | void
) {
   if (isSubscribed) {
      return;
   }

   redisSubscriber.subscribe(NOTIFICATION_CHANNEL, (err, count) => {
      if (err) {
         console.error(
            "Failed to subscribe to notification channel:",
            err.message
         );
         return;
      }

      console.log(
         `Subscribed to ${NOTIFICATION_CHANNEL}. Active channel count: ${count}`
      );
   });

   redisSubscriber.on("message", async (channel, message) => {
      if (channel !== NOTIFICATION_CHANNEL) return;

      try {
         const payload = JSON.parse(message) as NotificationEventPayload;
         await handler(payload);
      } catch (error) {
         console.error("Failed to handle notification pub/sub message:", error);
      }
   });

   isSubscribed = true;
}
