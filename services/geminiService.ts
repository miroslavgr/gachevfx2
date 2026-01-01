// services/geminiService.ts
import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

// 1. Prepare the connection to your "PHP Script" (Cloud Function)
const chatFunction = httpsCallable(functions, 'chatWithMentor');

export const chatWithAssistant = async (
    message: string, 
    history: { role: 'user' | 'model', parts: { text: string }[] }[],
    useThinking: boolean = false
) => {
    try {
        // 2. Call the backend securely
        const result: any = await chatFunction({
            message,
            history,
            systemInstruction: "You are an elite trading assistant for XAUUSD scalpers."
        });
        
        // 3. Return the text from the server
        return result.data.text;
    } catch (error) {
        console.error("Cloud Function Error:", error);
        return "System Error: Unable to reach the Mentor. Please try again.";
    }
};

const reviewTradeFunction = httpsCallable(functions, 'reviewTrade');

// --- Placeholders for features we will enable later ---
export const reviewTrade = async (trade: any, base64Image?: string) => {
    try {
        const result: any = await reviewTradeFunction({
            tradeDetails: {
                pair: trade.pair,
                direction: trade.direction,
                entry: trade.entryPrice,
                stopLoss: trade.stopLoss,
                takeProfit: trade.takeProfit,
                strategy: "Scalping" // Or pass from UI if you have it
            },
            base64Image: base64Image
        });

        return result.data.text;
    } catch (error) {
        console.error("Cloud Vision Error:", error);
        return "System Error: Unable to analyze the chart.";
    }
};

export const transcribeAudio = async (base64: string) => ""; 
export const generateSpeech = async (text: string) => null;
export const getMarketNews = async (query: string) => ({ text: "News unavailable", chunks: [] });
export const analyzeVideo = async () => "Video analysis unavailable";