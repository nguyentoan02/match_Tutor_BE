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

      const materials = await materialService.getMaterialsByUserId(
         new Types.ObjectId(userId)
      );

      new OK({
         message: "Materials retrieved successfully!",
         metadata: materials,
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
