import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardList, Plus, Edit, Trash2, Eye, EyeOff, ArrowLeft, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";

interface AnamnesisTemplate {
  id: string;
  specialtyName: string;
  name: string;
  description: string | null;
  sections: TemplateSection[];
  isDefault: boolean;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateSection {
  title: string;
  fields: TemplateField[];
}

interface TemplateField {
  id: string;
  label: string;
  type: "text" | "textarea";
  placeholder: string;
  required: boolean;
}

const templateSchema = z.object({
  specialtyName: z.string().min(1, "Especialidade é obrigatória"),
  name: z.string().min(1, "Nome do template é obrigatório"),
  description: z.string().optional(),
  sections: z.string().min(1, "Seções são obrigatórias"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

export default function AnamnesisTemplates() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AnamnesisTemplate | null>(null);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      specialtyName: "",
      name: "",
      description: "",
      sections: "",
    },
  });

  // Fetch all templates
  const { data: templates = [], isLoading } = useQuery<AnamnesisTemplate[]>({
    queryKey: ["/api/anamnesis-templates"],
  });

  // Fetch specialties
  const { data: specialties = [] } = useQuery<any[]>({
    queryKey: ["/api/specialties"],
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const sectionsJson = JSON.parse(data.sections);
      return apiRequest("/api/anamnesis-templates", {
        method: "POST",
        body: JSON.stringify({
          specialtyName: data.specialtyName,
          name: data.name,
          description: data.description || null,
          sections: sectionsJson,
          isDefault: false,
          isActive: true,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anamnesis-templates"] });
      toast({
        title: "Template criado",
        description: "Template de anamnese criado com sucesso",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar template",
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TemplateFormData }) => {
      const sectionsJson = JSON.parse(data.sections);
      return apiRequest(`/api/anamnesis-templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          specialtyName: data.specialtyName,
          name: data.name,
          description: data.description || null,
          sections: sectionsJson,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anamnesis-templates"] });
      toast({
        title: "Template atualizado",
        description: "Template de anamnese atualizado com sucesso",
      });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar template",
        variant: "destructive",
      });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest(`/api/anamnesis-templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anamnesis-templates"] });
      toast({
        title: "Status alterado",
        description: "Status do template atualizado",
      });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/anamnesis-templates/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anamnesis-templates"] });
      toast({
        title: "Template excluído",
        description: "Template removido com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir template",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (template?: AnamnesisTemplate) => {
    if (template) {
      setEditingTemplate(template);
      form.reset({
        specialtyName: template.specialtyName,
        name: template.name,
        description: template.description || "",
        sections: JSON.stringify(template.sections, null, 2),
      });
    } else {
      setEditingTemplate(null);
      form.reset({
        specialtyName: "",
        name: "",
        description: "",
        sections: JSON.stringify([
          {
            title: "Seção 1",
            fields: [
              {
                id: "symptoms",
                label: "Sintomas",
                type: "textarea",
                placeholder: "Descrever sintomas...",
                required: true
              }
            ]
          }
        ], null, 2),
      });
    }
    setIsDialogOpen(true);
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

  const onSubmit = (data: TemplateFormData) => {
    try {
      JSON.parse(data.sections); // Validate JSON
      if (editingTemplate) {
        updateMutation.mutate({ id: editingTemplate.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch {
      toast({
        title: "Erro no formato JSON",
        description: "O campo de seções contém JSON inválido",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-md border-b border-teal-200 dark:border-teal-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={hospitalLogo} alt="Hospital Logo" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-teal-700 dark:text-teal-400">
                  Templates de Anamnese
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Exu Saúde - Sistema de Atendimento Médico
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setLocation("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
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
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-teal-600" />
                  Gerenciar Templates
                </CardTitle>
                <CardDescription>
                  Crie e personalize templates de anamnese para cada especialidade
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenDialog()} data-testid="button-new-template">
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Carregando...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Nenhum template encontrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id} data-testid={`template-row-${template.id}`}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.specialtyName}</TableCell>
                      <TableCell>
                        {template.isDefault ? (
                          <Badge variant="outline">Sistema</Badge>
                        ) : (
                          <Badge variant="secondary">Personalizado</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {template.isActive ? (
                          <Badge variant="default">Ativo</Badge>
                        ) : (
                          <Badge variant="destructive">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActiveMutation.mutate({ 
                              id: template.id, 
                              isActive: template.isActive 
                            })}
                            data-testid={`button-toggle-${template.id}`}
                          >
                            {template.isActive ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(template)}
                            data-testid={`button-edit-${template.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!template.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Tem certeza que deseja excluir este template?")) {
                                  deleteMutation.mutate(template.id);
                                }
                              }}
                              data-testid={`button-delete-${template.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog for Create/Edit */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Editar Template" : "Novo Template"}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate 
                  ? "Atualize as informações do template de anamnese"
                  : "Crie um novo template personalizado de anamnese"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="specialtyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especialidade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-specialty">
                            <SelectValue placeholder="Selecione a especialidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {specialties.map((specialty) => (
                            <SelectItem key={specialty.id} value={specialty.name}>
                              {specialty.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Template</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Anamnese Cardiológica Detalhada" 
                          {...field} 
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Breve descrição do template" 
                          {...field} 
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sections"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seções (JSON)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Cole o JSON das seções aqui"
                          className="font-mono text-sm h-64"
                          {...field}
                          data-testid="textarea-sections"
                        />
                      </FormControl>
                      <p className="text-xs text-slate-500">
                        Formato: Array de objetos com title e fields. Exemplo disponível ao criar novo template.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingTemplate(null);
                      form.reset();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save"
                  >
                    {editingTemplate ? "Atualizar" : "Criar"} Template
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
