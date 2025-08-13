import mongoose, { Schema } from "mongoose";
import { IUser } from "../types/user";
const UserSchema: Schema<IUser> = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
    },
    { timestamps: true }
);

export default mongoose.model<IUser>("UserTest", UserSchema);
