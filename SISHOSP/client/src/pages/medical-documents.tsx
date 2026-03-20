import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertMedicalDocumentSchema, type SelectMedicalDocument, type Patient } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, FilePlus, Printer, Send, Mail, Eye, ArrowLeft, FileCheck, ClipboardList, LogOut } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";
import exuBemCuidadaLogo from "@assets/logo exubemcuidada_1762210247656.png";
import secretariaSaudeLogo from "@assets/logo secretaria de saude_1762210247656.png";
import ministerioSaudeLogo from "@assets/Ministério_da_Saúde_1762210247657.png";
import susLogo from "@assets/sus-logo_1762210247657.png";
import { SmartDiagnosisInput, SmartMedicationInput } from "@/components/smart-prescription";
import type { CID10 } from "@/../../shared/clinical-support";

type MedicalDocumentFormData = z.infer<typeof insertMedicalDocumentSchema>;

export default function MedicalDocumentsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<SelectMedicalDocument | null>(null);
  const [documentType, setDocumentType] = useState<"prescription" | "certificate" | "medical_report">("prescription");
  const [sendingDocument, setSendingDocument] = useState<SelectMedicalDocument | null>(null);
  const [sendMethod, setSendMethod] = useState<"whatsapp" | "email" | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedCID, setSelectedCID] = useState<CID10 | null>(null);
  const [medicationsList, setMedicationsList] = useState<string[]>([]);
  const [searchPatientId, setSearchPatientId] = useState<string>("");
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>("");

  // Fetch current user
  const { data: user } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  // Fetch patients
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Fetch medical documents
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery<SelectMedicalDocument[]>({
    queryKey: ["/api/medical-documents"],
  });

  // Fetch prescription templates for quick fill
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/prescription-templates"],
  });

  const form = useForm<MedicalDocumentFormData>({
    resolver: zodResolver(insertMedicalDocumentSchema),
    defaultValues: {
      patientId: "",
      doctorId: user?.id || "",
      doctorName: user?.name || "",
      doctorCrm: user?.crm || "",
      documentType: "prescription",
      title: "",
      content: "",
      diagnosis: "",
      medications: "",
      observations: "",
      daysOff: "",
      cid: "",
      issueDate: format(new Date(), "yyyy-MM-dd"),
      sentViaWhatsApp: false,
      sentViaEmail: false,
      printed: false,
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: MedicalDocumentFormData) => {
      const response = await apiRequest("/api/medical-documents", {
        method: "POST",
        body: {
          ...data,
          doctorId: user?.id || "",
          doctorName: user?.name || "",
          doctorCrm: user?.crm || "",
        },
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Documento criado",
        description: "Documento médico criado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-documents"] });
      setShowForm(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar documento",
        description: error.message || "Não foi possível criar o documento.",
        variant: "destructive",
      });
    },
  });

  // Send via WhatsApp mutation
  const sendWhatsAppMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return await apiRequest(`/api/medical-documents/${documentId}/send-whatsapp`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Enviado via WhatsApp",
        description: "Notificação enviada ao paciente via WhatsApp.",
      });
      setSendingDocument(null);
      setSendMethod(null);
      queryClient.invalidateQueries({ queryKey: ["/api/medical-documents"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar via WhatsApp",
        description: error.message || "Não foi possível enviar a notificação.",
        variant: "destructive",
      });
    },
  });

  // Send via Email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({ documentId, email }: { documentId: string; email: string }) => {
      return await apiRequest(`/api/medical-documents/${documentId}/send-email`, {
        method: "POST",
        body: { recipientEmail: email },
      });
    },
    onSuccess: () => {
      toast({
        title: "Enviado via Email",
        description: "Documento enviado com sucesso para o email informado.",
      });
      setSendingDocument(null);
      setSendMethod(null);
      setRecipientEmail("");
      queryClient.invalidateQueries({ queryKey: ["/api/medical-documents"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar via Email",
        description: error.message || "Não foi possível enviar o email.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MedicalDocumentFormData) => {
    createMutation.mutate(data);
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "prescription":
        return "Receita Médica";
      case "certificate":
        return "Atestado Médico";
      case "medical_report":
        return "Relatório Médico";
      default:
        return type;
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case "prescription":
        return <FileText className="h-4 w-4" />;
      case "certificate":
        return <FileCheck className="h-4 w-4" />;
      case "medical_report":
        return <ClipboardList className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      form.setValue("diagnosis", template.diagnosis || "");
      form.setValue("medications", template.medications || "");
      form.setValue("observations", template.observations || "");
      form.setValue("content", 
        `${template.diagnosis || ""}\n\nTratamento:\n${template.treatment || ""}\n\nMedicações:\n${template.medications || ""}\n\nObservações:\n${template.observations || ""}`
      );
      toast({
        title: "Template aplicado",
        description: `Template "${template.templateName}" foi aplicado ao formulário.`,
      });
    }
  };

  // Handle document type change
  const handleDocumentTypeChange = (type: "prescription" | "certificate" | "medical_report") => {
    setDocumentType(type);
    form.setValue("documentType", type);
    
    // Set default title based on type
    switch (type) {
      case "prescription":
        form.setValue("title", "Receita Médica");
        break;
      case "certificate":
        form.setValue("title", "Atestado Médico");
        break;
      case "medical_report":
        form.setValue("title", "Relatório Médico");
        break;
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="mb-6 border-2 border-green-200 dark:border-green-800">
          <CardHeader className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-t-lg p-4">
            <div className="flex flex-col gap-4">
              {/* Top row: Back button, Title, and Action buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => setLocation("/")}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    data-testid="button-back"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </Button>
                  <div>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      <FileText className="h-6 w-6" />
                      Documentos Médicos
                    </CardTitle>
                    <CardDescription className="text-green-100">
                      Receitas, Atestados e Prescrições
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowForm(!showForm)}
                    variant="secondary"
                    className="font-semibold"
                    data-testid="button-new-document"
                  >
                    <FilePlus className="h-5 w-5 mr-2" />
                    {showForm ? "Cancelar" : "Novo Documento"}
                  </Button>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                    data-testid="logout-button"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </div>
              {/* Bottom row: Logos */}
              <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/20">
                <img src={hospitalLogo} alt="Hospital" className="h-12 w-auto bg-white p-1 rounded" />
                <img src={exuBemCuidadaLogo} alt="Exu Bem Cuidada" className="h-10 w-auto" />
                <img src={secretariaSaudeLogo} alt="Secretaria de Saúde" className="h-10 w-auto" />
                <img src={ministerioSaudeLogo} alt="Ministério da Saúde" className="h-10 w-auto" />
                <img src={susLogo} alt="SUS" className="h-10 w-auto" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Doctor Info Card */}
        {user && (
          <Card className="mb-6 border-2 border-blue-200 dark:border-blue-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{user.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    CRM: {user.crm || "Não informado"} | {user.medicalSpecialty || "Especialidade não informada"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form for new document */}
        {showForm && (
          <Card className="mb-6 border-2 border-green-300 dark:border-green-700">
            <CardHeader className="bg-green-50 dark:bg-gray-800">
              <CardTitle className="flex items-center gap-2">
                <FilePlus className="h-5 w-5" />
                Criar Novo Documento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Document Type Selection */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Tipo de Documento *</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button
                        type="button"
                        variant={documentType === "prescription" ? "default" : "outline"}
                        className="h-auto flex-col py-4"
                        onClick={() => handleDocumentTypeChange("prescription")}
                        data-testid="button-type-prescription"
                      >
                        <FileText className="h-8 w-8 mb-2" />
                        <span className="font-semibold">Receita Médica</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Prescrição de medicamentos</span>
                      </Button>
                      <Button
                        type="button"
                        variant={documentType === "certificate" ? "default" : "outline"}
                        className="h-auto flex-col py-4"
                        onClick={() => handleDocumentTypeChange("certificate")}
                        data-testid="button-type-certificate"
                      >
                        <FileCheck className="h-8 w-8 mb-2" />
                        <span className="font-semibold">Atestado Médico</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Afastamento e CID</span>
                      </Button>
                      <Button
                        type="button"
                        variant={documentType === "medical_report" ? "default" : "outline"}
                        className="h-auto flex-col py-4"
                        onClick={() => handleDocumentTypeChange("medical_report")}
                        data-testid="button-type-report"
                      >
                        <ClipboardList className="h-8 w-8 mb-2" />
                        <span className="font-semibold">Relatório Médico</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Relatório completo</span>
                      </Button>
                    </div>
                  </div>

                  {/* Patient and Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Paciente *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-patient">
                                <SelectValue placeholder="Selecione o paciente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {patients.map((patient) => (
                                <SelectItem key={patient.id} value={patient.id}>
                                  {patient.name} - CPF: {patient.cpf}
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
                      name="issueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Emissão *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-issue-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Template Selection (only for prescriptions) */}
                  {documentType === "prescription" && templates.length > 0 && (
                    <div>
                      <Label>Template de Receita (Opcional)</Label>
                      <Select onValueChange={handleTemplateSelect}>
                        <SelectTrigger data-testid="select-template">
                          <SelectValue placeholder="Selecione um template para preencher automaticamente" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.templateName} {template.specialty && `(${template.specialty})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500 mt-1">
                        Selecione um template para preencher automaticamente os campos
                      </p>
                    </div>
                  )}

                  {/* Conditional fields based on document type */}
                  {documentType === "certificate" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <FormField
                        control={form.control}
                        name="daysOff"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dias de Afastamento</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="Ex: 3 dias" data-testid="input-days-off" />
                            </FormControl>
                            <FormDescription>Quantos dias o paciente deve ficar afastado</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cid"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CID (Código)</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="Ex: CID-10 J00" data-testid="input-cid" />
                            </FormControl>
                            <FormDescription>Código CID da condição (opcional)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Main Content */}
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conteúdo do Documento *</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Escreva o conteúdo completo do documento aqui..."
                            rows={10}
                            className="font-mono"
                            data-testid="input-content"
                          />
                        </FormControl>
                        <FormDescription>
                          Este é o texto principal que será impresso ou enviado ao paciente
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Smart Diagnosis Input */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="diagnosis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Diagnóstico (com busca CID-10)</FormLabel>
                          <FormControl>
                            <SmartDiagnosisInput
                              value={field.value || ""}
                              onChange={(value, cid) => {
                                field.onChange(value);
                                if (cid) {
                                  setSelectedCID(cid);
                                  if (documentType === "certificate") {
                                    form.setValue("cid", cid.code);
                                  }
                                }
                              }}
                              onCIDSelected={(cid) => setSelectedCID(cid)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Smart Medication Input */}
                    <FormField
                      control={form.control}
                      name="medications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Medicamentos (com verificação de interações)</FormLabel>
                          <FormControl>
                            <SmartMedicationInput
                              medications={medicationsList}
                              onMedicationsChange={(meds) => {
                                setMedicationsList(meds);
                                field.onChange(meds.join("\n"));
                              }}
                              selectedCID={selectedCID}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="observations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações Adicionais</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} placeholder="Observações gerais..." rows={3} data-testid="input-observations" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      size="lg"
                      className="flex-1"
                      data-testid="button-create-document"
                    >
                      {createMutation.isPending ? "Criando..." : "Criar Documento"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        form.reset();
                      }}
                      size="lg"
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Documents List */}
        <Card className="border-2 border-green-200 dark:border-green-700">
          <CardHeader className="bg-green-50 dark:bg-gray-800">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos Criados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Patient Search */}
            <div className="mb-6">
              <Label className="text-sm font-medium mb-2 block">Pesquisar Paciente</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Digite nome, CPF ou cartão SUS do paciente..."
                    value={patientSearchQuery}
                    onChange={(e) => {
                      setPatientSearchQuery(e.target.value);
                      if (!e.target.value) setSearchPatientId("");
                    }}
                    data-testid="input-search-patient"
                  />
                </div>
                {patientSearchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchPatientId("");
                      setPatientSearchQuery("");
                    }}
                    data-testid="button-clear-search"
                  >
                    Limpar
                  </Button>
                )}
              </div>
              {/* Patient results */}
              {patientSearchQuery && !searchPatientId && (
                <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                  {patients
                    .filter(p => 
                      p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
                      (p.cpf && p.cpf.includes(patientSearchQuery)) ||
                      (p.susCard && p.susCard.includes(patientSearchQuery))
                    )
                    .slice(0, 10)
                    .map((patient) => (
                      <div
                        key={patient.id}
                        className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setSearchPatientId(patient.id);
                          setPatientSearchQuery(patient.name);
                        }}
                        data-testid={`patient-result-${patient.id}`}
                      >
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-sm text-gray-500">
                          CPF: {patient.cpf || "N/A"} | SUS: {patient.susCard || "N/A"}
                        </p>
                      </div>
                    ))}
                  {patients.filter(p => 
                    p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
                    (p.cpf && p.cpf.includes(patientSearchQuery)) ||
                    (p.susCard && p.susCard.includes(patientSearchQuery))
                  ).length === 0 && (
                    <div className="p-3 text-gray-500 text-center">
                      Nenhum paciente encontrado
                    </div>
                  )}
                </div>
              )}
            </div>

            {!searchPatientId ? (
              <div className="text-center py-12 border-t">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Selecione um paciente para visualizar os documentos.</p>
                <p className="text-gray-400 text-sm mt-2">Use o campo de busca acima para encontrar um paciente.</p>
              </div>
            ) : isLoadingDocuments ? (
              <p className="text-center py-8 text-gray-500">Carregando documentos...</p>
            ) : documents.filter(d => d.patientId === searchPatientId).length === 0 ? (
              <div className="text-center py-12 border-t">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum documento encontrado para este paciente.</p>
                <Button
                  onClick={() => setShowForm(true)}
                  variant="outline"
                  className="mt-4"
                  data-testid="button-first-document"
                >
                  Criar Primeiro Documento
                </Button>
              </div>
            ) : (
              <div className="space-y-4 border-t pt-4">
                {documents.filter(d => d.patientId === searchPatientId).map((document) => {
                  const patient = patients.find((p) => p.id === document.patientId);
                  return (
                    <Card key={document.id} className="border-l-4 border-green-500" data-testid={`card-document-${document.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getDocumentTypeIcon(document.documentType)}
                              <h3 className="font-semibold text-lg">{document.title}</h3>
                              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                {getDocumentTypeLabel(document.documentType)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              <strong>Paciente:</strong> {patient?.name || "Desconhecido"}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              <strong>Médico:</strong> {document.doctorName} - CRM: {document.doctorCrm}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <strong>Data de Emissão:</strong> {format(new Date(document.issueDate), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                            {document.diagnosis && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                <strong>Diagnóstico:</strong> {document.diagnosis}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedDocument(document)}
                              data-testid={`button-view-${document.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  console.log('Requesting PDF for document:', document.id);
                                  const response = await fetch(`/api/medical-documents/${document.id}/pdf`, {
                                    credentials: "include",
                                  });
                                  
                                  console.log('Response status:', response.status);
                                  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
                                  
                                  if (!response.ok) {
                                    const errorText = await response.text();
                                    console.error('Error response:', errorText);
                                    throw new Error(`Erro ${response.status}: ${errorText}`);
                                  }
                                  
                                  const blob = await response.blob();
                                  console.log('Blob received, size:', blob.size, 'type:', blob.type);
                                  
                                  if (blob.size === 0) {
                                    throw new Error("PDF vazio recebido");
                                  }
                                  
                                  const url = window.URL.createObjectURL(blob);
                                  const a = window.document.createElement("a");
                                  a.href = url;
                                  a.download = `${document.title}_${patient?.name || 'documento'}.pdf`;
                                  window.document.body.appendChild(a);
                                  a.click();
                                  
                                  // Cleanup
                                  setTimeout(() => {
                                    window.URL.revokeObjectURL(url);
                                    window.document.body.removeChild(a);
                                  }, 100);
                                  
                                  toast({
                                    title: "PDF gerado",
                                    description: "O documento foi baixado com sucesso.",
                                  });
                                  
                                  // Refresh the document list to update printed status
                                  queryClient.invalidateQueries({ queryKey: ["/api/medical-documents"] });
                                } catch (error: any) {
                                  console.error('PDF generation error:', error);
                                  toast({
                                    title: "Erro ao gerar PDF",
                                    description: error.message || "Não foi possível gerar o PDF do documento.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              data-testid={`button-print-${document.id}`}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSendingDocument(document);
                                setSendMethod("whatsapp");
                              }}
                              disabled={sendWhatsAppMutation.isPending}
                              data-testid={`button-whatsapp-${document.id}`}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSendingDocument(document);
                                setSendMethod("email");
                              }}
                              disabled={sendEmailMutation.isPending}
                              data-testid={`button-email-${document.id}`}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Document Dialog */}
        <Dialog open={selectedDocument !== null} onOpenChange={(open) => !open && setSelectedDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedDocument && getDocumentTypeIcon(selectedDocument.documentType)}
                {selectedDocument?.title}
              </DialogTitle>
              <DialogDescription>
                Visualização completa do documento médico
              </DialogDescription>
            </DialogHeader>
            {selectedDocument && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Informações do Documento</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Tipo:</p>
                      <p className="font-medium">{getDocumentTypeLabel(selectedDocument.documentType)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Data de Emissão:</p>
                      <p className="font-medium">{format(new Date(selectedDocument.issueDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Paciente:</p>
                      <p className="font-medium">{patients.find(p => p.id === selectedDocument.patientId)?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Médico:</p>
                      <p className="font-medium">{selectedDocument.doctorName} - CRM: {selectedDocument.doctorCrm}</p>
                    </div>
                  </div>
                </div>

                {selectedDocument.documentType === "certificate" && (selectedDocument.daysOff || selectedDocument.cid) && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h3 className="font-semibold mb-2">Informações do Atestado</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedDocument.daysOff && (
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Dias de Afastamento:</p>
                          <p className="font-medium">{selectedDocument.daysOff}</p>
                        </div>
                      )}
                      {selectedDocument.cid && (
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">CID:</p>
                          <p className="font-medium">{selectedDocument.cid}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Conteúdo Principal</h3>
                  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border whitespace-pre-wrap">
                    {selectedDocument.content}
                  </div>
                </div>

                {selectedDocument.diagnosis && (
                  <div>
                    <h3 className="font-semibold mb-2">Diagnóstico</h3>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      {selectedDocument.diagnosis}
                    </div>
                  </div>
                )}

                {selectedDocument.medications && (
                  <div>
                    <h3 className="font-semibold mb-2">Medicamentos Prescritos</h3>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 whitespace-pre-wrap">
                      {selectedDocument.medications}
                    </div>
                  </div>
                )}

                {selectedDocument.observations && (
                  <div>
                    <h3 className="font-semibold mb-2">Observações</h3>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border whitespace-pre-wrap">
                      {selectedDocument.observations}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Send via WhatsApp Dialog */}
        <Dialog open={sendMethod === "whatsapp"} onOpenChange={(open) => {
          if (!open) {
            setSendingDocument(null);
            setSendMethod(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Enviar via WhatsApp
              </DialogTitle>
              <DialogDescription>
                Confirme o envio da notificação sobre o documento médico para o WhatsApp do paciente.
              </DialogDescription>
            </DialogHeader>
            {sendingDocument && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm"><strong>Documento:</strong> {sendingDocument.title}</p>
                  <p className="text-sm"><strong>Paciente:</strong> {patients.find(p => p.id === sendingDocument.patientId)?.name}</p>
                  <p className="text-sm"><strong>WhatsApp:</strong> {patients.find(p => p.id === sendingDocument.patientId)?.whatsapp}</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Uma notificação será enviada via WhatsApp informando o paciente que o documento está disponível.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSendingDocument(null);
                      setSendMethod(null);
                    }}
                    data-testid="button-cancel-whatsapp"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      if (sendingDocument) {
                        sendWhatsAppMutation.mutate(sendingDocument.id);
                      }
                    }}
                    disabled={sendWhatsAppMutation.isPending}
                    data-testid="button-confirm-whatsapp"
                  >
                    {sendWhatsAppMutation.isPending ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Send via Email Dialog */}
        <Dialog open={sendMethod === "email"} onOpenChange={(open) => {
          if (!open) {
            setSendingDocument(null);
            setSendMethod(null);
            setRecipientEmail("");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Enviar via Email
              </DialogTitle>
              <DialogDescription>
                Informe o endereço de email do destinatário para enviar o documento em PDF.
              </DialogDescription>
            </DialogHeader>
            {sendingDocument && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm"><strong>Documento:</strong> {sendingDocument.title}</p>
                  <p className="text-sm"><strong>Paciente:</strong> {patients.find(p => p.id === sendingDocument.patientId)?.name}</p>
                  <p className="text-sm"><strong>Médico:</strong> {sendingDocument.doctorName}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipient-email">Email do Destinatário</Label>
                  <Input
                    id="recipient-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    data-testid="input-recipient-email"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  O documento será enviado em formato PDF como anexo do email.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSendingDocument(null);
                      setSendMethod(null);
                      setRecipientEmail("");
                    }}
                    data-testid="button-cancel-email"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      if (sendingDocument && recipientEmail) {
                        sendEmailMutation.mutate({ 
                          documentId: sendingDocument.id, 
                          email: recipientEmail 
                        });
                      }
                    }}
                    disabled={sendEmailMutation.isPending || !recipientEmail}
                    data-testid="button-confirm-email"
                  >
                    {sendEmailMutation.isPending ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
