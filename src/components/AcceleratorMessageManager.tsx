import { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Image, Video, Mic, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AcceleratorMessageManagerProps {
  subscriptionId: string;
  clientName: string;
}

interface DiscordChannelInfo {
  id: string;
  name: string;
  stage: string;
}

interface ProvisionedService {
  id: string;
  service_type: string;
  access_details: any;
  provisioned_at: string;
  is_active: boolean;
  subscription_id: string;
}

const AcceleratorMessageManager = ({ subscriptionId, clientName }: AcceleratorMessageManagerProps) => {
  const [open, setOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'audio'>('text');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const [isSending, setIsSending] = useState(false);

  // Obtener servicios de Discord para esta suscripción
  const { data: discordServices, isLoading } = useQuery({
    queryKey: ['discord-channels', subscriptionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provisioned_services')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .eq('service_type', 'discord_channel')
        .eq('is_active', true);
      
      if (error) {
        console.error('Error fetching Discord services:', error);
        throw error;
      }
      
      return data as ProvisionedService[];
    },
    enabled: open
  });

  // Extraer canales de los access_details
  const getChannelsFromService = (service: ProvisionedService): DiscordChannelInfo[] => {
    const accessDetails = service.access_details as any;
    if (!accessDetails) return [];

    const channels: DiscordChannelInfo[] = [];
    
    if (accessDetails.first_child) {
      channels.push({
        id: accessDetails.first_child,
        name: 'Nicho y Oferta',
        stage: 'Etapa 1'
      });
    }
    
    if (accessDetails.second_child) {
      channels.push({
        id: accessDetails.second_child,
        name: 'Infraestructura',
        stage: 'Etapa 2'
      });
    }
    
    if (accessDetails.third_child) {
      channels.push({
        id: accessDetails.third_child,
        name: 'Validación y ventas',
        stage: 'Etapa 3'
      });
    }
    
    if (accessDetails.fourth_child) {
      channels.push({
        id: accessDetails.fourth_child,
        name: 'Entrega de Servicio',
        stage: 'Etapa 4'
      });
    }

    return channels;
  };

  const allChannels = discordServices?.flatMap(getChannelsFromService) || [];
  const hasChannels = allChannels.length > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
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

    if (!selectedChannel) {
      toast({
        title: "Error",
        description: "Debes seleccionar un canal",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    
    try {
      // Preparar el payload específico para Discord de aceleradora
      const payload: any = {
        platform: 'discord',
        messageType: messageType,
        message: message,
        mentionAll: false, // Discord channels don't need @everyone
        timestamp: new Date().toISOString(),
        sender: `Aceleradora - ${clientName}`,
        // Información específica del canal de Discord
        discordChannelId: selectedChannel,
        subscriptionId: subscriptionId,
        clientName: clientName
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

      // Enviar al webhook específico para Discord de aceleradora
      const response = await fetch('https://hooks.infragrowthai.com/webhook/accelerator-discord-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
      }

      const channelName = allChannels.find(ch => ch.id === selectedChannel)?.name || 'Canal seleccionado';
      
      toast({
        title: "Mensaje enviado",
        description: `Mensaje enviado correctamente al canal "${channelName}" de ${clientName}`,
      });
      
      // Limpiar formulario
      setMessage('');
      setFile(null);
      setSelectedChannel('');
      
      setOpen(false);
      
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send className="mr-2 h-4 w-4" />
          Enviar Mensaje
          {hasChannels && (
            <Badge variant="secondary" className="ml-2">
              {allChannels.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Mensaje a Discord - {clientName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center p-4">
              <p className="text-muted-foreground">Cargando canales...</p>
            </div>
          ) : !hasChannels ? (
            <div className="text-center p-4">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay canales de Discord disponibles</p>
              <p className="text-xs text-muted-foreground mt-2">
                Primero debe crear un canal de Discord para este cliente
              </p>
            </div>
          ) : (
            <>
              {/* Selección de canal */}
              <div className="space-y-2">
                <Label>Canal de Destino</Label>
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el canal de Discord" />
                  </SelectTrigger>
                  <SelectContent>
                    {allChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          <span>{channel.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {channel.stage}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    className="cursor-pointer"
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


              {/* Vista previa del canal seleccionado */}
              {selectedChannel && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Enviando a: <strong>
                        {allChannels.find(ch => ch.id === selectedChannel)?.name}
                      </strong> ({allChannels.find(ch => ch.id === selectedChannel)?.stage})
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Botón enviar */}
              <Button 
                onClick={handleSendMessage} 
                disabled={isSending || (!message && !file) || !selectedChannel}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending ? 'Enviando...' : 'Enviar Mensaje'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AcceleratorMessageManager;