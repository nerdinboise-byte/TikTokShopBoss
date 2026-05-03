import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const contentGeneratorModel = "gemini-3-flash-preview";
export const imageGeneratorModel = "gemini-2.5-flash-image";

export async function generateSocialContent(idea: string, tone: string) {
  const prompt = `
    You are a social media expert and shop affiliate marketing specialist.
    Create high-performing content drafts based on the following idea: "${idea}"
    Tone: "${tone}"

    Please provide:
    1. A LinkedIn post (long-form, professional but engaging).
    2. A Twitter/X post (short, punchy, includes relevant tags).
    3. An Instagram caption (visual-focused, includes hashtags).
    4. A TikTok script for a Shop Affiliate video (includes hook, body, and call-to-action).

    Return the result in JSON format with keys: linkedin, twitter, instagram, script.
  `;

  const response = await ai.models.generateContent({
    model: contentGeneratorModel,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function generatePlatformImage(prompt: string, aspectRatio: string) {
  const response = await ai.models.generateContent({
    model: imageGeneratorModel,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function generateScriptWorkup(productInfo: string, targetAudience: string) {
  const prompt = `
    You are a viral TikTok Shop Affiliate expert.
    Analyze this product: "${productInfo}" for this target audience: "${targetAudience}".

    Provide:
    1. A detailed workup of consumer PAINS this product solves and corresponding SOLUTIONS.
    2. A brief overview of the product and brand vibe.
    3. 5 viral HOOKS. For each hook provide:
       - Visual: What we see in the first 2 seconds.
       - TOS: Text on Screen overlay.
       - Verbal: Exactly what is said.
    4. 5 DIFFERENT types of video scripts: GRWM/OOTD, Storytelling, Unboxing, Review, and Tutorial. Ensure each script is high-converting and follows the specific format of its category.
    5. 5 trending and appropriate hashtags for TikTok SEO.
    6. 5 SEO-optimized captions for TikTok.

    Return the result in JSON format with this structure:
    {
      "workup": "A comprehensive markdown summary of pains, solutions, and brand vibe. Use H3 headers (###), bullet points, and bold text for a clean, professional look. Do not return one long paragraph.",
      "hooks": [{"visual": "string", "tos": "string", "verbal": "string"}],
      "scripts": [{"type": "string", "title": "string", "content": "string"}],
      "hashtags": ["string"],
      "captions": ["string"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: contentGeneratorModel,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            workup: { type: Type.STRING },
            hooks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  visual: { type: Type.STRING },
                  tos: { type: Type.STRING },
                  verbal: { type: Type.STRING }
                },
                required: ["visual", "tos", "verbal"]
              }
            },
            scripts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  title: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ["type", "title", "content"]
              }
            },
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            captions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["workup", "hooks", "scripts", "hashtags", "captions"]
        }
      },
    });

    if (!response.text) return {};

    let cleanedText = response.text.trim();
    // Remove potential markdown code blocks if the model includes them despite JSON mode
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("AI Generation or Parse Error:", error);
    // Return a structured fallback if parsing fails
    return {
      workup: "Error generating content. The response was too large or malformed.",
      hooks: [],
      scripts: [],
      hashtags: [],
      captions: []
    };
  }
}
