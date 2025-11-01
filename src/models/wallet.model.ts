import { Schema, model, Types, Document } from "mongoose";

export interface IWallet extends Document {
   userId: Types.ObjectId; // Reference to the user (tutor or student)
   balance: number; // Current balance in the wallet
}

const walletSchema = new Schema<IWallet>(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      balance: { type: Number, default: 0 }, // Default balance is 0
   },
   { timestamps: true } // Automatically manage createdAt and updatedAt
);

const Wallet = model<IWallet>("Wallet", walletSchema);

export default Wallet;
