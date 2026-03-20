import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type User, insertUserSchema, updateUserSchema, changePasswordSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, User as UserIcon, Mail, Shield, ArrowLeft, Eye, EyeOff, Upload, X, LogOut, Key, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";
import { ProfilePhoto } from "@/components/profile-photo";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Form schemas  
const createUserFormSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email deve ser um endereço válido").min(1, "Email é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação deve ter pelo menos 6 caracteres"),
  role: z.enum(["admin", "staff", "viewer", "doctor", "triage", "farmacia", "laboratorio", "radiologista", "diretor"]).default("staff"),
  crm: z.string().optional(),
  coren: z.string().optional(),
  crbm: z.string().optional(),
  crf: z.string().optional(),
  crtr: z.string().optional(),
  medicalSpecialty: z.string().optional(),
  healthUnit: z.string().optional(),
  isActive: z.boolean().default(true),
}).superRefine((data, ctx) => {
  // Validar confirmação de senha
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Senhas não coincidem",
      path: ["confirmPassword"],
    });
  }
  // Se o role é doctor, CRM é obrigatório
  if (data.role === "doctor" && !data.crm) {
    ctx.addIssue({
      code: "custom",
      message: "CRM é obrigatório para usuários médicos",
      path: ["crm"],
    });
  }
  // Se o role é triage (enfermeiro), COREN é obrigatório
  if (data.role === "triage" && !data.coren) {
    ctx.addIssue({
      code: "custom",
      message: "COREN é obrigatório para usuários enfermeiros",
      path: ["coren"],
    });
  }
  // Se o role é laboratorio (biomédico), CRBM é obrigatório
  if (data.role === "laboratorio" && !data.crbm) {
    ctx.addIssue({
      code: "custom",
      message: "CRBM é obrigatório para usuários biomédicos",
      path: ["crbm"],
    });
  }
  // Se o role é farmacia (farmacêutico), CRF é obrigatório
  if (data.role === "farmacia" && !data.crf) {
    ctx.addIssue({
      code: "custom",
      message: "CRF é obrigatório para usuários farmacêuticos",
      path: ["crf"],
    });
  }
  // Se o role é radiologista, CRTR é obrigatório
  if (data.role === "radiologista" && !data.crtr) {
    ctx.addIssue({
      code: "custom",
      message: "CRTR é obrigatório para usuários radiologistas",
      path: ["crtr"],
    });
  }
});

const editUserFormSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email deve ser um endereço válido").min(1, "Email é obrigatório"),
  role: z.enum(["admin", "staff", "viewer", "doctor", "triage", "farmacia", "laboratorio", "radiologista", "diretor"]),
  crm: z.string().optional(),
  coren: z.string().optional(),
  crbm: z.string().optional(),
  crf: z.string().optional(),
  crtr: z.string().optional(),
  medicalSpecialty: z.string().optional(),
  healthUnit: z.string().optional(),
  isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // Se o role é doctor, CRM é obrigatório
  if (data.role === "doctor" && !data.crm) {
    ctx.addIssue({
      code: "custom",
      message: "CRM é obrigatório para usuários médicos",
      path: ["crm"],
    });
  }
  // Se o role é triage (enfermeiro), COREN é obrigatório
  if (data.role === "triage" && !data.coren) {
    ctx.addIssue({
      code: "custom",
      message: "COREN é obrigatório para usuários enfermeiros",
      path: ["coren"],
    });
  }
  // Se o role é laboratorio (biomédico), CRBM é obrigatório
  if (data.role === "laboratorio" && !data.crbm) {
    ctx.addIssue({
      code: "custom",
      message: "CRBM é obrigatório para usuários biomédicos",
      path: ["crbm"],
    });
  }
  // Se o role é farmacia (farmacêutico), CRF é obrigatório
  if (data.role === "farmacia" && !data.crf) {
    ctx.addIssue({
      code: "custom",
      message: "CRF é obrigatório para usuários farmacêuticos",
      path: ["crf"],
    });
  }
  // Se o role é radiologista, CRTR é obrigatório
  if (data.role === "radiologista" && !data.crtr) {
    ctx.addIssue({
      code: "custom",
      message: "CRTR é obrigatório para usuários radiologistas",
      path: ["crtr"],
    });
  }
});

