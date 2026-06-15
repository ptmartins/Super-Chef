import Anthropic from "@anthropic-ai/sdk";
import type { RecipeTranslationPt } from "@/types";

const client = new Anthropic();

export async function translateRecipeToPortuguese(fields: {
  title: string;
  description: string;
  ingredients: { name: string }[];
  steps: { description: string }[];
  tags: string[];
}): Promise<RecipeTranslationPt | null> {
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: `You are a professional culinary translator specialising in European Portuguese (PT-PT).
Translate the provided JSON fields from English to Portuguese.
Rules:
- Return ONLY valid JSON with the exact same structure as the input
- Preserve proper nouns, brand names, and unit measurements exactly as-is
- Use European Portuguese (not Brazilian Portuguese)
- Do not add any explanation, markdown, or wrapping text outside the JSON`,
      messages: [{ role: "user", content: JSON.stringify(fields) }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    // Strip accidental markdown code fences if Claude adds them
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(jsonStr) as RecipeTranslationPt;
  } catch (err) {
    console.error("[translate] Failed to auto-translate recipe:", err);
    return null;
  }
}
