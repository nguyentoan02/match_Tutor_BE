import { Schema, model, Document } from "mongoose";

export interface IAdminWallet extends Document {
   balance: number; // Current balance in the admin wallet
   // Không sử dụng userId làm tham chiếu, vì đây là ví riêng cho admin
}

const adminWalletSchema = new Schema<IAdminWallet>(
   {
      balance: { type: Number, default: 0 }, // Default balance is 0
   },
   { timestamps: true }
);

const AdminWallet = model<IAdminWallet>("AdminWallet", adminWalletSchema);

export default AdminWallet;
