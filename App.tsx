import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Message, Citation } from './types';
import Header from './components/Header';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { LoadingSpinner } from './components/icons';

const SYSTEM_INSTRUCTION = 'You are a professional and encouraging AI career guide. Your goal is to provide insightful advice on resumes, cover letters, interview skills, and career pathing. Your tone should be supportive, clear, and action-oriented. Use formatting like lists and bold text to make your advice easy to digest.';

const VIDEO_STATUS_MESSAGES = [
    "Warming up the video cameras...",
    "Action! Your video generation has started.",
    "This can take a few minutes, please wait...",
    "Gathering pixels and arranging them perfectly.",
    "Rendering the final cut.",
    "Almost there, adding the finishing touches!",
];

const INITIAL_API_KEY = 'AIzaSyBcxuVS3M8WigfLWqzLTLCZdTxfFPdTdRI';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [videoStatus, setVideoStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<GoogleGenAI | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const videoStatusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const keyFromStorage = localStorage.getItem('gemini_api_key');
    const effectiveKey = keyFromStorage || INITIAL_API_KEY || process.env.API_KEY;

    if (effectiveKey) {
      // If the key we're using is the initial hardcoded one and it's not already in storage,
      // save it there for future sessions.
      if (effectiveKey === INITIAL_API_KEY && !keyFromStorage) {
        localStorage.setItem('gemini_api_key', effectiveKey);
      }
      initializeAi(effectiveKey);
    } else {
      setIsApiKeyMissing(true);
    }
  }, []);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isGeneratingVideo]);

  const initializeAi = (key: string) => {
    try {
      const genAI = new GoogleGenAI({ apiKey: key });
      setAi(genAI);
      setApiKey(key);
      setIsApiKeyMissing(false);
      setError(null);
       if (messages.length === 0) {
        setMessages([
          {
            id: 'init-message',
            role: 'model',
            text: "Hello! I am your AI Career Guide. I can help you with resume reviews, interview practice, or exploring new career paths. How can I assist you with your career goals today?",
          },
        ]);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Initialization Error: ${errorMessage}. Please provide a valid API key.`);
      localStorage.removeItem('gemini_api_key');
      setIsApiKeyMissing(true);
    }
  };

  const handleApiKeySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (tempApiKey.trim()) {
      localStorage.setItem('gemini_api_key', tempApiKey);
      initializeAi(tempApiKey);
      setTempApiKey('');
    }
  };

  const startVideoStatusUpdates = () => {
    let index = 0;
    setVideoStatus(VIDEO_STATUS_MESSAGES[index]);
    videoStatusIntervalRef.current = setInterval(() => {
        index = (index + 1) % VIDEO_STATUS_MESSAGES.length;
        setVideoStatus(VIDEO_STATUS_MESSAGES[index]);
    }, 5000);
  };

  const stopVideoStatusUpdates = () => {
    if (videoStatusIntervalRef.current) {
        clearInterval(videoStatusIntervalRef.current);
        videoStatusIntervalRef.current = null;
    }
  };
  
  const handleGenerateVideo = async (prompt: string) => {
    if (isLoading || isGeneratingVideo || !ai || !apiKey) return;

    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: prompt };
    setMessages(prev => [...prev, userMessage]);
    setIsGeneratingVideo(true);
    startVideoStatusUpdates();
    setError(null);

    const botMessageId = `model-${Date.now()}`;
    let botMessage: Message = { id: botMessageId, role: 'model', text: 'Video generation in progress...', videoUrl: '' };
    setMessages(prev => [...prev, botMessage]);

    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: prompt,
            config: { numberOfVideos: 1 }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
            const videoBlob = await videoResponse.blob();
            const videoUrl = URL.createObjectURL(videoBlob);
            
            botMessage = { ...botMessage, text: `Video generated for prompt: "${prompt}"`, videoUrl: videoUrl };
        } else {
             throw new Error("Video generation completed, but no download link was found.");
        }
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? `Video Error: ${e.message}` : "An unknown error occurred during video generation.";
        setError(errorMessage);
        botMessage = { ...botMessage, text: errorMessage };
        console.error(e);
    } finally {
        setMessages(prev => prev.map(msg => msg.id === botMessageId ? botMessage : msg));
        setIsGeneratingVideo(false);
        stopVideoStatusUpdates();
    }
  };

  const handleSendMessage = async (text: string, isWebSearchEnabled: boolean) => {
    if (isLoading || isGeneratingVideo || !ai) return;

    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    
    const botMessageId = `model-${Date.now()}`;
    setMessages(prev => [...prev, { id: botMessageId, role: 'model', text: '' }]);

    try {
      const history = messages.map(msg => ({
          role: msg.role, parts: [{ text: msg.text }],
      })).filter(msg => msg.role !== 'model' || msg.parts[0].text);

      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [...history, { role: 'user', parts: [{ text }] }],
        config: {
            ...(isWebSearchEnabled && { tools: [{ googleSearch: {} }] }),
            systemInstruction: SYSTEM_INSTRUCTION
        }
      });
      
      let fullResponse = '';
      let citations: Citation[] = [];

      for await (const chunk of stream) {
        fullResponse += chunk.text;
        const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata?.groundingChunks) {
            citations = groundingMetadata.groundingChunks.map((c: any) => c.web).filter(Boolean);
        }
        setMessages(prev => prev.map(msg => msg.id === botMessageId ? { ...msg, text: fullResponse, citations } : msg));
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? `Error: ${e.message}` : "An unknown error occurred.";
      setError(errorMessage);
       setMessages(prev => prev.map(msg => msg.id === botMessageId ? { ...msg, text: errorMessage } : msg));
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gemini-dark">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-4xl p-4">
          {messages.map((msg, index) => (
             <ChatMessage 
                key={msg.id} 
                message={msg}
                isLoading={isLoading && index === messages.length - 1 && msg.role === 'model'}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
         {error && (
            <div className="container mx-auto max-w-4xl px-4">
                <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg text-center">
                    {error}
                </div>
            </div>
        )}
      </main>
      <div className="sticky bottom-0">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          onGenerateVideo={handleGenerateVideo}
          isLoading={isLoading || !ai}
          isGeneratingVideo={isGeneratingVideo}
        />
      </div>
      {isApiKeyMissing && (
        <div className="absolute inset-0 bg-gemini-dark/90 backdrop-blur-sm flex flex-col items-center justify-center z-30 p-4">
            <div className="bg-gemini-dark-card p-8 rounded-lg shadow-2xl w-full max-w-md text-center">
                <h2 className="text-2xl font-bold mb-4 text-gemini-dark-text">Enter Gemini API Key</h2>
                <p className="text-gemini-light-text mb-6">
                    To use this app, please enter your Google Gemini API key. You can get one from Google AI Studio.
                </p>
                <form onSubmit={handleApiKeySubmit}>
                    <input
                        type="password"
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        placeholder="Enter your API key"
                        className="w-full bg-gemini-dark border border-white/20 rounded-lg p-3 mb-4 text-gemini-dark-text focus:ring-2 focus:ring-gemini-blue focus:outline-none"
                    />
                    <button
                        type="submit"
                        className="w-full p-3 rounded-lg bg-gemini-blue text-white font-semibold hover:bg-blue-500 transition-colors"
                    >
                        Save and Continue
                    </button>
                </form>
            </div>
        </div>
      )}
      {isGeneratingVideo && (
        <div className="absolute inset-0 bg-gemini-dark/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <LoadingSpinner />
            <p className="text-gemini-light-text text-lg mt-4 animate-pulse">{videoStatus}</p>
        </div>
      )}
    </div>
  );
};

export default App;