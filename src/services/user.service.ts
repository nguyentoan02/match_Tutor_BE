import User from "../models/user.model";
import { IUser } from "../types/user";
import { NotFoundError, ConflictError } from "../utils/error.response";
import { CreateUserBody, UpdateUserBody } from "../schemas/user.schema";

export class UserService {
    // Create a new user
    async createUser(userData: CreateUserBody): Promise<IUser> {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            throw new ConflictError("User with this email already exists");
        }

        const user = new User(userData);
        return await user.save();
    }

    // Get all users
    async getAllUsers(): Promise<IUser[]> {
        return await User.find().select("-password");
    }

    // Get user by ID
    async getUserById(userId: string): Promise<IUser> {
        const user = await User.findById(userId).select("-password");
        if (!user) {
            throw new NotFoundError("User not found");
        }
        return user;
    }

    // Get user by email
    async getUserByEmail(email: string): Promise<IUser> {
        const user = await User.findOne({ email }).select("-password");
        if (!user) {
            throw new NotFoundError("User not found");
        }
        return user;
    }

    // Update user
    async updateUser(
        userId: string,
        updateData: UpdateUserBody
    ): Promise<IUser> {
        // Check if user exists
        const existingUser = await User.findById(userId);
        if (!existingUser) {
            throw new NotFoundError("User not found");
        }

        // If email is being updated, check for duplicates
        if (updateData.email && updateData.email !== existingUser.email) {
            const emailExists = await User.findOne({
                email: updateData.email,
            });
            if (emailExists) {
                throw new ConflictError("User with this email already exists");
            }
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
            new: true,
            runValidators: true,
        }).select("-password");

        if (!updatedUser) {
            throw new NotFoundError("User not found");
        }

        return updatedUser;
    }

    // Delete user
    async deleteUser(userId: string): Promise<void> {
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            throw new NotFoundError("User not found");
        }
    }
}

export default new UserService();
