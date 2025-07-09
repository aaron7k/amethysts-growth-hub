import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Send, Mic, MicOff, Bot, User, Loader2, Database, BookOpen } from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  messageType: 'text' | 'audio';
}

export default function AIAssistant() {
  const { data: profile } = useUserProfile();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [assistantType, setAssistantType] = useState<'sql' | 'rag'>('sql');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll cuando se añadan nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Verificar si es super admin DESPUÉS de todos los hooks
  if (!profile?.super_admin) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center p-6 bg-card border border-border rounded-lg">
          <h2 className="text-xl font-semibold text-destructive mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">
            Esta funcionalidad solo está disponible para Super Administradores.
          </p>
        </div>
      </div>
    );
  }

  const sendMessage = async (content: string, messageType: 'text' | 'audio' = 'text') => {
    if (!content.trim() || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
      messageType
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const webhookUrl = assistantType === 'sql' 
        ? 'https://hooks.infragrowthai.com/webhook/infragrowth/sql-assistant'
        : 'https://hooks.infragrowthai.com/webhook/infragrowth/rag-assistant';
        
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: user.id,
          messageType: messageType,
          message: content,
          assistantType: assistantType
        })
      });

      if (!response.ok) {
        throw new Error('Error al enviar mensaje al asistente');
      }

      const result = await response.json();
      console.log('AI Response:', result); // Para debug
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.response || result.message || 'Respuesta recibida del asistente',
        timestamp: new Date(),
        messageType: 'text'
      };

      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, inténtalo de nuevo.',
        timestamp: new Date(),
        messageType: 'text'
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Auto-focus el input después de que termine la IA
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleSendText = () => {
    if (input.trim()) {
      sendMessage(input, 'text');
      setInput("");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1];
          sendMessage(base64Audio, 'audio');
        };
        
        reader.readAsDataURL(audioBlob);
        
        // Limpiar el stream
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Error",
        description: "No se pudo acceder al micrófono.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background relative">
      {/* Header - Fixed */}
      <div className="fixed top-16 left-64 right-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Chat con Asistente IA</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={assistantType} onValueChange={(value: 'sql' | 'rag') => setAssistantType(value)}>
              <SelectTrigger className="w-[160px]">
                <div className="flex items-center gap-2">
                  {assistantType === 'sql' ? (
                    <Database className="h-4 w-4" />
                  ) : (
                    <BookOpen className="h-4 w-4" />
                  )}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sql">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>SQL Assistant</span>
                  </div>
                </SelectItem>
                <SelectItem value="rag">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>RAG Assistant</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Messages Area - Scrollable with padding for fixed header and input */}
      <div className="pt-20 pb-32 px-4 space-y-4 overflow-y-auto h-full">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 h-full flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-4">
              {assistantType === 'sql' ? (
                <Database className="h-12 w-12 opacity-50" />
              ) : (
                <BookOpen className="h-12 w-12 opacity-50" />
              )}
            </div>
            <p>
              ¡Hola! Soy tu {assistantType === 'sql' ? 'Asistente SQL' : 'Asistente RAG'}.
            </p>
            <p className="text-sm mt-2">
              {assistantType === 'sql' 
                ? 'Puedo ayudarte con consultas de base de datos y análisis de datos.'
                : 'Puedo ayudarte con preguntas sobre documentación y conocimiento general.'
              }
            </p>
            <p className="text-sm mt-1">Puedes escribir o hablar para hacer consultas.</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${message.type === 'user' ? 'bg-primary' : 'bg-secondary'}
                  `}>
                    {message.type === 'user' ? (
                      <User className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <Bot className="h-4 w-4 text-secondary-foreground" />
                    )}
                  </div>
                  <div className={`
                    rounded-lg px-4 py-2 break-words
                    ${message.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground'
                    }
                  `}>
                    {message.messageType === 'audio' && message.type === 'user' ? (
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        <span className="text-sm italic">Mensaje de audio enviado</span>
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    )}
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div className="bg-secondary text-secondary-foreground rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Pensando...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area - Fixed */}
      <div className="fixed bottom-0 left-64 right-0 z-10 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95 p-4">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu consulta aquí..."
            className="resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
            disabled={isLoading}
            autoFocus
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSendText}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {isRecording && (
          <div className="text-center mt-2">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
              <span className="text-sm">Grabando... Haz clic en el micrófono para detener</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}