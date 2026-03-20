import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClinicalProtocolSchema, type ClinicalProtocol } from "@shared/schema";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, FileText, Tag, Calendar, User, BookOpen, AlertCircle, Trash2, Edit, Eye, ArrowLeft, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  condition: z.string().min(1, "Condição é obrigatória"),
  description: z.string().optional(),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })).default([]),
  version: z.string().default("1.0"),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

const categories = [
  "Cardiologia",
  "Pneumologia",
  "Neurologia",
  "Pediatria",
  "Ginecologia",
  "Obstetrícia",
  "Ortopedia",
  "Emergência",
  "UTI",
  "Infectologia",
  "Oncologia",
  "Gastroenterologia",
  "Nefrologia",
  "Endocrinologia",
  "Psiquiatria",
  "Outros"
];

export default function ClinicalProtocols() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<ClinicalProtocol | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: protocols = [], isLoading } = useQuery<ClinicalProtocol[]>({
    queryKey: ["/api/clinical-protocols", selectedCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }
      if (searchTerm) {
        params.append("search", searchTerm);
      }
      const url = `/api/clinical-protocols${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch protocols");
      return response.json();
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      condition: "",
      description: "",
      category: "",
      sections: [],
      tags: [],
      version: "1.0",
      isActive: true,
    },
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      condition: "",
      description: "",
      category: "",
      sections: [],
      tags: [],
      version: "1.0",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("/api/clinical-protocols", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-protocols"] });
      toast({
        title: "Sucesso",
        description: "Protocolo clínico criado com sucesso",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar protocolo clínico",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormData> }) => {
      return apiRequest(`/api/clinical-protocols/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-protocols"] });
      toast({
        title: "Sucesso",
        description: "Protocolo clínico atualizado com sucesso",
      });
      setIsEditDialogOpen(false);
      setSelectedProtocol(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar protocolo clínico",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/clinical-protocols/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-protocols"] });
      toast({
        title: "Sucesso",
        description: "Protocolo clínico excluído com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir protocolo clínico",
        variant: "destructive",
      });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/clinical-protocols/seed", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-protocols"] });
      toast({
        title: "Sucesso",
        description: "Protocolos clínicos padrão adicionados com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar protocolos padrão",
        variant: "destructive",
      });
    },
  });

  const handleSeedProtocols = () => {
    if (confirm("Deseja adicionar os protocolos clínicos padrão? Esta ação adicionará 6 protocolos de emergência e condições comuns.")) {
      seedMutation.mutate();
    }
  };

  const handleViewProtocol = (protocol: ClinicalProtocol) => {
    setSelectedProtocol(protocol);
    setIsViewDialogOpen(true);
  };

  const handleEditProtocol = (protocol: ClinicalProtocol) => {
    setSelectedProtocol(protocol);
    editForm.reset({
      title: protocol.title,
      condition: protocol.condition,
      description: protocol.description || "",
      category: protocol.category,
      sections: (protocol.sections as { title: string; content: string; }[]) || [],
      tags: protocol.tags || [],
      version: protocol.version,
      isActive: protocol.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteProtocol = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este protocolo clínico?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: FormData) => {
    if (selectedProtocol) {
      updateMutation.mutate({ id: selectedProtocol.id, data });
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", { 
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.redirect || "/auth";
      } else {
        window.location.href = "/auth";
      }
    } catch (error) {
      console.error('Erro no logout:', error);
      window.location.href = "/auth";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <img src={hospitalLogo} alt="Hospital Logo" className="h-16 w-16 rounded-full object-cover" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  Biblioteca de Protocolos Clínicos
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Diretrizes e protocolos médicos padronizados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/home">
                <Button variant="outline" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
                data-testid="logout-button"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300">
              Acesse protocolos clínicos, diretrizes de tratamento e procedimentos padronizados para referência rápida durante o atendimento.
            </AlertDescription>
          </Alert>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por título, condição ou tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[250px]" data-testid="select-category">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleSeedProtocols}
            variant="outline"
            disabled={seedMutation.isPending}
            data-testid="button-seed"
          >
            {seedMutation.isPending ? "Adicionando..." : "Protocolos Padrão"}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create">
                <Plus className="h-4 w-4 mr-2" />
                Novo Protocolo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Criar Protocolo Clínico</DialogTitle>
                <DialogDescription>
                  Adicione um novo protocolo clínico à biblioteca
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Manejo de Hipertensão Arterial" data-testid="input-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condição Clínica</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Hipertensão Arterial Sistêmica" data-testid="input-condition" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-create-category">
                                <SelectValue placeholder="Selecione a categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Breve descrição do protocolo" rows={3} data-testid="textarea-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="version"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Versão</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: 1.0" data-testid="input-version" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="pt-4 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending}
                        data-testid="button-save"
                      >
                        {createMutation.isPending ? "Criando..." : "Criar Protocolo"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {/* Protocols Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Carregando protocolos...</p>
          </div>
        ) : protocols.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm || selectedCategory !== "all"
                    ? "Nenhum protocolo encontrado com os filtros selecionados"
                    : "Nenhum protocolo clínico cadastrado"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {protocols.map((protocol) => (
              <Card key={protocol.id} className="hover:shadow-lg transition-shadow" data-testid={`card-protocol-${protocol.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{protocol.title}</CardTitle>
                      <CardDescription className="text-sm">{protocol.condition}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      v{protocol.version}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {protocol.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {protocol.description}
                    </p>
                  )}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Tag className="h-4 w-4" />
                      <span>{protocol.category}</span>
                    </div>
                    {protocol.tags && protocol.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {protocol.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {protocol.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{protocol.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleViewProtocol(protocol)}
                      data-testid={`button-view-${protocol.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditProtocol(protocol)}
                      data-testid={`button-edit-${protocol.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteProtocol(protocol.id)}
                      data-testid={`button-delete-${protocol.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Protocol Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedProtocol?.title}</span>
                <Badge>v{selectedProtocol?.version}</Badge>
              </DialogTitle>
              <DialogDescription>{selectedProtocol?.condition}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              {selectedProtocol && (
                <div className="space-y-4">
                  {selectedProtocol.description && (
                    <div>
                      <h3 className="font-semibold mb-2">Descrição</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedProtocol.description}
                      </p>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Categoria
                    </h3>
                    <Badge variant="secondary">{selectedProtocol.category}</Badge>
                  </div>
                  {selectedProtocol.tags && selectedProtocol.tags.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProtocol.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedProtocol.sections && Array.isArray(selectedProtocol.sections) && (selectedProtocol.sections as any[]).length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Conteúdo do Protocolo</h3>
                      <div className="space-y-3">
                        {(selectedProtocol.sections as { title: string; content: string; }[]).map((section, idx) => (
                          <Card key={idx}>
                            <CardHeader>
                              <CardTitle className="text-base">{section.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                {section.content}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Criado em: {new Date(selectedProtocol.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                    {selectedProtocol.updatedAt && (
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        Atualizado em: {new Date(selectedProtocol.updatedAt).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Edit Protocol Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Editar Protocolo Clínico</DialogTitle>
              <DialogDescription>
                Atualize as informações do protocolo
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condição Clínica</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-condition" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} data-testid="textarea-edit-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Versão</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-version" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-4 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                      data-testid="button-edit-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      data-testid="button-edit-save"
                    >
                      {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </form>
              </Form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
