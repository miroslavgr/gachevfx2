// functions/src/index.ts

import { onCall } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Setup Gemini with the secure API Key (we will set this key in the next step)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// 2. Define the "Chat" function (This is your API endpoint)
export const chatWithMentor = onCall(async (request) => {
  // Get the data sent from the React App (Frontend)
  const { message, history, systemInstruction } = request.data;

  // Initialize the specific model (Flash is faster/cheaper)
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: systemInstruction 
  });

  try {
    // Start the chat session
    const chat = model.startChat({
      history: history || [],
    });

    // Send the user's message to Google
    const result = await chat.sendMessage(message);
    const response = await result.response;
    
    // Return the text back to the React App
    return { text: response.text() };
  } catch (error) {
    console.error("AI Error:", error);
    // Return a safe error message to the user
    return { text: "System Error: The Mentor is currently offline." };
  }
});


export const reviewTrade = onCall(async (request) => {
  const { tradeDetails, base64Image } = request.data;

  // 1. Setup Model (Flash is great for images)
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: "You are a veteran forex mentor. Analyze the chart screenshot and trade details. Be critical."
  });

  try {
    // 2. Prepare the Image Part (if it exists)
    const promptParts: any[] = [
      `Analyze this trade setup for ${tradeDetails.pair} (${tradeDetails.direction}). 
       Entry: ${tradeDetails.entry}, SL: ${tradeDetails.stopLoss}, TP: ${tradeDetails.takeProfit}.
       Strategy: ${tradeDetails.strategy}.
       
       Give me a 3-bullet point critique on:
       1. Market Structure (Trends/Support/Resistance)
       2. Risk-to-Reward Ratio
       3. Probability of Success`
    ];

    if (base64Image) {
      // Remove header if present (e.g., "data:image/png;base64,")
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      
      promptParts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: "image/png"
        }
      });
    }

    // 3. Generate Analysis
    const result = await model.generateContent(promptParts);
    const response = await result.response;

    return { text: response.text() };

  } catch (error) {
    console.error("Vision Error:", error);
    return { text: "I could not analyze the image. Please try a smaller screenshot." };
  }
});
