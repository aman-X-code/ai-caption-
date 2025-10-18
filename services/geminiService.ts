import { GoogleGenAI, Type } from "@google/genai";
import { Subtitle } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const subtitleSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      startTime: {
        type: Type.NUMBER,
        description: 'The start time of the entire subtitle line in seconds (e.g., 0.0, 1.5, 10.2).',
      },
      endTime: {
        type: Type.NUMBER,
        description: 'The end time of the entire subtitle line in seconds (e.g., 2.5, 5.0, 12.7).',
      },
      text: {
        type: Type.STRING,
        description: 'The full text content of the subtitle cue.',
      },
      words: {
        type: Type.ARRAY,
        description: 'An array of individual words with their own precise timestamps.',
        items: {
            type: Type.OBJECT,
            properties: {
                startTime: {
                    type: Type.NUMBER,
                    description: 'The start time of the specific word in seconds.',
                },
                endTime: {
                    type: Type.NUMBER,
                    description: 'The end time of the specific word in seconds.',
                },
                text: {
                    type: Type.STRING,
                    description: 'The word itself.',
                },
            },
            required: ['startTime', 'endTime', 'text'],
        }
      }
    },
    required: ['startTime', 'endTime', 'text', 'words'],
  },
};

export const generateSubtitles = async (captionText: string): Promise<Subtitle[]> => {
  const prompt = `
    You are an expert video subtitle synchronizer. Your task is to take a block of text and convert it into a highly detailed, timed subtitle track.
    1.  Break the text down into short, readable subtitle cues (lines).
    2.  For each line, provide a \`startTime\` and \`endTime\` in seconds.
    3.  CRITICAL: For each line, also provide a \`words\` array containing each individual word.
    4.  Each word in the \`words\` array must have its own precise \`startTime\` and \`endTime\`.
    5.  Word timings must be sequential and contained within the line's overall start and end time.
    6.  Assume a natural, conversational speaking pace. The final timestamp should roughly correspond to the total length of the text.
    The response must be a valid JSON array of subtitle objects, strictly following the provided schema. Do not output anything other than the JSON array.

    Here is the text:
    ---
    ${captionText}
    ---
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: subtitleSchema,
        temperature: 0.2,
      },
    });

    const jsonString = response.text.trim();
    const subtitles: Subtitle[] = JSON.parse(jsonString);
    
    // Basic validation
    if (!Array.isArray(subtitles) || subtitles.some(s => typeof s.startTime !== 'number' || typeof s.endTime !== 'number' || typeof s.text !== 'string' || !Array.isArray(s.words))) {
        throw new Error("AI returned data in an unexpected format.");
    }
    
    return subtitles;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate subtitles from Gemini API.");
  }
};
