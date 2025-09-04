import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Upload, Image } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  image_url?: string;
  created_at: string;
}

interface ContentSession {
  id: string;
  session_name: string;
  created_at: string;
}

export default function CharXTwitter() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [sessions, setSessions] = useState<ContentSession[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CharX World business ID (hardcoded for now)
  const charxBusinessId = '3'; // This should match your CharX World business ID

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing sessions on component mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('twitter_content_sessions')
        .select('*')
        .eq('business_id', charxBusinessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load content sessions');
    }
  };

  const createNewSession = async () => {
    try {
      const sessionName = `CharX Content ${new Date().toLocaleDateString()}`;
      
      const { data, error } = await supabase
        .from('twitter_content_sessions')
        .insert({
          business_id: charxBusinessId,
          session_name: sessionName
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentSession(data.id);
      setSessions(prev => [data, ...prev]);
      setMessages([]);
      
      toast.success('New content session created');
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create new session');
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      setCurrentSession(sessionId);
      
      const { data, error } = await supabase
        .from('twitter_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as ChatMessage[]);
    } catch (error) {
      console.error('Error loading session messages:', error);
      toast.error('Failed to load session messages');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // CharX-specific system prompt
  const CHARX_SYSTEM_PROMPT = `You are a social media expert creating Twitter content for CharX World, an AI-powered platform for creating intelligent characters and immersive worlds.

CharX World Features:
- AI-powered character creation with psychological depth
- Immersive world building capabilities  
- Characters can reason, improvise, and co-create narratives
- Applications: storytelling, creative media, historical education, role-playing
- Built on advanced behavioral modeling technology
- Optional crypto integration with ERC-6551 character ownership in Virtuals Protocol

Your role:
- Create engaging, informative tweets about CharX World
- Focus on AI creativity, character development, storytelling, and world building
- Use relevant hashtags: #CharXWorld #AICharacters #Storytelling #WorldBuilding #AICreativity #VirtualsProtocol
- Keep tweets under 280 characters
- Make content accessible to creators, educators, and AI enthusiasts
- Highlight the creative potential and practical applications

Tone: Innovative, creative, inspiring, tech-forward but approachable.

When given images, describe how they relate to character creation, storytelling, or world building for tweet context.`;

  // Upload image to Supabase storage
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `charx-twitter/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('twitter-content')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('twitter-content')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  // Save message to database
  const saveMessage = async (
    sessionId: string,
    messageType: 'user' | 'assistant',
    content: string,
    imageUrl?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('twitter_chat_messages')
        .insert({
          session_id: sessionId,
          message_type: messageType,
          content,
          image_url: imageUrl || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      toast.error('Failed to save message');
      return null;
    }
  };

  // Generate AI response using OpenAI
  const generateAIResponse = async (userMessage: string, imageUrl?: string) => {
    try {
      const response = await supabase.functions.invoke('generate-tweet-content', {
        body: {
          userMessage,
          imageUrl,
          systemPrompt: CHARX_SYSTEM_PROMPT
        }
      });

      if (response.error) throw response.error;
      return response.data.content;
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast.error('Failed to generate AI response');
      return 'Sorry, I encountered an error generating content. Please try again.';
    }
  };

  // Main message sending function
  const handleSendMessage = async () => {
    if (!currentSession || (!currentMessage.trim() && !selectedImage)) return;

    setIsLoading(true);
    let imageUrl: string | null = null;

    try {
      // Upload image if selected
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        if (!imageUrl) {
          setIsLoading(false);
          return;
        }
      }

      // Save user message
      const userMessage = await saveMessage(
        currentSession,
        'user',
        currentMessage,
        imageUrl || undefined
      );

      if (userMessage) {
        setMessages(prev => [...prev, userMessage as ChatMessage]);
      }

      // Clear input
      setCurrentMessage('');
      clearImage();

      // Generate AI response
      const aiContent = await generateAIResponse(currentMessage, imageUrl || undefined);

      // Save AI response
      const aiMessage = await saveMessage(currentSession, 'assistant', aiContent);

      if (aiMessage) {
        setMessages(prev => [...prev, aiMessage as ChatMessage]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">CharX Twitter Content Creator</h1>
        <p className="text-muted-foreground">AI-powered tweet generation for CharX World</p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Sessions Sidebar */}
        <div className="col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Content Sessions</CardTitle>
              <Button onClick={createNewSession} className="w-full">
                New Session
              </Button>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                    currentSession === session.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <div className="font-medium text-sm truncate">
                    {session.session_name}
                  </div>
                  <div className="text-xs opacity-70">
                    {new Date(session.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="col-span-9">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">
                {currentSession ? 'CharX Content Generation' : 'Select or Create a Session'}
              </CardTitle>
            </CardHeader>
            
            {currentSession ? (
              <>
                {/* Messages Area */}
                <CardContent className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.message_type === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.message_type === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {message.image_url && (
                            <img
                              src={message.image_url}
                              alt="Uploaded content"
                              className="max-w-full h-auto rounded mb-2"
                            />
                          )}
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </CardContent>

                {/* Input Area */}
                <div className="p-4 border-t">
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mb-3 relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-w-32 h-auto rounded border"
                      />
                      <button
                        onClick={clearImage}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>

                    <Input
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      placeholder="Describe the tweet you want to create..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1"
                    />

                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading || (!currentMessage.trim() && !selectedImage)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Create a new session or select an existing one to start generating CharX tweets</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}