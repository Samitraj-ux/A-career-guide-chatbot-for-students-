import React, { useState, useEffect, useRef } from 'react';
import { Message, Citation } from './types';
import Header from './components/Header';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import CareerPathForm from './components/CareerPathForm';
import { LoadingSpinner } from './components/icons';

const VIDEO_STATUS_MESSAGES = [
    "Warming up the video cameras...",
    "Action! Your video generation has started.",
    "This can take a few minutes, please wait...",
    "Gathering pixels and arranging them perfectly.",
    "Rendering the final cut.",
    "Almost there, adding the finishing touches!",
];

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [videoStatus, setVideoStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isCareerModalOpen, setIsCareerModalOpen] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const videoStatusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
     if (messages.length === 0) {
        setMessages([
          {
            id: 'init-message',
            role: 'model',
            text: "Hello! I am your AI Career Guide. I can help you with resume reviews, interview practice, or exploring new career paths. How can I assist you with your career goals today?",
          },
        ]);
      }
  }, []);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isGeneratingVideo]);

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
    if (isLoading || isGeneratingVideo) return;

    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: prompt };
    setMessages(prev => [...prev, userMessage]);
    setIsGeneratingVideo(true);
    startVideoStatusUpdates();
    setError(null);

    const botMessageId = `model-${Date.now()}`;
    let botMessage: Message = { id: botMessageId, role: 'model', text: 'Video generation in progress...', videoUrl: '' };
    setMessages(prev => [...prev, botMessage]);

    try {
        const response = await fetch('http://localhost:5000/api/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `Request failed with status ${response.status}`);
        }

        const videoBlob = await response.blob();
        const videoUrl = URL.createObjectURL(videoBlob);
        
        botMessage = { ...botMessage, text: `Video generated for prompt: "${prompt}"`, videoUrl: videoUrl };
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

  const handleExploreCareers = (skills: string, interests: string, experience: string) => {
    const userPrompt = `I want to explore career paths. Here is my profile:\n\n**Skills:**\n${skills}\n\n**Interests:**\n${interests}\n\n**Professional Experience:**\n${experience}`;

    const systemInstruction = `You are a helpful and encouraging career advisor. Based on the user's skills, interests, and experience, suggest three relevant career paths. For each path, provide:\n1. A brief description of the career.\n2. The required qualifications and typical skills.\n3. The general job outlook, including demand and potential salary range.\n\nFormat your entire response in Markdown. Use a level 3 heading (###) for each career path title. Use bold for subheadings like **Description**, **Qualifications**, and **Job Outlook**.`;

    handleSendMessage(userPrompt, false, systemInstruction);
  };

  const handleSendMessage = async (text: string, isWebSearchEnabled: boolean, systemInstruction?: string) => {
    if (isLoading || isGeneratingVideo) return;

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

      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            history,
            text,
            isWebSearchEnabled,
            systemInstruction,
        }),
      });

      if (!response.ok || !response.body) {
          const errData = await response.json();
          throw new Error(errData.error || `Request failed with status ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let citations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value);
        const lines = chunkStr.split('\n\n');
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonData = line.substring(6);
                if (jsonData) {
                    try {
                        const parsedData = JSON.parse(jsonData);
                        if (parsedData.text) {
                            fullResponse += parsedData.text;
                        }
                        if (parsedData.citations) {
                            citations = parsedData.citations; // Overwrite with the latest citation list
                        }
                        setMessages(prev => prev.map(msg => 
                            msg.id === botMessageId 
                            ? { ...msg, text: fullResponse, citations: [...citations] } 
                            : msg
                        ));
                    } catch (e) {
                        console.error("Failed to parse stream chunk JSON:", jsonData, e);
                    }
                }
            }
        }
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
            <div className="container mx-auto max-w-4xl px-4 mb-4">
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
          onExploreCareersClick={() => setIsCareerModalOpen(true)}
          isLoading={isLoading}
          isGeneratingVideo={isGeneratingVideo}
        />
      </div>
      {isCareerModalOpen && (
        <CareerPathForm 
            onClose={() => setIsCareerModalOpen(false)}
            onSubmit={handleExploreCareers}
        />
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