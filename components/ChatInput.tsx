import React, { useState, useRef, KeyboardEvent } from 'react';
import { SendIcon, GlobeIcon, VideoIcon, BriefcaseIcon } from './icons';

interface ChatInputProps {
  onSendMessage: (message: string, isWebSearchEnabled: boolean) => void;
  onGenerateVideo: (prompt: string) => void;
  onExploreCareersClick: () => void;
  isLoading: boolean;
  isGeneratingVideo: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onGenerateVideo, onExploreCareersClick, isLoading, isGeneratingVideo }) => {
  const [input, setInput] = useState('');
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInputDisabled = isLoading || isGeneratingVideo;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const resetInput = () => {
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (input.trim() && !isInputDisabled) {
      onSendMessage(input, isWebSearchEnabled);
      resetInput();
    }
  };
  
  const handleVideoSubmit = () => {
    if (input.trim() && !isInputDisabled) {
      onGenerateVideo(input);
      resetInput();
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
    }
  };

  return (
    <div className="p-4 bg-gemini-dark/80 backdrop-blur-sm border-t border-white/10">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-center justify-end gap-x-4 mb-2 pr-2">
            <button
                onClick={onExploreCareersClick}
                disabled={isInputDisabled}
                className="flex items-center text-sm text-gemini-light-text disabled:opacity-50"
                aria-label="Explore career paths"
            >
                <BriefcaseIcon className="w-5 h-5 mr-2" />
                <span>Explore Career Paths</span>
            </button>
            <label htmlFor="web-search-toggle" className="flex items-center cursor-pointer">
                <GlobeIcon className="w-5 h-5 mr-2 text-gemini-light-text" />
                <span className="text-sm text-gemini-light-text mr-3">Search the web</span>
                <div className="relative">
                    <input 
                        type="checkbox" 
                        id="web-search-toggle" 
                        className="sr-only" 
                        checked={isWebSearchEnabled}
                        onChange={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                        disabled={isInputDisabled}
                    />
                    <div className="block bg-gemini-dark-card w-10 h-6 rounded-full"></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isWebSearchEnabled ? 'translate-x-full bg-gemini-blue' : ''}`}></div>
                </div>
            </label>
            <button 
              onClick={handleVideoSubmit}
              disabled={isInputDisabled || !input.trim()}
              className="flex items-center text-sm text-gemini-light-text disabled:opacity-50"
              aria-label="Generate video"
            >
              <VideoIcon className="w-5 h-5 mr-2" />
              <span>Generate video</span>
            </button>
        </div>
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            disabled={isInputDisabled}
            className="w-full bg-gemini-dark-card border border-white/20 rounded-lg p-3 pr-14 text-gemini-dark-text resize-none focus:ring-2 focus:ring-gemini-blue focus:outline-none transition-shadow disabled:opacity-50"
            style={{ maxHeight: '200px' }}
          />
          <button
            type="submit"
            disabled={isInputDisabled || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gemini-blue text-white disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
            aria-label="Send message"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInput;