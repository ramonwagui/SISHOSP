import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SignaturePad, SignaturePadRef } from "@/components/signature-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PenTool, Save, Trash2, ArrowLeft, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SignatureSettings() {
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch current user data
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Save signature mutation
  const saveSignatureMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      return await apiRequest("/api/users/signature", {
        method: "POST",
        body: { signature: signatureData },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Assinatura salva",
        description: "Sua assinatura foi salva com sucesso e será usada em todos os documentos médicos.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar sua assinatura. Tente novamente.",
      });
    },
  });

  // Delete signature mutation
  const deleteSignatureMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/users/signature", {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      signaturePadRef.current?.clear();
      setShowDeleteDialog(false);
      toast({
        title: "Assinatura removida",
        description: "Sua assinatura foi removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao remover",
        description: "Não foi possível remover sua assinatura. Tente novamente.",
      });
    },
  });

  const handleSaveSignature = (signatureData: string) => {
    console.log("🖊️ Frontend - Signature data prefix:", signatureData.substring(0, 30));
    console.log("🖊️ Frontend - Full signature length:", signatureData.length);
    saveSignatureMutation.mutate(signatureData);
  };

  const handleDeleteSignature = () => {
    deleteSignatureMutation.mutate();
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
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            data-testid="button-back"
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <PenTool className="h-8 w-8 text-blue-600" />
          Gerenciar Assinatura Digital
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure sua assinatura digital para assinar documentos médicos eletronicamente.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Assinatura Atual */}
        {user?.signature && (
          <Card>
            <CardHeader>
              <CardTitle>Assinatura Atual</CardTitle>
              <CardDescription>
                Esta é a assinatura que será utilizada em todos os seus documentos médicos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white">
                  <img
                    src={user.signature}
                    alt="Assinatura atual"
                    className="max-w-full h-auto"
                    style={{ maxHeight: "150px" }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.name}
                  </p>
                  {user.crm && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">CRM: {user.crm}</p>
                  )}
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={deleteSignatureMutation.isPending}
                  data-testid="button-delete-signature"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover Assinatura
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Criar/Atualizar Assinatura */}
        <Card>
          <CardHeader>
            <CardTitle>
              {user?.signature ? "Atualizar Assinatura" : "Criar Assinatura"}
            </CardTitle>
            <CardDescription>
              {user?.signature
                ? "Desenhe uma nova assinatura para substituir a atual."
                : "Desenhe sua assinatura no espaço abaixo para começar a assinar documentos digitalmente."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignaturePad
              ref={signaturePadRef}
              onSave={handleSaveSignature}
              width={600}
              height={200}
            />
          </CardContent>
        </Card>

        {/* Informações sobre Assinatura Digital */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              Como funciona a Assinatura Digital?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <p>
                  <strong>Criação:</strong> Desenhe sua assinatura usando mouse, trackpad ou touch screen.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <p>
                  <strong>Armazenamento:</strong> A assinatura é salva de forma segura em seu perfil.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <p>
                  <strong>Uso:</strong> Ao criar documentos médicos, você poderá assiná-los digitalmente.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  4
                </div>
                <p>
                  <strong>Rastreabilidade:</strong> Cada assinatura registra data, hora, IP e um hash único para auditoria.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  5
                </div>
                <p>
                  <strong>Segurança:</strong> Documentos assinados incluem sua assinatura visual, nome e CRM no rodapé.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Assinatura Digital</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover sua assinatura digital? Você não poderá assinar
              documentos até criar uma nova assinatura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSignature}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
