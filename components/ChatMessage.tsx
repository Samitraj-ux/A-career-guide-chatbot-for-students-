import React from 'react';
import { Message } from '../types';
import { BotIcon, UserIcon, LoadingSpinner } from './icons';

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLoading = false }) => {
  const isUserModel = message.role === 'model';

  return (
    <div className={`flex items-start gap-4 py-6 ${!isUserModel && 'flex-row-reverse'}`}>
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isUserModel ? 'bg-gemini-purple' : 'bg-gemini-blue'
        }`}
      >
        {isUserModel ? (
          <BotIcon className="w-6 h-6 text-white" />
        ) : (
          <UserIcon className="w-6 h-6 text-white" />
        )}
      </div>
      <div className={`rounded-lg px-4 py-3 max-w-[85%] md:max-w-[75%] ${isUserModel ? 'bg-gemini-dark-card' : 'bg-gemini-blue'}`}>
        {isLoading && !message.text && !message.videoUrl ? (
            <LoadingSpinner />
        ) : (
            <>
                {message.text && (
                    <p className={`whitespace-pre-wrap ${isUserModel ? 'text-gemini-light-text' : 'text-white'}`}>
                        {message.text}
                    </p>
                )}
                {message.videoUrl && (
                    <div className="mt-2">
                        <video controls src={message.videoUrl} className="w-full rounded-md" />
                    </div>
                )}
            </>
        )}
        {message.citations && message.citations.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/20">
                <h3 className="text-sm font-semibold mb-2 text-gemini-light-text">Sources:</h3>
                <div className="flex flex-wrap gap-2">
                    {message.citations.map((citation, index) => (
                        <a 
                            key={index}
                            href={citation.uri} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs bg-gemini-dark/80 text-gemini-blue rounded-full px-3 py-1 hover:bg-gemini-dark transition-colors"
                        >
                            {index + 1}. {citation.title}
                        </a>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
