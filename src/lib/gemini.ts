import { GoogleGenAI, Type } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY as string,
  dangerouslyAllowBrowser: true,
});

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

export async function generateScriptWorkup(productInfo: string, targetAudience: string, scriptType: string = "Review") {
  const prompt = `
    You are a viral TikTok Shop Affiliate expert.
    Analyze this product: "${productInfo}" for this target audience: "${targetAudience}".

    First, provide a detailed AI Strategic Analysis (the workup) of consumer PAINS this product solves and corresponding SOLUTIONS.

    Then, generate 5 DIFFERENT OPTIONS for a viral "${scriptType}" video.
    Each of the 5 options must be complete and include:
    1. A Scroll-Stopping HOOK with:
       - Visual: What we see in the first 2 seconds.
       - TOS: Text on Screen overlay.
       - Verbal: Exactly what is said.
    2. A high-converting SCRIPT that flows perfectly from the hook. 
       - Include both Visual (V) and Verbal (A) cues.
       - Format it clearly.
    3. An SEO-optimized CAPTION for TikTok.
    4. 5 trending and appropriate HASHTAGS.

    Return the result in JSON format with this structure:
    {
      "workup": "A comprehensive markdown summary of pains, solutions, and brand vibe. Use H3 headers (###), bullet points, and bold text for a clean, professional look. Format it like a high-level strategic analysis.",
      "options": [
        {
          "hook": {
            "visual": "string",
            "tos": "string",
            "verbal": "string"
          },
          "script": "string (the full script content)",
          "caption": "string",
          "hashtags": ["string"]
        }
      ]
    }
  `;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8096,
      messages: [
        {
          role: "user",
          content: prompt + "\n\nReturn ONLY valid JSON with no markdown code blocks.",
        },
      ],
    });

    const block = response.content[0];
    if (block.type !== "text") return {};

    let cleanedText = block.text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("AI Generation or Parse Error:", error);
    return {
      workup: "Error generating content. The response was too large or malformed.",
      hooks: [],
      scripts: [],
      hashtags: [],
      captions: []
    };
  }
}
