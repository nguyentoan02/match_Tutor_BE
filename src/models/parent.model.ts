import mongoose, { Schema } from "mongoose";
import { IParent } from "../types/types/parent";
import { RELATIONSHIP_VALUES } from "../types/enums/relationship.enum";
import { getVietnamTime } from "../utils/date.util";

const ParentSchema: Schema<IParent> = new Schema(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      fullName: { type: String, required: true },
      phone: { type: String },
      avatarUrl: { type: String },
      children: [
         {
            studentId: { type: Schema.Types.ObjectId, ref: "Student" },
            relationship: { type: String, enum: RELATIONSHIP_VALUES },
            canConfirmSession: { type: Boolean, default: false },
            canMakePayment: { type: Boolean, default: false },
            notes: { type: String },
            _id: false,
         },
      ],
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "parents",
   }
);

ParentSchema.index({ userId: 1 }, { unique: true });
ParentSchema.index({ "children.studentId": 1 });

export default mongoose.model<IParent>("Parent", ParentSchema);
