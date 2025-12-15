import { FilterQuery, Types } from "mongoose";
import Tutor from "../models/tutor.model";
import User from "../models/user.model";
import { CreateTutorInput, UpdateTutorInput } from "../schemas/tutor.schema";
import { NotFoundError } from "../utils/error.response";
import { ICertification, ITutor } from "../types/types/tutor";
import cloudinary from "../config/cloudinary";
import userService from "./user.service";
import { ClassType, Level, Subject, TimeSlot } from "../types/enums";
import { addEmbeddingJob } from "../queues/embedding.queue";

export class TutorService {
   // Get all tutors (approved and unapproved)
   async getAllTutors(
      isApproved?: boolean,
      page: number = 1,
      limit: number = 6
   ): Promise<{ data: ITutor[]; pagination: any }> {
      const filter: FilterQuery<ITutor> = {};
      const skip = (page - 1) * limit;

      // Add approval filter if provided
      if (isApproved !== undefined) {
         filter.isApproved = isApproved;
      }

      const tutors = await Tutor.find(filter)
         .populate("userId", "name email avatarUrl phone gender address")
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limit)
         .lean();

      const total = await Tutor.countDocuments(filter);

      return {
         data: tutors,
         pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
         },
      };
   }

   // Get one tutor by tutor ID
   async getTutorById(tutorId: string): Promise<ITutor> {
      const tutor = await Tutor.findById(tutorId)
         .populate("userId", "name email avatarUrl phone gender address")
         .lean();

      if (!tutor) {
         throw new NotFoundError("Không tìm thấy gia sư");
      }

      return tutor;
   }

   // Get one tutor by user ID
   async getTutorByUserId(userId: string): Promise<ITutor | null> {
      return await Tutor.findOne({ userId: new Types.ObjectId(userId) })
         .populate("userId", "name email avatarUrl phone gender address")
         .lean();
   }

   async searchTutors(
      keyword: string,
      filters: {
         subjects?: string[];
         levels?: string[];
         cities?: string[];
         minRate?: number;
         maxRate?: number;
         minExperience?: number;
         maxExperience?: number;
         classType?: ClassType[];
         availability?: {
            dayOfWeek?: number[];
            slots?: TimeSlot[];
         };
         minRating?: number;
         maxRating?: number;
      },
      page: number = 1,
      limit: number = 6
   ): Promise<{ data: ITutor[]; pagination: any }> {
      const query: FilterQuery<ITutor> = { isApproved: true };
      const skip = (page - 1) * limit;

      // Keyword search
      if (keyword && keyword.trim() !== "") {
         const matchingUsers = await User.find({
            name: { $regex: keyword, $options: "i" },
         }).select("_id");

         const matchingUserIds = matchingUsers.map((user) => user._id);

         query.$or = [
            { userId: { $in: matchingUserIds } },
            { bio: { $regex: keyword, $options: "i" } },
         ];
      }

      // Subjects
      if (filters?.subjects?.length) {
         query.subjects = { $in: filters.subjects };
      }

      // Levels
      if (filters?.levels?.length) {
         query.levels = { $in: filters.levels };
      }

      // ClassType
      if (filters?.classType?.length) {
         query.classType = { $in: filters.classType };
      }

      // Experience years
      if (
         filters?.minExperience !== undefined ||
         filters?.maxExperience !== undefined
      ) {
         query.experienceYears = {};
         if (filters.minExperience !== undefined)
            query.experienceYears.$gte = filters.minExperience;
         if (filters.maxExperience !== undefined)
            query.experienceYears.$lte = filters.maxExperience;
      }

      // Hourly rate
      if (filters?.minRate !== undefined || filters?.maxRate !== undefined) {
         query.hourlyRate = {};
         if (filters.minRate !== undefined)
            query.hourlyRate.$gte = filters.minRate;
         if (filters.maxRate !== undefined)
            query.hourlyRate.$lte = filters.maxRate;
      }

      // Availability
      if (filters?.availability) {
         const elemMatch: any = {};

         // Filter by dayOfWeek if provided
         if (filters.availability.dayOfWeek?.length) {
            elemMatch.dayOfWeek = { $in: filters.availability.dayOfWeek };
         }

         // Filter by slots if provided
         if (filters.availability.slots?.length) {
            elemMatch.slots = { $in: filters.availability.slots };
         }

         // Only include tutors who have at least one slot if no specific slots filter
         if (!filters.availability.slots?.length) {
            elemMatch.slots = { $exists: true, $ne: [] };
         }

         if (Object.keys(elemMatch).length > 0) {
            query.availability = { $elemMatch: elemMatch };
         }
      }

      //  Ratings
      if (
         filters?.minRating !== undefined ||
         filters?.maxRating !== undefined
      ) {
         query["ratings.average"] = {};
         if (filters.minRating !== undefined)
            query["ratings.average"].$gte = filters.minRating;
         if (filters.maxRating !== undefined)
            query["ratings.average"].$lte = filters.maxRating;
      }

      // Use aggregation for city or cities filter
      if (filters?.cities?.length) {
         const cityMatch: any = {};

         if (filters.cities?.length) {
            cityMatch["userId.address.city"] = { $in: filters.cities };
         }

         const pipeline: any[] = [
            { $match: query },
            {
               $lookup: {
                  from: "users",
                  localField: "userId",
                  foreignField: "_id",
                  as: "userId",
               },
            },
            { $unwind: "$userId" },
            { $match: cityMatch },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
               $project: {
                  _id: 1,
                  bio: 1,
                  subjects: 1,
                  levels: 1,
                  classType: 1,
                  experienceYears: 1,
                  hourlyRate: 1,
                  rating: 1,
                  availability: 1,
                  "userId._id": 1,
                  "userId.name": 1,
                  "userId.gender": 1,
                  "userId.address.city": 1,
               },
            },
         ];

         const tutors = await Tutor.aggregate(pipeline);

         const totalPipeline = [
            { $match: query },
            {
               $lookup: {
                  from: "users",
                  localField: "userId",
                  foreignField: "_id",
                  as: "userId",
               },
            },
            { $unwind: "$userId" },
            { $match: cityMatch },
            { $count: "total" },
         ];

         const totalResult = await Tutor.aggregate(totalPipeline);
         const total = totalResult.length > 0 ? totalResult[0].total : 0;

         return {
            data: tutors,
            pagination: {
               total,
               page,
               limit,
               totalPages: Math.ceil(total / limit),
            },
         };
      }

      const tutors = await Tutor.find(query)
         .populate({
            path: "userId",
            select: "name gender address.city avatarUrl",
         })
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limit)
         .lean();

      const total = await Tutor.countDocuments(query);

      return {
         data: tutors.filter((t) => t.userId !== null),
         pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
         },
      };
   }

   async createTutorProfile(
      userId: string,
      data: CreateTutorInput & { imageCertMapping?: any }, // Add mapping type
      avatarFile?: Express.Multer.File,
      certificationFiles?: Express.Multer.File[]
   ): Promise<ITutor> {
      // Check if tutor profile already exists
      const existingTutor = await Tutor.findOne({
         userId: new Types.ObjectId(userId),
      });
      if (existingTutor) {
         throw new Error("Hồ sơ gia sư đã tồn tại");
      }

      //  Update user profile (basic fields + avatar)
      await userService.updateProfile(
         userId,
         {
            name: (data as any).name,
            phone: (data as any).phone,
            gender: (data as any).gender,
            address: (data as any).address,
         },
         avatarFile
      );

      //  Handle certification images upload WITH MAPPING
      let certifications = data.certifications || [];

      // console.log("Files received:", certificationFiles ? certificationFiles.map(f => f.originalname) : []);
      // console.log("Mapping received:", data.imageCertMapping);

      if (certificationFiles && certificationFiles.length > 0) {
         const uploadedImageUrls = await this.uploadCertificationImages(
            certificationFiles
         );

         // Parse mapping information
         let mapping: Array<{ certIndex: number; fileIndex: number }> = [];
         try {
            mapping =
               typeof data.imageCertMapping === "string"
                  ? JSON.parse(data.imageCertMapping)
                  : data.imageCertMapping || [];
         } catch (error) {
            console.error("Error parsing imageCertMapping:", error);
         }

         // Initialize all certifications with empty image arrays
         certifications = certifications.map((cert) => ({
            ...cert,
            imageUrls: [],
         }));

         // Apply mapping to assign images to correct certifications
         mapping.forEach((map) => {
            const { certIndex, fileIndex } = map;
            if (certifications[certIndex] && uploadedImageUrls[fileIndex]) {
               certifications[certIndex].imageUrls.push(
                  uploadedImageUrls[fileIndex]
               );
            }
         });

         //  Fallback: If no mapping, distribute images evenly
         if (mapping.length === 0) {
            const imagesPerCert = Math.ceil(
               uploadedImageUrls.length / certifications.length
            );

            certifications = certifications.map((cert, index) => {
               const startIndex = index * imagesPerCert;
               const endIndex = startIndex + imagesPerCert;
               const certImages = uploadedImageUrls
                  .slice(startIndex, endIndex)
                  .filter((url) => url);

               return {
                  ...cert,
                  imageUrls: certImages,
               };
            });
         }
      } else {
         // No files, just ensure imageUrls array exists
         certifications = certifications.map((cert) => ({
            ...cert,
            imageUrls: [],
         }));
      }

      // 🔹 3. Create tutor profile
      const tutor = new Tutor({
         userId,
         subjects: data.subjects,
         levels: data.levels,
         education: data.education,
         certifications,
         experienceYears: data.experienceYears,
         hourlyRate: data.hourlyRate,
         bio: data.bio,
         classType: data.classType,
         availability: data.availability,
      });

      await tutor.save();

      return (await Tutor.findById(tutor._id)
         .populate("userId", "name email avatarUrl phone gender")
         .lean()) as ITutor;
   }

   async updateTutorProfile(
      userId: string,
      data: Partial<UpdateTutorInput> & { imageCertMapping?: any },
      certificationFiles?: Express.Multer.File[],
      avatarFile?: Express.Multer.File
   ): Promise<ITutor> {
      const tutor = await Tutor.findOne({ userId: new Types.ObjectId(userId) });

      if (!tutor) {
         throw new NotFoundError("Không tìm thấy hồ sơ gia sư");
      }

      // Sync user profile
      await userService.updateProfile(
         userId,
         {
            name: (data as any).name,
            phone: (data as any).phone,
            gender: (data as any).gender,
            address: (data as any).address,
         },
         avatarFile
      );

      // Update tutor fields
      if (data.subjects)
         tutor.subjects = data.subjects.map((s) => s as Subject);
      if (data.levels) tutor.levels = data.levels.map((l) => l as Level);
      if (data.classType) tutor.classType = data.classType;
      if (data.education) tutor.education = data.education;
      if (data.experienceYears !== undefined)
         tutor.experienceYears = data.experienceYears;
      if (data.hourlyRate !== undefined) tutor.hourlyRate = data.hourlyRate;
      if (data.bio) tutor.bio = data.bio;
      if (data.availability) {
         tutor.availability = data.availability.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            slots: day.slots?.map((slot) => slot as TimeSlot) || [],
         }));
      }

      // Handle certifications - track tempId mappings
      let updatedCertifications: ICertification[] = [];
      const tempIdToCertMap: { [key: string]: ICertification } = {};

      if (Array.isArray(data.certifications)) {
         data.certifications.forEach((newCert, index) => {
            let existingCert: ICertification | undefined;

            // Try to find existing certification by _id first
            if (newCert._id) {
               existingCert = tutor.certifications?.find(
                  (c) => c._id && c._id.toString() === newCert._id
               );
            }

            if (existingCert) {
               // Update existing certification - preserve imageUrls initially
               const updatedCert: ICertification = {
                  _id: existingCert._id,
                  name: newCert.name,
                  description: newCert.description,
                  imageUrls: [...(existingCert.imageUrls || [])], // Keep existing images
               };
               updatedCertifications.push(updatedCert);
            } else {
               // Create new certification
               const newCertObj: ICertification = {
                  _id: new Types.ObjectId(),
                  name: newCert.name,
                  description: newCert.description,
                  imageUrls: [],
               };
               updatedCertifications.push(newCertObj);

               // Store mapping from temporary ID to actual certification
               if (newCert.tempId) {
                  tempIdToCertMap[newCert.tempId] = newCertObj;
               }

               // map by index as fallback
               tempIdToCertMap[`index_${index}`] = newCertObj;
            }
         });
      }

      // Handle image uploads and removals FIRST
      let uploadedImageUrls: string[] = [];

      if (certificationFiles && certificationFiles.length > 0) {
         uploadedImageUrls = await this.uploadCertificationImages(
            certificationFiles
         );
      }

      let mapping: Array<{
         certId?: string;
         tempCertId?: string;
         certIndex?: number;
         fileIndex?: number;
         imageIndex?: number;
         action: "add" | "remove";
      }> = [];

      try {
         mapping =
            typeof data.imageCertMapping === "string"
               ? JSON.parse(data.imageCertMapping)
               : data.imageCertMapping || [];
      } catch (error) {
         throw new Error("Định dạng imageCertMapping không hợp lệ");
      }

      // Process removals FIRST - use the updatedCertifications array
      mapping.forEach((map) => {
         if (map.action === "remove") {
            let cert: ICertification | undefined;

            // Try multiple ways to find the certification in UPDATED certifications
            if (
               map.certIndex !== undefined &&
               updatedCertifications[map.certIndex]
            ) {
               // Use certIndex as primary method - most reliable
               cert = updatedCertifications[map.certIndex];
            } else if (map.certId) {
               // Fallback to certId
               cert = updatedCertifications.find(
                  (c) => c._id && c._id.toString() === map.certId
               );
            }

            if (cert && map.imageIndex !== undefined) {
               if (cert.imageUrls?.[map.imageIndex]) {
                  cert.imageUrls.splice(map.imageIndex, 1);
               } else {
                  console.error("Invalid imageIndex for removal:", map);
               }
            } else {
               console.error("Certification not found for removal:", map);
            }
         }
      });

      // process additions - IMPORTANT: Handle both existing and new certifications
      mapping.forEach((map) => {
         if (map.action === "add") {
            let cert: ICertification | undefined;

            // First try to find by certIndex (most reliable)
            if (
               map.certIndex !== undefined &&
               updatedCertifications[map.certIndex]
            ) {
               cert = updatedCertifications[map.certIndex];
            }
            // Then try to find by existing certId
            else if (map.certId) {
               cert = updatedCertifications.find(
                  (c) => c._id && c._id.toString() === map.certId
               );
            }
            // Finally try to find by temporary certId for NEW certifications
            else if (map.tempCertId && tempIdToCertMap[map.tempCertId]) {
               cert = tempIdToCertMap[map.tempCertId];
            }

            if (
               cert &&
               map.fileIndex !== undefined &&
               uploadedImageUrls[map.fileIndex]
            ) {
               if (!Array.isArray(cert.imageUrls)) {
                  cert.imageUrls = [];
               }
               cert.imageUrls.push(uploadedImageUrls[map.fileIndex]);
            } else {
               console.error("Invalid map:", map);
            }
         }
      });

      // Update the tutor's certifications
      if (Array.isArray(data.certifications)) {
         tutor.certifications = updatedCertifications as any;
      }

      //chỉ tạo embed cho tutor đã được approve
      if (tutor.isApproved) {
         // add create embeding job
         await addEmbeddingJob(tutor.userId.toString());
      }

      await tutor.save();
      return (await Tutor.findById(tutor._id)
         .populate("userId", "email name avatarUrl phone gender")
         .lean()) as ITutor;
   }
   private async uploadCertificationImages(
      files: Express.Multer.File[]
   ): Promise<string[]> {
      const uploadPromises = files.map(async (file) => {
         try {
            let uploadResult: any = null;

            if ((file as any).buffer) {
               const base64 = `data:${file.mimetype
                  };base64,${file.buffer.toString("base64")}`;
               uploadResult = await cloudinary.uploader.upload(base64, {
                  folder: "tutor-certifications",
                  resource_type: "image",
               });
            } else if ((file as any).path) {
               uploadResult = await cloudinary.uploader.upload(
                  (file as any).path,
                  {
                     folder: "tutor-certifications",
                     resource_type: "image",
                  }
               );
            }

            return uploadResult?.secure_url || "";
         } catch (err) {
            console.error("Certification image upload failed:", err);
            return "";
         }
      });

      return Promise.all(uploadPromises);
   }

   async deleteCertificationImage(
      tutorId: string,
      certificationIndex: number,
      imageIndex: number
   ): Promise<ITutor> {
      const tutor = await Tutor.findById(tutorId);

      if (
         !tutor ||
         !tutor.certifications ||
         !tutor.certifications[certificationIndex]
      ) {
         throw new NotFoundError("Chứng chỉ hoặc hình ảnh không tìm thấy");
      }

      const certification = tutor.certifications[certificationIndex];
      if (certification.imageUrls && certification.imageUrls[imageIndex]) {
         certification.imageUrls.splice(imageIndex, 1);
      }

      await tutor.save();
      return tutor as ITutor;
   }
}

export default new TutorService();
