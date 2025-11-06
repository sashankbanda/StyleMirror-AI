
import { GoogleGenAI, Modality } from "@google/genai";
import { StyleOption, StyleMirrorResponse } from '../types';
import { STYLE_MIRROR_SYSTEM_PROMPT } from '../constants';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
};

function getMimeType(base64Data: string): string {
    // Basic check for common image types, default to jpeg
    if (base64Data.startsWith('/9j/')) return 'image/jpeg';
    if (base64Data.startsWith('iVBORw0KGgo=')) return 'image/png';
    if (base64Data.startsWith('UklGR')) return 'image/webp';
    return 'image/jpeg';
}

export async function generateStylePrompt(
  referenceImageBase64: string,
  userImageBase64: string,
  options: StyleOption[],
  manualText: string
): Promise<StyleMirrorResponse> {
  const model = 'gemini-2.5-pro';

  const referenceMimeType = getMimeType(referenceImageBase64);
  const userMimeType = getMimeType(userImageBase64);

  const parts = [
    { text: STYLE_MIRROR_SYSTEM_PROMPT },
    { text: "--- USER INPUT ---" },
    { text: "Reference Image:" },
    fileToGenerativePart(referenceImageBase64, referenceMimeType),
    { text: "User Image:" },
    fileToGenerativePart(userImageBase64, userMimeType),
    { text: `Selected Options: ${options.length > 0 ? options.join(', ') : 'None'}` },
    { text: `Manual Text: ${manualText || 'None'}` },
  ];

  const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: parts }],
      config: {
          responseMimeType: "application/json",
      }
  });

  try {
    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText) as StyleMirrorResponse;
    return parsedJson;
  } catch (e) {
    console.error("Failed to parse JSON response:", response.text);
    throw new Error("The AI returned an invalid response format. Please try again.");
  }
}

export async function generateStyledImage(
  userImageBase64: string,
  prompt: string
): Promise<string> {
  const model = 'gemini-2.5-flash-image';
  const userMimeType = getMimeType(userImageBase64);

  const parts = [
    fileToGenerativePart(userImageBase64, userMimeType),
    { text: prompt },
  ];

  const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        responseModalities: [Modality.IMAGE],
      }
  });

  const firstPart = response.candidates?.[0]?.content?.parts?.[0];

  if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
    const imageBase64 = firstPart.inlineData.data;
    const mimeType = firstPart.inlineData.mimeType;
    return `data:${mimeType};base64,${imageBase64}`;
  }

  throw new Error("No image was generated. The model may not have been able to process the request.");
}
