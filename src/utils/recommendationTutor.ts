import client from "../config/openAI";

/**
 * Kiểu dữ liệu AI trả về: danh sách tutorId
 */
export interface RecommendationItem {
   tutorId: string;
}

/**
 * Chuẩn hoá dữ liệu hồ sơ học sinh đưa vào prompt
 */
function buildStudentProfileForPrompt(student: any) {
   return {
      id: String(student._id),
      subjectsInterested: student.subjectsInterested || [],
      gradeLevel: student.gradeLevel || null,
      bio: student.bio || "",
      learningGoals: student.learningGoals || "",
      availability: student.availability || [],
   };
}

/**
 * Chuẩn hoá dữ liệu danh sách gia sư đưa vào prompt
 * (chỉ lấy các field cần thiết cho việc so sánh, bỏ imageUrls trong certifications)
 */
function buildTutorsForPrompt(tutors: any[]) {
   return tutors.map((t) => ({
      id: String(t._id),
      user: t.userId
         ? {
              id: String(t.userId._id),
              name: t.userId.name,
              email: t.userId.email,
              gender: t.userId.gender,
              phone: t.userId.phone,
              address: t.userId.address,
              avatarUrl: t.userId.avatarUrl,
           }
         : null,
      subjects: t.subjects || [],
      levels: t.levels || [],
      education: t.education || [],
      certifications: Array.isArray(t.certifications)
         ? t.certifications.map((c: any) => ({
              name: c.name,
              description: c.description,
           }))
         : [],
      experienceYears: t.experienceYears ?? 0,
      hourlyRate: t.hourlyRate ?? 0,
      bio: t.bio || "",
      classType: t.classType || [],
      // availability: t.availability || [],
      isApproved: !!t.isApproved,
      // ratings: t.ratings || { average: 0, totalReviews: 0 },
   }));
}

/**
 * Gọi OpenAI Responses API để lấy thứ tự gợi ý tutor
 */
export async function getRecommendedTutorOrder(
   student: any,
   tutors: any[]
): Promise<RecommendationItem[]> {
   const studentProfile = buildStudentProfileForPrompt(student);
   const tutorsProfile = buildTutorsForPrompt(tutors);

   const inputPayload = {
      student: studentProfile,
      tutors: tutorsProfile,
   };

   const systemInstruction =
      "Bạn là hệ thống gợi ý gia sư thông minh. " +
      "Nhiệm vụ: Phân tích hồ sơ học sinh và danh sách gia sư đã duyệt, chọn ra tối đa 10 gia sư phù hợp nhất, xếp theo độ khớp giảm dần. " +
      "Tiêu chí đánh giá (với trọng số): " +
      "- Trùng môn học (40%): Gia sư phải dạy môn học trùng với subjectsInterested của học sinh. " +
      "- Cấp học phù hợp (30%): Gia sư dạy levels gần với gradeLevel của học sinh (ưu tiên cùng cấp hoặc cao hơn 1-2 cấp). " +
      "- Mục tiêu học tập & Bio (20%): Gia sư có bio/education/certifications liên quan đến learningGoals và bio của học sinh. " +
      "- Kinh nghiệm (10%): Gia sư có experienceYears cao hơn (tối thiểu 1 năm). " +
      "- ClassType: Linh hoạt (ONLINE/IN_PERSON đều OK). " +
      "Yêu cầu: Trả về danh sách tutorId của các gia sư phù hợp. Nếu không có, trả về danh sách rỗng. Chỉ trả về JSON theo schema.";

   // Sử dụng Responses API + Structured Outputs để nhận JSON chuẩn
   const response = await client.responses.create({
      model: "gpt-4o",
      instructions: systemInstruction,
      input: JSON.stringify(inputPayload),
      text: {
         format: {
            type: "json_schema",
            name: "tutor_recommendations",
            strict: true,
            schema: {
               type: "object",
               properties: {
                  recommendations: {
                     type: "array",
                     items: {
                        type: "object",
                        properties: {
                           tutorId: { type: "string" },
                        },
                        required: ["tutorId"],
                        additionalProperties: false,
                     },
                  },
               },
               required: ["recommendations"],
               additionalProperties: false,
            },
         },
      },
   });

   // --- ADDED: log token usage (fallback to inspect response if usage not present)
   const respAny = response as any;
   const usage =
      respAny.usage ||
      respAny.meta?.usage ||
      respAny.output?.reduce?.(
         (acc: any, it: any) => (it?.usage ? { ...acc, ...it.usage } : acc),
         {}
      );

   if (
      usage &&
      (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens)
   ) {
      console.log("[OpenAI] token usage:", {
         prompt_tokens: usage.prompt_tokens ?? null,
         completion_tokens: usage.completion_tokens ?? null,
         total_tokens: usage.total_tokens ?? null,
      });
   } else {
      // fallback: dump response keys to help debug token info shape
      console.log("[OpenAI] response keys:", Object.keys(respAny || {}));
   }
   // --- END ADDED

   // SDK v4 có helper output_text
   const raw = (response as any).output_text as string;
   if (!raw) {
      return [];
   }

   try {
      const parsed = JSON.parse(raw);
      const list: RecommendationItem[] = parsed.recommendations || [];
      return list;
   } catch (err) {
      console.error("Parse recommendation JSON failed:", err);
      return [];
   }
}
