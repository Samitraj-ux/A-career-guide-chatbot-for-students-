import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { Message, Citation } from './types';
import Header from './components/Header';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

const SYSTEM_INSTRUCTION = 'You are a helpful and friendly AI assistant. Your responses should be informative and well-formatted.';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<GoogleGenAI | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
      }
      const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
      setAi(genAI);
      setMessages([
        {
          id: 'init-message',
          role: 'model',
          text: "Hello! I'm your Gemini-powered assistant. How can I help you today?",
        },
      ]);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(`Initialization Error: ${e.message}`);
      } else {
        setError("An unknown initialization error occurred.");
      }
      console.error(e);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string, isWebSearchEnabled: boolean) => {
    if (isLoading || !ai) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    
    const botMessageId = `model-${Date.now()}`;
    setMessages(prev => [...prev, { id: botMessageId, role: 'model', text: '' }]);

    try {
      const history = messages.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }],
      })).filter(msg => msg.role !== 'model' || msg.parts[0].text); // Filter out empty model messages

      const config: any = {};
      if (isWebSearchEnabled) {
        config.tools = [{ googleSearch: {} }];
      }

      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [...history, { role: 'user', parts: [{ text }] }],
        config: {
            ...config,
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

        setMessages(prev =>
          prev.map(msg =>
            msg.id === botMessageId ? { ...msg, text: fullResponse, citations } : msg
          )
        );
      }
    } catch (e: unknown) {
      let errorMessage = "Sorry, I encountered an error. Please check the console for details and try again.";
      if (e instanceof Error) {
        errorMessage = `Error: ${e.message}`;
      }
      setError(errorMessage);
       setMessages(prev =>
          prev.map(msg =>
            msg.id === botMessageId ? { ...msg, text: errorMessage } : msg
          )
        );
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
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default App;
