import { Request, Response, NextFunction } from "express";
import authService from "../services/auth.service";
import { CREATED, OK } from "../utils/success.response";
import { CreateUserBody } from "../schemas/user.schema";
import { UnauthorizedError } from "../utils/error.response";

class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const userData: CreateUserBody = req.body;
            const user = await authService.register(userData);
            new CREATED({
                message:
                    "Registration successful. Please check your email to verify your account.",
                metadata: { userId: user._id },
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    async verifyEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { token } = req.query;
            await authService.verifyEmail(token as string);
            new OK({ message: "Email verified successfully." }).send(res);
        } catch (error) {
            next(error);
        }
    }

    async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;
            await authService.forgotPassword(email);
            new OK({
                message:
                    "If a user with that email exists, a password reset link has been sent.",
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { token, password } = req.body;
            await authService.resetPassword(token, password);
            new OK({ message: "Password has been reset successfully." }).send(
                res
            );
        } catch (error) {
            next(error);
        }
    }

    async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            const authHeader = (req.headers.authorization || "").toString();
            const token = authHeader.startsWith("Bearer ")
                ? authHeader.slice(7)
                : authHeader;

            if (!token) {
                throw new UnauthorizedError("No token provided");
            }
            const { user } = (await authService.getUserFromToken(token)) as {
                user: { _id: string };
            };

            const { oldPassword, newPassword } = req.body;
            await authService.changePassword(
                user._id,
                oldPassword,
                newPassword
            );

            new OK({ message: "Password changed successfully." }).send(res);
        } catch (error) {
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            const { token, user } = await authService.login(email, password);
            new OK({
                message: "Login successful",
                metadata: { token, user },
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    async googleLogin(req: Request, res: Response, next: NextFunction) {
        try {
            const { idToken } = req.body;
            const { token, user } = await authService.googleLogin(idToken);
            new OK({
                message: "Google login successful",
                metadata: { token, user },
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    async me(req: Request, res: Response, next: NextFunction) {
        try {
            const authHeader = (req.headers.authorization || "").toString();
            const token = authHeader.startsWith("Bearer ")
                ? authHeader.slice(7)
                : authHeader;

            if (!token) {
                throw new UnauthorizedError("No token provided");
            }

            const result = await authService.getUserFromToken(token);
            new OK({
                message: "User profile retrieved",
                metadata: result,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthController();
