export enum MessageTypeEnum {
   TEXT = "TEXT",
   FILE = "FILE",
   IMAGE = "IMAGE",
}

export const MESSAGE_TYPE_VALUES = Object.values(
   MessageTypeEnum
) as MessageTypeEnum[];
