import { useState, useRef, useEffect } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Send, Image, Video, Mic, AtSign, Square, Play, X, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SendMessage() {
  const { data: profile, isLoading } = useUserProfile();
  const { toast } = useToast();
  
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'audio'>('text');
  const [platform, setPlatform] = useState<'whatsapp' | 'discord'>('whatsapp');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mentionAll, setMentionAll] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Estados para grabación de audio y video
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const videoPreview = useRef<HTMLVideoElement | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);

  // Limpiar grabación al cambiar tipo de mensaje o desmontar
  useEffect(() => {
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      if (mediaRecorder.current && isRecording) {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (messageType !== 'audio' && messageType !== 'video') {
      setAudioBlob(null);
      setVideoBlob(null);
      if (isRecording) {
        stopRecording();
      }
    }
  }, [messageType]);

  // Verificar si el usuario es super_admin
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!profile?.super_admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Solo los super administradores pueden acceder a esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAudioBlob(null); // Limpiar audio grabado si se selecciona archivo
    }
  };

  const startRecording = async () => {
    try {
      const constraints = messageType === 'video' 
        ? { audio: true, video: true }
        : { audio: true };
      
      console.log('Iniciando grabación con constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStream.current = stream;
      console.log('Stream obtenido:', stream);
      
      // Mostrar preview para video
      console.log('messageType:', messageType);
      console.log('videoPreview.current:', videoPreview.current);
      if (messageType === 'video' && videoPreview.current) {
        console.log('Asignando stream al video preview');
        videoPreview.current.srcObject = stream;
        // Asegurar que el video se reproduce
        videoPreview.current.play().catch(err => {
          console.error('Error al reproducir video:', err);
        });
        console.log('Video preview configurado');
      } else {
        console.log('No se puede asignar preview - messageType:', messageType, 'videoPreview:', !!videoPreview.current);
      }
      
      // Usar el mejor formato disponible
      let mimeType = messageType === 'video' ? 'video/webm' : 'audio/webm';
      if (messageType === 'video') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          mimeType = 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          mimeType = 'video/webm;codecs=vp8,opus';
        }
      } else {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        }
      }
      
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;
      
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        // Crear blob con el tipo original para mantener la integridad
        const blob = new Blob(chunks, { type: mimeType });
        
        if (messageType === 'video') {
          setVideoBlob(blob);
          // Crear archivo identificado como MP4 para el envío
          const videoFile = new File([blob], `video_${Date.now()}.mp4`, { type: 'video/mp4' });
          setFile(videoFile);
        } else {
          setAudioBlob(blob);
          // Crear archivo identificado como MP3 para el envío
          const audioFile = new File([blob], `grabacion_${Date.now()}.mp3`, { type: 'audio/mpeg' });
          setFile(audioFile);
        }
        
        // Detener el stream
        stream.getTracks().forEach(track => track.stop());
        mediaStream.current = null;
        
        // Limpiar preview de video
        if (videoPreview.current) {
          videoPreview.current.srcObject = null;
        }
      };
      
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Iniciar contador de tiempo
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error al iniciar grabación:', error);
      toast({
        title: "Error",
        description: `No se pudo acceder a ${messageType === 'video' ? 'la cámara/micrófono' : 'el micrófono'}. Verifica los permisos.`,
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const clearFile = () => {
    setFile(null);
    setAudioBlob(null);
    setVideoBlob(null);
  };

  const clearRecording = () => {
    setFile(null);
    setAudioBlob(null);
    setVideoBlob(null);
    setRecordingTime(0);
  };

  const handleConfirmSend = () => {
    if (!message.trim() && !file) {
      toast({
        title: "Error",
        description: "Debes escribir un mensaje o seleccionar un archivo",
        variant: "destructive"
      });
      return;
    }
    setShowConfirmModal(true);
  };

  const handleSendMessage = async () => {
    setShowConfirmModal(false);
    setIsSending(true);
    
    try {
      // Preparar el payload para el webhook
      const payload: any = {
        platform: platform,
        messageType: messageType,
        message: message,
        mentionAll: mentionAll,
        timestamp: new Date().toISOString(),
        sender: profile?.full_name || profile?.email || 'Usuario'
      };

      // Si hay un archivo, convertirlo a base64
      if (file) {
        const reader = new FileReader();
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remover el prefijo data:type;base64,
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        payload.file = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: fileBase64
        };
      }

      // Enviar al webhook
      const response = await fetch('https://hooks.infragrowthai.com/webhook/ccf008dd-1b80-4e37-9403-31cde4636648', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
      }

      const result = await response.json().catch(() => ({})); // En caso de que no sea JSON válido

      toast({
        title: "Mensaje enviado",
        description: `Mensaje enviado correctamente a ${platform === 'whatsapp' ? 'WhatsApp' : 'Discord'}`,
      });
      
      // Limpiar formulario
      setMessage('');
      setFile(null);
      setAudioBlob(null);
      setVideoBlob(null);
      setMentionAll(false);
      
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar el mensaje. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Mic className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Send className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Enviar Mensaje</h1>
          <p className="text-muted-foreground">Envía mensajes a los canales oficiales</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Configuración del Mensaje
          </CardTitle>
          <CardDescription>
            Selecciona la plataforma y el tipo de mensaje que quieres enviar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selección de plataforma */}
          <div className="space-y-2">
            <Label>Plataforma</Label>
            <Tabs value={platform} onValueChange={(value) => setPlatform(value as 'whatsapp' | 'discord')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                <TabsTrigger value="discord">Discord</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Tipo de mensaje */}
          <div className="space-y-2">
            <Label>Tipo de Mensaje</Label>
            <Select value={messageType} onValueChange={(value) => setMessageType(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de mensaje" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Solo Texto
                  </div>
                </SelectItem>
                <SelectItem value="image">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Imagen con Texto
                  </div>
                </SelectItem>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Video con Texto
                  </div>
                </SelectItem>
                <SelectItem value="audio">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Audio
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Archivo (si no es solo texto) */}
          {messageType !== 'text' && (
            <div className="space-y-2">
              <Label>
                {messageType === 'image' && 'Imagen'}
                {messageType === 'video' && 'Video'}
                {messageType === 'audio' && 'Audio'}
              </Label>
              
              {messageType === 'audio' ? (
                /* Controles de grabación de audio */
                <div className="space-y-4 flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    {!isRecording && !file && (
                      <Button onClick={startRecording} variant="outline" className="flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        Grabar Audio
                      </Button>
                    )}
                    
                    {isRecording && (
                      <div className="flex items-center gap-4">
                        <Button onClick={stopRecording} variant="destructive" className="flex items-center gap-2">
                          <Square className="h-4 w-4" />
                          Detener
                        </Button>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Input de archivo alternativo */}
                  <div className="text-center text-sm text-muted-foreground">
                    <span>o</span>
                  </div>
                  
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    accept="audio/*"
                    className="cursor-pointer max-w-md"
                  />
                  
                   {file && (
                     <div className="flex items-center gap-2">
                       <Badge variant="outline" className="flex items-center gap-2">
                         <Mic className="h-4 w-4" />
                         {file.name}
                         {audioBlob && <span className="text-xs">(Grabado)</span>}
                       </Badge>
                       <div className="flex gap-1">
                         {audioBlob && (
                           <Button 
                             onClick={clearRecording} 
                             size="sm" 
                             variant="outline"
                             className="h-8 px-2"
                           >
                             <RotateCcw className="h-3 w-3" />
                             Regrabar
                           </Button>
                         )}
                         <Button 
                           onClick={clearFile} 
                           size="sm" 
                           variant="outline"
                           className="h-8 w-8 p-0"
                         >
                           <X className="h-3 w-3" />
                         </Button>
                       </div>
                     </div>
                   )}
                </div>
              ) : messageType === 'video' ? (
                /* Controles de grabación de video */
                <div className="space-y-4 flex flex-col items-center">
                  {/* Preview de video siempre visible para video */}
                  <div className="relative">
                    <video
                      ref={videoPreview}
                      autoPlay
                      muted
                      playsInline
                      className="w-full max-w-md rounded-lg border bg-black"
                      style={{ aspectRatio: '16/9' }}
                    />
                    {!isRecording && !file && (
                      <div className="absolute inset-0 flex items-center justify-center text-white/70">
                        <span className="text-sm">Preview aparecerá aquí</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!isRecording && !file && (
                      <Button onClick={startRecording} variant="outline" className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Grabar Video
                      </Button>
                    )}
                    
                    {isRecording && (
                      <div className="flex items-center gap-4">
                        <Button onClick={stopRecording} variant="destructive" className="flex items-center gap-2">
                          <Square className="h-4 w-4" />
                          Detener
                        </Button>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Input de archivo alternativo */}
                  <div className="text-center text-sm text-muted-foreground">
                    <span>o</span>
                  </div>
                  
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    accept="video/*"
                    className="cursor-pointer max-w-md"
                  />
                  
                   {file && (
                     <div className="flex items-center gap-2">
                       <Badge variant="outline" className="flex items-center gap-2">
                         <Video className="h-4 w-4" />
                         {file.name}
                         {videoBlob && <span className="text-xs">(Grabado)</span>}
                       </Badge>
                       <div className="flex gap-1">
                         {videoBlob && (
                           <Button 
                             onClick={clearRecording} 
                             size="sm" 
                             variant="outline"
                             className="h-8 px-2"
                           >
                             <RotateCcw className="h-3 w-3" />
                             Regrabar
                           </Button>
                         )}
                         <Button 
                           onClick={clearFile} 
                           size="sm" 
                           variant="outline"
                           className="h-8 w-8 p-0"
                         >
                           <X className="h-3 w-3" />
                         </Button>
                       </div>
                     </div>
                   )}
                </div>
              ) : messageType === 'image' ? (
                /* Input para imagen con preview */
                <div className="space-y-4 flex flex-col items-center">
                  {/* Preview de imagen */}
                  {file && file.type.startsWith('image/') && (
                    <div className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Preview"
                        className="w-full max-w-md rounded-lg border object-cover"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>
                  )}
                  
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="cursor-pointer max-w-md"
                  />
                  
                   {file && (
                     <div className="flex items-center gap-2">
                       <Badge variant="outline" className="flex items-center gap-2">
                         <Image className="h-4 w-4" />
                         {file.name}
                       </Badge>
                       <Button 
                         onClick={clearFile} 
                         size="sm" 
                         variant="outline"
                         className="h-8 w-8 p-0"
                       >
                         <X className="h-3 w-3" />
                       </Button>
                     </div>
                   )}
                </div>
              ) : (
                /* Input normal por defecto */
                <>
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    accept="*"
                  />
                   {file && (
                     <div className="flex items-center gap-2">
                       <Badge variant="outline" className="flex items-center gap-2">
                         {getMessageTypeIcon(messageType)}
                         {file.name}
                       </Badge>
                       <Button 
                         onClick={clearFile} 
                         size="sm" 
                         variant="outline"
                         className="h-8 w-8 p-0"
                       >
                         <X className="h-3 w-3" />
                       </Button>
                     </div>
                   )}
                </>
              )}
            </div>
          )}

          {/* Mensaje de texto */}
          {messageType !== 'audio' && (
            <div className="space-y-2">
              <Label>Mensaje</Label>
              <Textarea
                placeholder="Escribe tu mensaje aquí..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>
          )}

          {/* Mencionar todos */}
          <div className="flex items-center space-x-2">
            <Switch
              id="mention-all"
              checked={mentionAll}
              onCheckedChange={setMentionAll}
            />
            <Label htmlFor="mention-all" className="flex items-center gap-2">
              <AtSign className="h-4 w-4" />
              Mencionar a todos
            </Label>
          </div>

          {/* Botón enviar */}
          <Button 
            onClick={handleConfirmSend} 
            disabled={isSending || (!message && !file)}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar Mensaje
          </Button>
        </CardContent>
      </Card>

      {/* Modal de confirmación */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Envío</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas enviar este mensaje?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {platform === 'whatsapp' ? 'WhatsApp' : 'Discord'}
              </Badge>
              {mentionAll && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <AtSign className="h-3 w-3" />
                  @everyone
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getMessageTypeIcon(messageType)}
                  {file.name}
                </div>
              )}
              {message && (
                <div className="border rounded-lg p-3 bg-muted/50">
                  <p className="text-sm">{message}</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendMessage} disabled={isSending}>
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirmar Envío
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}