const changePasswordFormSchema = changePasswordSchema;

type CreateUserFormData = z.infer<typeof createUserFormSchema>;
type EditUserFormData = z.infer<typeof editUserFormSchema>;
type ChangePasswordFormData = z.infer<typeof changePasswordFormSchema>;

// Role mapping for display
const roleLabels: Record<string, string> = {
  admin: "Administrador",
  staff: "Funcionário", 
  viewer: "Visualizador",
  doctor: "Médico",
  triage: "Enfermeiro",
  farmacia: "Farmacêutico",
  laboratorio: "Biomédico",
  radiologista: "Radiologista",
  diretor: "Diretor"
};

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800",
  staff: "bg-blue-100 text-blue-800",
  viewer: "bg-gray-100 text-gray-800",
  doctor: "bg-green-100 text-green-800",
  triage: "bg-purple-100 text-purple-800",
  farmacia: "bg-rose-100 text-rose-800",
  laboratorio: "bg-emerald-100 text-emerald-800",
  radiologista: "bg-violet-100 text-violet-800",
  diretor: "bg-amber-100 text-amber-800"
};

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [profilePhotoData, setProfilePhotoData] = useState<{imageData: string, mimeType: string} | null>(null);
  const [isResetPasswordsDialogOpen, setIsResetPasswordsDialogOpen] = useState(false);

  // Fetch users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch specialties
  const { data: specialties = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/specialties"],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserFormData) => {
      const { confirmPassword, ...userToCreate } = userData;
      return await apiRequest("/api/users", {
        method: "POST",
        body: userToCreate
      });
    },
    onSuccess: () => {
      toast({
        title: "Usuário criado com sucesso!",
        description: "O novo usuário foi adicionado ao sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsNewUserDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: string, userData: EditUserFormData }) => {
      return await apiRequest(`/api/users/${id}`, {
        method: "PATCH",
        body: userData
      });
    },
    onSuccess: () => {
      toast({
        title: "Usuário atualizado com sucesso!",
        description: "As informações do usuário foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, passwordData }: { id: string, passwordData: ChangePasswordFormData }) => {
      return await apiRequest(`/api/users/${id}/password`, {
        method: "PATCH",
        body: passwordData
      });
    },
    onSuccess: () => {
      toast({
        title: "Senha alterada com sucesso!",
        description: "A senha do usuário foi atualizada.",
      });
      setIsPasswordDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/users/${userId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Usuário excluído com sucesso!",
        description: "O usuário foi removido do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  // Upload profile photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ userId, imageData, mimeType }: { userId: string, imageData: string, mimeType: string }) => {
      return await apiRequest(`/api/users/${userId}/profile-photo`, {
        method: "POST",
        body: { imageData, mimeType }
      });
    },
    onSuccess: () => {
      toast({
        title: "Foto atualizada com sucesso!",
        description: "A foto de perfil foi atualizada.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setProfilePhotoData(null);
      setProfilePhotoPreview(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao fazer upload da foto",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  // Delete profile photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/users/${userId}/profile-photo`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Foto removida com sucesso!",
        description: "A foto de perfil foi removida.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setProfilePhotoPreview(null);
      setProfilePhotoData(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover foto",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  // Reset all passwords mutation
  const resetAllPasswordsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/admin/reset-all-passwords", {
        method: "POST"
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Senhas resetadas com sucesso!",
        description: data.message || "Todos os usuários deverão trocar a senha no próximo login.",
      });
      setIsResetPasswordsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao resetar senhas",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  // Forms
  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      username: "",
      email: "",
      name: "",
      role: "staff",
      password: "",
      confirmPassword: ""
    },
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      username: "",
      email: "",
      name: "",
      role: "staff"
    },
  });

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: ""
    },
  });

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      username: user.username,
      email: user.email,
      name: user.name || "",
      role: user.role as "admin" | "staff" | "viewer" | "doctor" | "triage" | "farmacia" | "laboratorio" | "radiologista" | "diretor",
      crm: user.crm || "",
      coren: (user as any).coren || "",
      crbm: (user as any).crbm || "",
      crf: (user as any).crf || "",
      crtr: (user as any).crtr || "",
      medicalSpecialty: user.medicalSpecialty || "",
      isActive: user.isActive ?? true
    });
    // Set existing photo if available
    setProfilePhotoPreview(user.profilePhotoUrl || null);
    setProfilePhotoData(null);
    setIsEditDialogOpen(true);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Use apenas JPEG, PNG ou WebP.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "Tamanho máximo: 5MB",
        variant: "destructive",
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setProfilePhotoPreview(base64String);
      setProfilePhotoData({
        imageData: base64String,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = () => {
    if (!selectedUser || !profilePhotoData) return;
    uploadPhotoMutation.mutate({
      userId: selectedUser.id,
      imageData: profilePhotoData.imageData,
      mimeType: profilePhotoData.mimeType
    });
  };

  const handleDeletePhoto = () => {
    if (!selectedUser) return;
    deletePhotoMutation.mutate(selectedUser.id);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    passwordForm.reset({
      newPassword: "",
      confirmPassword: ""
    });
    setIsPasswordDialogOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  const onCreateSubmit = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const onEditSubmit = (data: EditUserFormData) => {
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, userData: data });
    }
  };

  const onPasswordSubmit = (data: ChangePasswordFormData) => {
    if (selectedUser) {
      changePasswordMutation.mutate({ id: selectedUser.id, passwordData: data });
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <Button
            onClick={() => setLocation("/")}
            variant="outline"
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
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
      
      <Card className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-2xl">
          <CardTitle className="text-xl font-semibold flex items-center gap-3">
            <img 
              src={hospitalLogo} 
              alt="Exu Saúde - Sistema de Atendimento Médico" 
              className="h-8 w-auto bg-white p-1 rounded"
            />
            <div>
              <div className="flex items-center gap-3">
                Gerenciamento de Usuários
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {users.length} cadastrados
                </span>
              </div>
              <div className="text-sm font-normal text-purple-100">Exu Saúde - Sistema de Atendimento Médico</div>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          {/* Search and Add User */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, username ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            
            <Button 
              variant="outline" 
              className="text-orange-600 border-orange-600 hover:bg-orange-50"
              onClick={() => setIsResetPasswordsDialogOpen(true)}
              data-testid="button-reset-all-passwords"
            >
              <Key className="h-4 w-4 mr-2" />
              Resetar Senhas
            </Button>

            <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700" data-testid="button-add-user">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome de usuário</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-create-username" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} data-testid="input-create-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome completo</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-create-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={createForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Função</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-create-role">
                                <SelectValue placeholder="Selecione uma função" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="staff">Funcionário</SelectItem>
                              <SelectItem value="viewer">Visualizador</SelectItem>
                              <SelectItem value="doctor">Médico</SelectItem>
                              <SelectItem value="triage">Enfermeiro</SelectItem>
                              <SelectItem value="farmacia">Farmacêutico</SelectItem>
                              <SelectItem value="laboratorio">Biomédico</SelectItem>
                              <SelectItem value="radiologista">Radiologista</SelectItem>
                              <SelectItem value="diretor">Diretor</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Campos específicos para médicos */}
                    {createForm.watch("role") === "doctor" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={createForm.control}
                          name="crm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CRM *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: CRM/PE 12345" data-testid="input-create-crm" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="medicalSpecialty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Especialidade Médica</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-create-specialty">
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
                      </div>
                    )}

                    {/* Campo Unidade de Saúde para médicos */}
                    {createForm.watch("role") === "doctor" && (
                      <FormField
                        control={createForm.control}
                        name="healthUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unidade de Saúde</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-create-healthunit">
                                  <SelectValue placeholder="Selecione a unidade" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PSF">PSF</SelectItem>
                                <SelectItem value="CEM">CEM</SelectItem>
                                <SelectItem value="CEO">CEO</SelectItem>
                                <SelectItem value="Unidade de Fisioterapia Integrada">Unidade de Fisioterapia Integrada</SelectItem>
                                <SelectItem value="Hospital Municipal">Hospital Municipal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Campo COREN para enfermeiros */}
                    {createForm.watch("role") === "triage" && (
                      <FormField
                        control={createForm.control}
                        name="coren"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>COREN *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: COREN/PE 123456" data-testid="input-create-coren" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Campo CRBM para biomédicos */}
                    {createForm.watch("role") === "laboratorio" && (
                      <FormField
                        control={createForm.control}
                        name="crbm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CRBM *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: CRBM/PE 12345" data-testid="input-create-crbm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Campo CRF para farmacêuticos */}
                    {createForm.watch("role") === "farmacia" && (
                      <FormField
                        control={createForm.control}
                        name="crf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CRF *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: CRF/PE 12345" data-testid="input-create-crf" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Campo CRTR para radiologistas */}
                    {createForm.watch("role") === "radiologista" && (
                      <FormField
                        control={createForm.control}
                        name="crtr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CRTR *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: CRTR/PE 12345" data-testid="input-create-crtr" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showPassword ? "text" : "password"} 
                                  {...field} 
                                  data-testid="input-create-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                  data-testid="button-toggle-password"
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar Senha</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showConfirmPassword ? "text" : "password"} 
                                  {...field} 
                                  data-testid="input-create-confirm-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  data-testid="button-toggle-confirm-password"
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsNewUserDialogOpen(false)}
                        data-testid="button-cancel-create"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createUserMutation.isPending}
                        data-testid="button-submit-create"
                      >
                        {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <p className="text-gray-500">Carregando usuários...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
              </h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? "Tente uma busca diferente ou cadastre um novo usuário."
                  : "Comece cadastrando o primeiro usuário no sistema."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Foto</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <ProfilePhoto 
                          userId={user.id}
                          userName={user.name || user.username}
                          size="sm"
                          filePath={user.profilePhotoUrl}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.name || user.username}
                      </TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleColors[user.role] || "bg-gray-100 text-gray-800"} data-testid={`badge-role-${user.role}`}>
                          <Shield className="h-3 w-3 mr-1" />
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role === "doctor" && user.crm ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {user.crm}
                          </Badge>
                        ) : user.role === "triage" && user.coren ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            {user.coren}
                          </Badge>
                        ) : user.role === "laboratorio" && user.crbm ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            {user.crbm}
                          </Badge>
                        ) : user.role === "farmacia" && (user as any).crf ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            {(user as any).crf}
                          </Badge>
                        ) : user.role === "radiologista" && (user as any).crtr ? (
                          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                            {(user as any).crtr}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === "doctor" && user.medicalSpecialty ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            {user.medicalSpecialty}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChangePassword(user)}
                            data-testid={`button-change-password-${user.id}`}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o usuário "{user.username}"? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid="button-cancel-delete">
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid="button-confirm-delete"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              {/* Profile Photo Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold mb-3">Foto de Perfil</h3>
                <div className="flex items-center gap-4">
                  {/* Photo Preview */}
                  <div className="flex-shrink-0">
                    {profilePhotoPreview ? (
                      <img 
                        src={profilePhotoPreview} 
                        alt="Preview" 
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                        data-testid="img-profile-preview"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                        <UserIcon className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="cursor-pointer"
                      data-testid="input-profile-photo"
                    />
                    <p className="text-xs text-gray-500">
                      JPEG, PNG ou WebP. Máximo 5MB.
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      {profilePhotoData && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleUploadPhoto}
                          disabled={uploadPhotoMutation.isPending}
                          data-testid="button-upload-photo"
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          {uploadPhotoMutation.isPending ? "Enviando..." : "Enviar Foto"}
                        </Button>
                      )}
                      {selectedUser?.profilePhotoUrl && (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={handleDeletePhoto}
                          disabled={deletePhotoMutation.isPending}
                          data-testid="button-delete-photo"
                        >
                          <X className="h-4 w-4 mr-1" />
                          {deletePhotoMutation.isPending ? "Removendo..." : "Remover Foto"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome de usuário</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-edit-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-role">
                          <SelectValue placeholder="Selecione uma função" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="staff">Funcionário</SelectItem>
                        <SelectItem value="viewer">Visualizador</SelectItem>
                        <SelectItem value="doctor">Médico</SelectItem>
                        <SelectItem value="triage">Enfermeiro</SelectItem>
                        <SelectItem value="farmacia">Farmacêutico</SelectItem>
                        <SelectItem value="laboratorio">Biomédico</SelectItem>
                        <SelectItem value="radiologista">Radiologista</SelectItem>
                        <SelectItem value="diretor">Diretor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campos específicos para médicos no formulário de edição */}
              {editForm.watch("role") === "doctor" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="crm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CRM *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: CRM/PE 12345" data-testid="input-edit-crm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="medicalSpecialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especialidade Médica</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-specialty">
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
                </div>
              )}

              {/* Campo Unidade de Saúde para médicos */}
              {editForm.watch("role") === "doctor" && (
                <FormField
                  control={editForm.control}
                  name="healthUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade de Saúde</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-healthunit">
                            <SelectValue placeholder="Selecione a unidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PSF">PSF</SelectItem>
                          <SelectItem value="CEM">CEM</SelectItem>
                          <SelectItem value="CEO">CEO</SelectItem>
                          <SelectItem value="Unidade de Fisioterapia Integrada">Unidade de Fisioterapia Integrada</SelectItem>
                          <SelectItem value="Hospital Municipal">Hospital Municipal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Campo COREN para enfermeiros */}
              {editForm.watch("role") === "triage" && (
                <FormField
                  control={editForm.control}
                  name="coren"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>COREN *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: COREN/PE 123456" data-testid="input-edit-coren" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Campo CRBM para biomédicos */}
              {editForm.watch("role") === "laboratorio" && (
                <FormField
                  control={editForm.control}
                  name="crbm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CRBM *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: CRBM/PE 12345" data-testid="input-edit-crbm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Campo CRF para farmacêuticos */}
              {editForm.watch("role") === "farmacia" && (
                <FormField
                  control={editForm.control}
                  name="crf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CRF *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: CRF/PE 12345" data-testid="input-edit-crf" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Campo CRTR para radiologistas */}
              {editForm.watch("role") === "radiologista" && (
                <FormField
                  control={editForm.control}
                  name="crtr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CRTR *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: CRTR/PE 12345" data-testid="input-edit-crtr" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-new-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-confirm-new-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPasswordDialogOpen(false)}
                  data-testid="button-cancel-password"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={changePasswordMutation.isPending}
                  data-testid="button-submit-password"
                >
                  {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reset All Passwords Confirmation Dialog */}
      <Dialog open={isResetPasswordsDialogOpen} onOpenChange={setIsResetPasswordsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Resetar Todas as Senhas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-700">
              Esta ação irá resetar a senha de <strong>todos os usuários</strong> (exceto admin e admin.reserva) para a senha padrão <strong>"123456"</strong>.
            </p>
            <p className="text-gray-700">
              Os usuários serão obrigados a trocar a senha no próximo login.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-orange-800 text-sm font-medium">
                ⚠️ Esta ação não pode ser desfeita. Tem certeza que deseja continuar?
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsResetPasswordsDialogOpen(false)}
              data-testid="button-cancel-reset-passwords"
            >
              Cancelar
            </Button>
            <Button 
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => resetAllPasswordsMutation.mutate()}
              disabled={resetAllPasswordsMutation.isPending}
              data-testid="button-confirm-reset-passwords"
            >
              {resetAllPasswordsMutation.isPending ? "Resetando..." : "Confirmar Reset"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}