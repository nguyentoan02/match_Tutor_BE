import client from "../config/openAI";

export const embedding = async (input: string) => {
   const embededResponse = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: input,
      encoding_format: "float",
   });

   console.log("embeding response: ", embededResponse);

   return embededResponse.data[0].embedding;
};

export const translate = async (textEmbed: string) => {
   const chatReponse = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
         {
            role: "system",
            content: "Dịch text sau sang tiếng Việt hợp ngữ cảnh nhất",
         },
         { role: "user", content: textEmbed },
      ],
      temperature: 0.5,
   });

   const translated = chatReponse.choices[0].message?.content;

   return translated
};
