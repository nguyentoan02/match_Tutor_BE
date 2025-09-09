import { UpdateUserBody } from "../schemas/user.schema";
import User from "../models/user.model";
import cloudinary from "../config/cloudinary";
import { NotFoundError } from "../utils/error.response";
import { IUser } from "../types/types/user";

export class UserService {
   async getById(id: string): Promise<IUser | null> {
      return await User.findById(id).select("-password").lean();
   }

   // Cập nhật profile (mở rộng: name, phone, gender, address, avatar)
   async updateProfile(
      userId: string,
      data: Partial<UpdateUserBody>,
      file?: Express.Multer.File
   ): Promise<IUser> {
      const user = await User.findById(userId).select("+password");
      if (!user) {
         throw new NotFoundError("User not found");
      }

      // Use !== undefined so empty-string updates are respected if frontend sends them
      if (data.name !== undefined) user.name = data.name as any;
      if (data.phone !== undefined) user.phone = data.phone as any;
      if ((data as any).gender !== undefined)
         user.gender = (data as any).gender as any;

      // Handle address sent as object OR JSON string OR discrete fields (city/street)
      if (
         (data as any).address !== undefined &&
         (data as any).address !== null
      ) {
         let addr: any = (data as any).address;
         if (typeof addr === "string") {
            try {
               addr = JSON.parse(addr);
            } catch (e) {
               // nếu không parse được thì bỏ qua parsing, giữ nguyên value
               addr = {};
            }
         }
         if (typeof addr === "object") {
            user.address = {
               ...(user.address || {}),
               ...(addr.city !== undefined ? { city: addr.city } : {}),
               ...(addr.street !== undefined ? { street: addr.street } : {}),
               ...(addr.lat !== undefined ? { lat: addr.lat } : {}),
               ...(addr.lng !== undefined ? { lng: addr.lng } : {}),
            };
         }
      }

      // Compatibility: accept city/street sent as top-level fields
      if ((data as any).city !== undefined) {
         user.address = { ...(user.address || {}), city: (data as any).city };
      }
      if ((data as any).street !== undefined) {
         user.address = {
            ...(user.address || {}),
            street: (data as any).street,
         };
      }

      // Nếu kèm file avatar -> upload lên Cloudinary
      if (file) {
         try {
            let uploadResult: any = null;
            // multer memoryStorage provides buffer
            if ((file as any).buffer) {
               const base64 = `data:${
                  file.mimetype
               };base64,${file.buffer.toString("base64")}`;
               uploadResult = await cloudinary.uploader.upload(base64, {
                  folder: "avatars",
                  resource_type: "image",
               });
            } else if ((file as any).path) {
               // multer diskStorage -> upload from path
               uploadResult = await cloudinary.uploader.upload(
                  (file as any).path,
                  {
                     folder: "avatars",
                     resource_type: "image",
                  }
               );
            }
            if (uploadResult && uploadResult.secure_url) {
               user.avatarUrl = uploadResult.secure_url;
            }
         } catch (err) {
            // Log nhưng không throw để không block các cập nhật khác
            console.error("Avatar upload failed:", err);
         }
      }

      await user.save();

      const userObj = user.toObject();
      delete (userObj as any).password;

      return userObj as IUser;
   }
}

export default new UserService();
