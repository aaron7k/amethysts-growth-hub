import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bot, Upload, Calendar } from "lucide-react";

const Templates = () => {
  const [activeTab, setActiveTab] = useState("n8n");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    json: "",
    description: "",
    loom: "",
    file: null as File | null,
    image: null as File | null,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: string, file: File | null) => {
    setFormData(prev => ({ ...prev, [field]: file }));
  };

  const generateDescription = async () => {
    if (!formData.json) {
      toast({
        title: "Error",
        description: "Necesitas agregar el JSON del workflow primero",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const response = await fetch('https://hooks.infragrowthai.com/webhook/ai-description-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ json: JSON.parse(formData.json) }),
      });

      if (!response.ok) {
        throw new Error('Error al generar descripción');
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, description: data.response }));
      
      toast({
        title: "Descripción generada",
        description: "La IA ha generado una descripción para tu workflow",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar la descripción",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.json || !formData.description) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('type', 'n8n');
      submitData.append('title', formData.title);
      submitData.append('json', formData.json);
      submitData.append('description', formData.description);
      submitData.append('loom', formData.loom);
      submitData.append('date', new Date().toISOString());
      
      if (formData.file) {
        submitData.append('file', formData.file);
      }
      if (formData.image) {
        submitData.append('image', formData.image);
      }

      const response = await fetch('https://hooks.infragrowthai.com/webhook/subir-template', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Error al subir template');
      }

      toast({
        title: "Template subido",
        description: "El template de n8n se ha subido correctamente",
      });

      // Reset form
      setFormData({
        title: "",
        json: "",
        description: "",
        loom: "",
        file: null,
        image: null,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo subir el template",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Templates</h1>
        <p className="text-muted-foreground">Gestiona y sube templates para diferentes plataformas</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="n8n">n8n</TabsTrigger>
          <TabsTrigger value="flowise">Flowise</TabsTrigger>
          <TabsTrigger value="retell">Retell</TabsTrigger>
        </TabsList>

        <TabsContent value="n8n" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subir Template de n8n</CardTitle>
              <CardDescription>
                Sube un nuevo workflow de n8n con todos los detalles necesarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      placeholder="Nombre del workflow"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loom">URL de Loom *</Label>
                    <Input
                      id="loom"
                      value={formData.loom}
                      onChange={(e) => handleInputChange("loom", e.target.value)}
                      placeholder="https://loom.com/..."
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="json">JSON del Workflow *</Label>
                  <Textarea
                    id="json"
                    value={formData.json}
                    onChange={(e) => handleInputChange("json", e.target.value)}
                    placeholder="Pega aquí el JSON del workflow de n8n"
                    className="min-h-32 font-mono text-sm"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="description">Descripción *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateDescription}
                      disabled={!formData.json || isGeneratingDescription}
                      className="ml-auto"
                    >
                      {isGeneratingDescription ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Bot className="h-4 w-4 mr-2" />
                      )}
                      Generar con IA
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Descripción del workflow"
                    className="min-h-24"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="file">Archivo JSON *</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="file"
                        type="file"
                        accept=".json"
                        onChange={(e) => handleFileChange("file", e.target.files?.[0] || null)}
                        className="flex-1"
                        required
                      />
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image">Imagen *</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange("image", e.target.files?.[0] || null)}
                        className="flex-1"
                        required
                      />
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Fecha de subida: {new Date().toLocaleDateString()}</span>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full md:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Subiendo Template...
                    </>
                  ) : (
                    "Subir Template"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flowise" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Flowise</CardTitle>
              <CardDescription>
                Funcionalidad para templates de Flowise
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Próximamente
                </h3>
                <p className="text-muted-foreground">
                  La funcionalidad para templates de Flowise estará disponible pronto
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retell" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Retell</CardTitle>
              <CardDescription>
                Funcionalidad para templates de Retell
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Próximamente
                </h3>
                <p className="text-muted-foreground">
                  La funcionalidad para templates de Retell estará disponible pronto
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Templates;