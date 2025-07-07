import { useState } from 'react';
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
import { MessageSquare, Send, Image, Video, Mic, AtSign } from 'lucide-react';
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
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !file) {
      toast({
        title: "Error",
        description: "Debes escribir un mensaje o seleccionar un archivo",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    
    try {
      // Aquí implementarías la lógica para enviar el mensaje
      // Por ahora simulamos el envío
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Mensaje enviado",
        description: `Mensaje enviado correctamente a ${platform === 'whatsapp' ? 'WhatsApp' : 'Discord'}`,
      });
      
      // Limpiar formulario
      setMessage('');
      setFile(null);
      setMentionAll(false);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Inténtalo de nuevo.",
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
              <Input
                type="file"
                onChange={handleFileChange}
                accept={
                  messageType === 'image' ? 'image/*' :
                  messageType === 'video' ? 'video/*' :
                  messageType === 'audio' ? 'audio/*' : '*'
                }
              />
              {file && (
                <Badge variant="outline" className="flex items-center gap-2 w-fit">
                  {getMessageTypeIcon(messageType)}
                  {file.name}
                </Badge>
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

          {/* Vista previa */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">
                Vista Previa - {platform === 'whatsapp' ? 'WhatsApp' : 'Discord'}
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
                <p className="text-sm">{message}</p>
              )}
              {!message && !file && (
                <p className="text-sm text-muted-foreground italic">
                  Tu mensaje aparecerá aquí...
                </p>
              )}
            </div>
          </div>

          {/* Botón enviar */}
          <Button 
            onClick={handleSendMessage} 
            disabled={isSending || (!message && !file)}
            className="w-full"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Mensaje
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}