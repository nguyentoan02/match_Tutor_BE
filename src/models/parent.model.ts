import mongoose, { Schema } from "mongoose";
import { IParent } from "../types/types/parent";
import { RELATIONSHIP_VALUES } from "../types/enums/relationship.enum";
import { getVietnamTime } from "../utils/date.util";
import {
   ParentPermission,
   PARENT_PERMISSION_VALUES,
} from "../types/enums/parentPermission.enum";

const ParentSchema: Schema<IParent> = new Schema(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

      // Quyền dành cho parent — mặc định chỉ được xem lịch
      permissions: {
         type: [String],
         enum: PARENT_PERMISSION_VALUES,
         default: [ParentPermission.VIEW_SCHEDULE],
      },
      children: [
         {
            studentId: { type: Schema.Types.ObjectId, ref: "Student" },
            relationship: { type: String, enum: RELATIONSHIP_VALUES },
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
