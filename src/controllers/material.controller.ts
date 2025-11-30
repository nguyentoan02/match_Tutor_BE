import { Request, Response, NextFunction } from "express";
import * as materialService from "../services/material.service";
import { Types } from "mongoose";
import { OK } from "../utils/success.response";

export const uploadMaterial = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const { title, description } = req.body;
      const file = req.file;
      const userId = req.user?._id as string;

      if (!file) {
         return res.status(400).json({ message: "File is required." });
      }

      if (!userId) {
         return res.status(401).json({ message: "Unauthorized." });
      }

      const newMaterial = await materialService.uploadMaterial(
         file,
         title,
         description,
         new Types.ObjectId(userId)
      );

      new OK({
         message: "Material uploaded successfully!",
         metadata: newMaterial,
      }).send(res);
   } catch (error) {
      next(error);
   }
};

export const getMaterials = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const userId = req.user?._id as string;

      if (!userId) {
         return res.status(401).json({ message: "Unauthorized." });
      }

      // read pagination query params: ?page=1&limit=10
      const page = parseInt(String(req.query.page || "1"), 10) || 1;
      const limit = parseInt(String(req.query.limit || "10"), 10) || 10;

      const materialsPaginated = await materialService.getMaterialsByUserId(
         new Types.ObjectId(userId),
         page,
         limit
      );

      new OK({
         message: "Materials retrieved successfully!",
         metadata: materialsPaginated,
      }).send(res);
   } catch (error) {
      next(error);
   }
};

export const addMaterialToSession = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const { sessionId } = req.params;
      const { materialId } = req.body;
      const userId = req.user?._id as string;

      const updatedSession = await materialService.addMaterialToSession(
         new Types.ObjectId(sessionId),
         new Types.ObjectId(materialId),
         new Types.ObjectId(userId)
      );

      new OK({
         message: "Material added to session successfully!",
         metadata: updatedSession,
      }).send(res);
   } catch (error) {
      next(error);
   }
};

export const removeMaterialFromSession = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const { sessionId } = req.params;
      const { materialId } = req.body;
      const userId = req.user?._id as string;

      const updatedSession = await materialService.removeMaterialFromSession(
         new Types.ObjectId(sessionId),
         new Types.ObjectId(materialId),
         new Types.ObjectId(userId)
      );

      new OK({
         message: "Material removed from session successfully!",
         metadata: updatedSession,
      }).send(res);
   } catch (error) {
      next(error);
   }
};

export const getMaterialsBySession = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const { sessionId } = req.params;

      const materials = await materialService.getMaterialsBySessionId(
         new Types.ObjectId(sessionId)
      );

      new OK({
         message: "Materials in session retrieved successfully!",
         metadata: materials,
      }).send(res);
   } catch (error) {
      next(error);
   }
};

export const deleteMaterial = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const { materialId } = req.params;
      const userId = req.user?._id as string;
      if (!userId) {
         return res.status(401).json({ message: "Unauthorized." });
      }

      const result = await materialService.deleteMaterial(
         new Types.ObjectId(materialId),
         new Types.ObjectId(userId)
      );

      new OK({
         message: result.message,
         metadata: { removedFromSessions: result.removedFromSessions },
      }).send(res);
   } catch (error) {
      next(error);
   }
};
