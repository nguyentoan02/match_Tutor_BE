import { Request, Response } from "express";
import { UnauthorizedError } from "../utils/error.response";
import parentRequestService from "../services/parentRequest.service";
import { OK } from "../utils/success.response";

class ParentRequestController {
   async studentSendRequest(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const { parentEmail, parentName, relationship } = req.body;
      await parentRequestService.inviteParent(
         parentEmail,
         currentUser._id.toString(),
         parentName,
         currentUser.name,
         relationship
      );
      new OK({ message: "Parent invitation sent successfully" }).send(res);
   }

   async activeParentAccount(req: Request, res: Response) {
      const { activeToken } = req.query;
      const { password } = req.body;
      if (typeof activeToken !== "string") {
         throw new UnauthorizedError("Invalid or missing activation token");
      }
      const parentProfile = await parentRequestService.activeParentAccount(
         activeToken,
         password
      );
      new OK({
         message: "Parent account activated successfully",
         metadata: parentProfile,
      }).send(res);
   }

   async acceptInvitation(req: Request, res: Response) {
      const { acceptToken } = req.query;
      if (typeof acceptToken !== "string") {
         throw new UnauthorizedError("Invalid or missing accept token");
      }
      const parentProfile = await parentRequestService.acceptInvitation(
         acceptToken
      );
      new OK({
         message: "Parent invitation accepted successfully",
         metadata: parentProfile,
      }).send(res);
   }
}

export default new ParentRequestController();
