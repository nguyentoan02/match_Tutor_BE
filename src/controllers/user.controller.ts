import { Request, Response, NextFunction } from "express";
import userService from "../services/user.service";
import { SuccessResponse, OK, CREATED } from "../utils/success.response";
import {
    CreateUserBody,
    UpdateUserBody,
    UpdateUserParams,
    GetUserByIdParams,
    GetUserByEmailParams,
    DeleteUserParams,
} from "../schemas/user.schema";

export class UserController {
    // Create user
    async createUser(req: Request, res: Response, next: NextFunction) {
        try {
            const userData: CreateUserBody = req.body;
            const user = await userService.createUser(userData);

            return new CREATED({
                message: "User created successfully",
                metadata: user,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get all users
    async getAllUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const users = await userService.getAllUsers();

            return SuccessResponse.ok(
                res,
                users,
                "Users retrieved successfully"
            );
        } catch (error) {
            next(error);
        }
    }

    // Get user by ID
    async getUserById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id }: GetUserByIdParams = req.params as any;
            const user = await userService.getUserById(id);

            return new OK({
                message: "User retrieved successfully",
                metadata: user,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // Get user by email
    async getUserByEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { email }: GetUserByEmailParams = req.params as any;
            const user = await userService.getUserByEmail(email);

            return SuccessResponse.ok(res, user, "User retrieved successfully");
        } catch (error) {
            next(error);
        }
    }

    // Update user
    async updateUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id }: UpdateUserParams = req.params as any;
            const updateData: UpdateUserBody = req.body;
            const user = await userService.updateUser(id, updateData);

            return SuccessResponse.ok(res, user, "User updated successfully");
        } catch (error) {
            next(error);
        }
    }

    // Delete user
    async deleteUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id }: DeleteUserParams = req.params as any;
            await userService.deleteUser(id);

            return SuccessResponse.noContent(res);
        } catch (error) {
            next(error);
        }
    }
}

export default new UserController();
