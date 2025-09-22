export const getParentRequestEmailTemplate = (
   parentName: string,
   studentName: string,
   activeUrl: string,
   relationship: string
): string => {
   return `
     <div style="font-family: Arial, sans-serif; color: #333;">
       <h2>Thư mời từ ${studentName}</h2>
       <p>Chào ${parentName},</p>
       <p>
         Em là <strong>${studentName}</strong>, con của ${relationship}.<br/>
         Em muốn mời ${relationship} tham gia nền tảng <strong>Match Tutor</strong> để cùng giám sát và đồng hành với quá trình học tập của em.
       </p>
       <p>
         Để bắt đầu, ${relationship} vui lòng nhấn vào đường link dưới đây để kích hoạt tài khoản của mình:
       </p>
       <p>
         <a href="${activeUrl}" style="color: #1a73e8; text-decoration: none;">
           Kích hoạt tài khoản Match Tutor
         </a>
       </p>
       <p>
         Nếu ${relationship} có bất kỳ thắc mắc nào, hãy liên hệ với chúng con hoặc đội ngũ hỗ trợ của Match Tutor.<br/>
         Cảm ơn ${relationship} đã đồng hành cùng con!
       </p>
       <p>Trân trọng,<br/>${studentName}</p>
     </div>
   `;
};

export const getParentRequestAddChildEmailTemplate = (
   parentName: string,
   studentName: string,
   relationship: string,
   inviteUrl: string
): string => {
   return `
     <div style="font-family: Arial, sans-serif; color: #333;">
       <h2>Lời mời từ nền tảng Match Tutor của ${studentName}</h2>
       <p>Chào ${parentName},</p>
       <p>
         Em là <strong>${studentName}</strong>, con của ${relationship}.<br/>
         Em muốn mời ${relationship} tham gia nền tảng <strong>Match Tutor</strong> để cùng giám sát và đồng hành với quá trình học tập của em.
       </p>
       <p>
         Khi ${relationship} tham gia, ${relationship} sẽ có thể theo dõi tiến trình học tập, nhận thông báo quan trọng và hỗ trợ em tốt hơn trong việc học.
       </p>
       <p>
         Để tham gia, ${relationship} vui lòng nhấn vào đường link dưới đây:
       </p>
       <p>
         <a href="${inviteUrl}" style="color: #1a73e8; text-decoration: none;">
           Tham gia Match Tutor
         </a>
       </p>
       <p>
         Nếu ${relationship} có bất kỳ thắc mắc nào, hãy liên hệ với chúng con hoặc đội ngũ hỗ trợ của Match Tutor.<br/>
         Cảm ơn ${relationship} đã luôn đồng hành cùng con!
       </p>
       <p>Trân trọng,<br/>${studentName}</p>
     </div>
   `;
};
