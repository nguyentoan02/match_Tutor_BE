import { Document, model, Schema, Types } from "mongoose";

export interface IMoneyProcessHistory extends Document {
   userId?: Types.ObjectId; // User (owner of wallet) -- optional for admin/system entries
   profileId?: Types.ObjectId; // Tutor or Student profile id (Tutor/Student._id)
   role: "student" | "tutor" | "admin" | "system";
   walletId?: Types.ObjectId; // Wallet._id
   amount: number;
   type: "credit" | "debit";
   source:
      | "learning_commitment"
      | "session"
      | "refund"
      | "payout"
      | "admin_adjustment";
   referenceId?: Types.ObjectId; // e.g., LearningCommitment._id or Session._id
   referenceModel?: string; // e.g., "LearningCommitment" | "Session" | "AdminWallet"
   balanceBefore?: number;
   balanceAfter?: number;
   notes?: string;
   transactionDetails?: any; // raw payload / provider info
   processedAt?: Date;
}

const moneyProcessHistorySchema = new Schema<IMoneyProcessHistory>(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: false }, // optional now
      profileId: { type: Schema.Types.ObjectId }, // ref to Tutor or Student
      role: {
         type: String,
         enum: ["student", "tutor", "admin", "system"],
         required: true,
      },
      walletId: { type: Schema.Types.ObjectId, ref: "Wallet" },
      amount: { type: Number, required: true },
      type: { type: String, enum: ["credit", "debit"], required: true },
      source: {
         type: String,
         enum: [
            "learning_commitment",
            "session",
            "refund",
            "payout",
            "admin_adjustment",
         ],
         default: "learning_commitment",
      },
      referenceId: { type: Schema.Types.ObjectId },
      referenceModel: { type: String },
      balanceBefore: { type: Number },
      balanceAfter: { type: Number },
      notes: { type: String },
      transactionDetails: { type: Schema.Types.Mixed },
      processedAt: { type: Date, default: Date.now },
   },
   { timestamps: true }
);

moneyProcessHistorySchema.index({ userId: 1, processedAt: -1 });
moneyProcessHistorySchema.index({ referenceId: 1, referenceModel: 1 });

const MoneyProcessHistory = model<IMoneyProcessHistory>(
   "MoneyProcessHistory",
   moneyProcessHistorySchema
);

export default MoneyProcessHistory;
