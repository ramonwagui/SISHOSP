import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSpecialtySchema, type Specialty, type InsertSpecialty } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Stethoscope, Heart, Baby, Bone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const specialtyIcons = [
  { name: "cardiologia", icon: Heart, color: "text-red-500" },
  { name: "pediatria", icon: Baby, color: "text-green-500" },
  { name: "ortopedia", icon: Bone, color: "text-purple-500" },
];

function getSpecialtyIcon(specialtyName: string) {
  const found = specialtyIcons.find(item => 
    specialtyName.toLowerCase().includes(item.name)
  );
  return found || { icon: Stethoscope, color: "text-blue-500" };
}

export default function SpecialtyManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertSpecialty>({
    resolver: zodResolver(insertSpecialtySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const { data: specialties = [], isLoading } = useQuery<Specialty[]>({
    queryKey: ["/api/specialties"],
  });

  const createSpecialtyMutation = useMutation({
    mutationFn: async (data: InsertSpecialty) => {
      const response = await apiRequest("/api/specialties", { method: "POST", body: data });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Especialidade criada",
        description: "A especialidade foi criada com sucesso.",
      });
      form.reset();
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/specialties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar especialidade",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const deleteSpecialtyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/specialties/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({
        title: "Especialidade removida",
        description: "A especialidade foi removida com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/specialties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover especialidade",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertSpecialty) => {
    createSpecialtyMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando especialidades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900">Especialidades Médicas</h3>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-green-600 text-white hover:bg-green-700"
              data-testid="button-add-specialty"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Especialidade
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Especialidade</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Especialidade</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Cardiologia"
                          data-testid="input-specialty-name"
                          {...field}
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
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descrição da especialidade..."
                          data-testid="textarea-specialty-description"
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          disabled={field.disabled}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-specialty"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createSpecialtyMutation.isPending}
                    data-testid="button-save-specialty"
                  >
                    {createSpecialtyMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {specialties.length === 0 ? (
        <div className="text-center py-12">
          <Stethoscope className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma especialidade cadastrada</h3>
          <p className="text-gray-500">Comece adicionando uma nova especialidade médica.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specialties.map((specialty) => {
            const { icon: Icon, color } = getSpecialtyIcon(specialty.name);
            
            return (
              <Card key={specialty.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-blue-600"
                        data-testid={`button-edit-specialty-${specialty.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-red-600"
                            data-testid={`button-delete-specialty-${specialty.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Especialidade</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover a especialidade "{specialty.name}"? 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-specialty-${specialty.id}`}>
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSpecialtyMutation.mutate(specialty.id)}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid={`button-confirm-delete-specialty-${specialty.id}`}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <CardTitle className="text-lg font-semibold text-gray-900 mb-2" data-testid={`specialty-name-${specialty.id}`}>
                    {specialty.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mb-4" data-testid={`specialty-description-${specialty.id}`}>
                    {specialty.description || "Sem descrição"}
                  </p>
                  <div className="text-xs text-gray-500">
                    <span>Criada em {new Date(specialty.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}