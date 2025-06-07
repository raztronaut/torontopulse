import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, User, Loader2, TestTube, Zap } from 'lucide-react';
import { processAIQuerySimple } from '../core/ai/query-service';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
}

interface AIQueryPanelProps {
  onClose?: () => void;
}

export function AIQueryPanel({ onClose }: AIQueryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I\'m your Toronto city data assistant. Ask me about transit, infrastructure, events, or any city data you\'d like to explore.',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: 'Analyzing your query and fetching relevant Toronto data...',
      isUser: false,
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const startTime = Date.now();
      const response = await processAIQuerySimple(inputText);
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);

      const aiMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = aiMessage;
        return newMessages;
      });

      console.log(`AI query processed in ${duration}s`);
    } catch (error) {
      console.error('AI query error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = errorMessage;
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await processAIQuerySimple('Test connection - what data sources are available?');
      const testMessage: Message = {
        id: Date.now().toString(),
        text: `🔗 Connection test successful! ${response}`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, testMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: '❌ Connection test failed. Please check your setup.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const quickTestQuery = async () => {
    const testQuery = 'What TTC vehicles are currently running on King Street?';
    setInputText(testQuery);
    setTimeout(() => handleSendMessage(), 100);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="dashboard-card p-3 hover:bg-gray-800/70 transition-all duration-200 group"
          title="Open AI Assistant"
        >
          <div className="flex items-center space-x-2">
            <Bot size={20} className="text-gray-300 group-hover:text-white transition-colors" />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
              AI Assistant
            </span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="dashboard-card w-96 h-[500px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Bot size={20} className="text-gray-300" />
            <h3 className="text-lg font-bold text-white">AI Assistant</h3>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={testConnection}
              disabled={isTestingConnection}
              className="p-1 rounded-md hover:bg-gray-800/50 transition-colors disabled:opacity-50"
              title="Test connection"
            >
              {isTestingConnection ? (
                <Loader2 size={16} className="text-gray-300 animate-spin" />
              ) : (
                <TestTube size={16} className="text-gray-300" />
              )}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-gray-800/50 transition-colors"
              title="Close"
            >
              <X size={16} className="text-gray-300" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-3">
          <button
            onClick={quickTestQuery}
            disabled={isLoading}
            className="w-full p-2 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg border border-gray-600/50 hover:bg-gray-700/50 transition-colors disabled:opacity-50 text-left"
          >
            <div className="flex items-center space-x-2">
              <Zap size={16} className="text-gray-400" />
              <span className="text-sm text-gray-300">Quick Test: King Street TTC</span>
            </div>
          </button>
        </div>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto mb-4 pr-1 custom-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(75, 85, 99, 0.6) rgba(17, 24, 39, 0.3)',
          }}
        >
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800/50 border border-gray-600/50 text-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {!message.isUser && (
                      <Bot size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    )}
                    {message.isUser && (
                      <User size={16} className="text-blue-200 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      {message.isLoading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 size={16} className="animate-spin text-gray-400" />
                          <span className="text-sm">{message.text}</span>
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                      )}
                      <div className="text-xs opacity-60 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about Toronto city data..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors"
            title="Send message"
          >
            {isLoading ? (
              <Loader2 size={20} className="text-white animate-spin" />
            ) : (
              <Send size={20} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 