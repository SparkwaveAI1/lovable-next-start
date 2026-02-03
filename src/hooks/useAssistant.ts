import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/contexts/BusinessContext';
import type { AssistantMessage, AssistantAction, PendingConfirmation } from '@/types/assistant';

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function useAssistant() {
  const { selectedBusiness } = useBusinessContext();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset conversation when business changes
  useEffect(() => {
    if (selectedBusiness?.id) {
      setMessages([]);
      setConversationId(null);
      setPendingConfirmation(null);
      setError(null);
    }
  }, [selectedBusiness?.id]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    if (!selectedBusiness?.id) {
      setError('Please select a business first');
      return;
    }

    setError(null);
    setIsLoading(true);

    // Add user message immediately
    const userMessage: AssistantMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Call the edge function (when backend is ready)
      const { data, error: invokeError } = await supabase.functions.invoke('client-assistant', {
        body: {
          message: content.trim(),
          conversationId,
          businessId: selectedBusiness.id,
        },
      });

      if (invokeError) throw invokeError;

      // Update conversation ID if new
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      // Process the response
      const assistantMessage: AssistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.message || data.content || '',
        timestamp: new Date(),
        action: data.action,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If action requires confirmation, set pending
      if (data.action?.requires_confirmation && data.action?.status === 'pending') {
        setPendingConfirmation({
          action: data.action,
          message: assistantMessage,
        });
      }
    } catch (err) {
      console.error('Assistant error:', err);
      
      // For now, since backend isn't ready, simulate a response
      // TODO: Remove this mock response when backend is deployed
      const mockResponse: AssistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: getMockResponse(content),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, mockResponse]);
      
      // Only show error in console, not to user during mock mode
      // setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, selectedBusiness?.id, isLoading]);

  const confirmAction = useCallback(async (approved: boolean) => {
    if (!pendingConfirmation) return;

    setIsLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('client-assistant', {
        body: {
          actionId: pendingConfirmation.action.id,
          approved,
          conversationId,
          businessId: selectedBusiness?.id,
        },
      });

      if (invokeError) throw invokeError;

      // Update the message with the action result
      setMessages(prev => prev.map(msg => {
        if (msg.id === pendingConfirmation.message.id && msg.action) {
          return {
            ...msg,
            action: {
              ...msg.action,
              status: approved ? (data.success ? 'executed' : 'failed') : 'denied',
              result: data.result,
              error: data.error,
            },
          };
        }
        return msg;
      }));

      // Add follow-up message if provided
      if (data.followUpMessage) {
        const followUpMessage: AssistantMessage = {
          id: generateId(),
          role: 'assistant',
          content: data.followUpMessage,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, followUpMessage]);
      }
    } catch (err) {
      console.error('Action confirmation error:', err);
      
      // Mock response for now
      setMessages(prev => prev.map(msg => {
        if (msg.id === pendingConfirmation.message.id && msg.action) {
          return {
            ...msg,
            action: {
              ...msg.action,
              status: approved ? 'executed' : 'denied',
              result: approved ? { success: true, mock: true } : undefined,
            },
          };
        }
        return msg;
      }));
    } finally {
      setPendingConfirmation(null);
      setIsLoading(false);
    }
  }, [pendingConfirmation, conversationId, selectedBusiness?.id]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setPendingConfirmation(null);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    pendingConfirmation,
    sendMessage,
    confirmAction,
    clearConversation,
  };
}

// Mock responses for development - remove when backend is ready
function getMockResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm your AI assistant. I can help you with:\n\n• Looking up contacts\n• Sending emails and SMS\n• Creating tasks\n• Posting to social media\n• Checking bookings\n\nWhat would you like to do?";
  }
  
  if (lowerMessage.includes('contact') || lowerMessage.includes('find') || lowerMessage.includes('look up')) {
    return "I can help you find a contact. Could you provide the name, email, or phone number of the person you're looking for?";
  }
  
  if (lowerMessage.includes('email')) {
    return "I can help you send an email. Please provide:\n1. The contact's name or email\n2. The subject line\n3. The message content";
  }
  
  if (lowerMessage.includes('sms') || lowerMessage.includes('text')) {
    return "I can send a text message for you. Who would you like to text and what should the message say?";
  }
  
  if (lowerMessage.includes('task')) {
    return "I can create a task for you. What's the task title and description? Would you like to set a due date or priority?";
  }
  
  if (lowerMessage.includes('booking') || lowerMessage.includes('schedule') || lowerMessage.includes('class')) {
    return "I can help with bookings. Would you like to:\n• Check today's bookings\n• Look up a specific class\n• Book someone into a class?";
  }
  
  return "I understand you want help with that. The backend is being set up - once it's ready, I'll be able to assist you with various tasks like managing contacts, sending messages, and handling bookings. Is there anything specific you'd like to know about my capabilities?";
}
