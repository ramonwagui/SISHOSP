import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileImage, 
  FlaskConical, 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  XCircle,
  User,
  Stethoscope,
  FileText,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  LogOut,
  Upload,
  Image,
  X,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ExamRequest, Patient } from "@shared/schema";

interface ExamRequestWithPatient extends ExamRequest {
  patient?: Patient;
}

export default function RadiologiaPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedExam, setSelectedExam] = useState<ExamRequestWithPatient | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [viewImagesDialogOpen, setViewImagesDialogOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

  const { data: examRequests = [], isLoading, refetch } = useQuery<ExamRequestWithPatient[]>({
    queryKey: ['/api/exam-requests'],
    refetchInterval: 30000,
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });

  const { user } = useAuth();

  const startExamMutation = useMutation({
    mutationFn: async (examId: string) => {
      return apiRequest(`/api/exam-requests/${examId}/start`, {
        method: 'POST',
        body: {
          performingDoctorId: user?.id,
          performingDoctorName: user?.name
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exam-requests'] });
      toast({
        title: "Exame iniciado",
        description: "O exame foi marcado como em andamento.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o exame.",
        variant: "destructive",
      });
    }
  });

  const addImagesMutation = useMutation({
    mutationFn: async ({ examId, images }: { examId: string; images: string[] }) => {
      return apiRequest(`/api/exam-requests/${examId}/images`, {
        method: 'POST',
        body: { images }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exam-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-documents'] });
      setImageDialogOpen(false);
      setSelectedExam(null);
      setUploadedImages([]);
      toast({
        title: "Imagens salvas",
        description: "As imagens do raio-x foram salvas e adicionadas ao histórico médico do paciente.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as imagens.",
        variant: "destructive",
      });
    }
  });

  const cancelExamMutation = useMutation({
    mutationFn: async (examId: string) => {
      return apiRequest(`/api/exam-requests/${examId}/cancel`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exam-requests'] });
      toast({
        title: "Exame cancelado",
        description: "O exame foi cancelado.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o exame.",
        variant: "destructive",
      });
    }
  });

  const getPatientInfo = (patientId: string) => {
    return patients.find(p => p.id === patientId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case 'em_andamento':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><PlayCircle className="w-3 h-3 mr-1" /> Em Andamento</Badge>;
      case 'concluido':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluído</Badge>;
      case 'cancelado':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="w-3 h-3 mr-1" /> Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'urgente') {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Urgente</Badge>;
    }
    return null;
  };

  const getExamTypeIcon = (examType: string) => {
    switch (examType) {
      case 'imagem':
        return <FileImage className="w-5 h-5 text-blue-600" />;
      case 'laboratorio':
        return <FlaskConical className="w-5 h-5 text-green-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const filteredExams = examRequests.filter(exam => {
    if (exam.examType !== 'imagem') return false;
    if (statusFilter !== 'all' && exam.status !== statusFilter) return false;
    if (searchQuery) {
      const patient = getPatientInfo(exam.patientId);
      const searchLower = searchQuery.toLowerCase();
      const matchesPatient = patient?.name.toLowerCase().includes(searchLower) || 
                            patient?.cpf.includes(searchQuery) ||
                            patient?.susCard.includes(searchQuery);
      const matchesExam = exam.examName.toLowerCase().includes(searchLower) ||
                         exam.examCode.toLowerCase().includes(searchLower);
      if (!matchesPatient && !matchesExam) return false;
    }
    return true;
  });

  const pendingExams = filteredExams.filter(e => e.status === 'pendente');
  const inProgressExams = filteredExams.filter(e => e.status === 'em_andamento');
  const completedExams = filteredExams.filter(e => e.status === 'concluido');
  const cancelledExams = filteredExams.filter(e => e.status === 'cancelado');

  const toggleExpanded = (examId: string) => {
    const newExpanded = new Set(expandedExams);
    if (newExpanded.has(examId)) {
      newExpanded.delete(examId);
    } else {
      newExpanded.add(examId);
    }
    setExpandedExams(newExpanded);
  };

  const handleStartExam = (exam: ExamRequestWithPatient) => {
    startExamMutation.mutate(exam.id);
  };

  const handleSubmitImages = () => {
    if (!selectedExam || uploadedImages.length === 0) {
      toast({
        title: "Erro",
        description: "Pelo menos uma imagem é obrigatória.",
        variant: "destructive",
      });
      return;
    }
    addImagesMutation.mutate({
      examId: selectedExam.id,
      images: uploadedImages
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadedPaths: string[] = [];
    
    try {
      const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
      const csrfData = await csrfResponse.json();
      
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/objects/upload-file', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-CSRF-Token': csrfData.csrfToken
          },
          body: formData
        });
        
        if (response.ok) {
          const result = await response.json();
          uploadedPaths.push(result.objectPath);
        } else {
          console.error('Upload failed for file:', file.name);
        }
      }
      
      if (uploadedPaths.length > 0) {
        setUploadedImages(prev => [...prev, ...uploadedPaths]);
        toast({
          title: "Upload concluído",
          description: `${uploadedPaths.length} imagem(s) carregada(s).`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer o upload das imagens.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const openImageDialog = (exam: ExamRequestWithPatient) => {
    setSelectedExam(exam);
    setUploadedImages([]);
    setImageDialogOpen(true);
  };

  const openViewImagesDialog = (exam: ExamRequestWithPatient) => {
    setSelectedExam(exam);
    setViewImagesDialogOpen(true);
  };

  const handleCancelExam = (examId: string) => {
    if (confirm("Tem certeza que deseja cancelar este exame?")) {
      cancelExamMutation.mutate(examId);
    }
  };

  const ExamCard = ({ exam }: { exam: ExamRequestWithPatient }) => {
    const patient = getPatientInfo(exam.patientId);
    const isExpanded = expandedExams.has(exam.id);

    return (
      <Card className="mb-3" data-testid={`exam-card-${exam.id}`}>
        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(exam.id)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getExamTypeIcon(exam.examType)}
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {exam.examName}
                      {getPriorityBadge(exam.priority)}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {patient?.name || "Paciente não encontrado"}
                      </span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(exam.status)}
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Stethoscope className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Solicitante:</span>
                    <span className="font-medium">{exam.requestingDoctorName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Data:</span>
                    <span className="font-medium">
                      {exam.requestDate} às {exam.requestTime}
                    </span>
                  </div>
                  {patient && (
                    <>
                      <div className="text-sm">
                        <span className="text-gray-600">CPF:</span>{" "}
                        <span className="font-medium">{patient.cpf}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Cartão SUS:</span>{" "}
                        <span className="font-medium">{patient.susCard}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-600">Código:</span>{" "}
                    <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{exam.examCode}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Categoria:</span>{" "}
                    <span className="font-medium capitalize">{exam.examCategory.replace(/_/g, ' ')}</span>
                  </div>
                  {exam.clinicalIndication && (
                    <div className="text-sm">
                      <span className="text-gray-600">Indicação Clínica:</span>{" "}
                      <span className="font-medium">{exam.clinicalIndication}</span>
                    </div>
                  )}
                </div>
              </div>

              {exam.status === 'concluido' && exam.images && exam.images.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mb-4">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Imagens do Exame ({exam.images.length})
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {exam.images.slice(0, 3).map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16 bg-gray-200 rounded overflow-hidden">
                        <img 
                          src={img} 
                          alt={`Imagem ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {exam.images.length > 3 && (
                      <div className="w-16 h-16 bg-gray-300 rounded flex items-center justify-center text-sm font-medium text-gray-600">
                        +{exam.images.length - 3}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openViewImagesDialog(exam)}
                    className="text-green-700"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver Todas
                  </Button>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    Finalizado em {exam.resultDate} às {exam.resultTime}
                    {exam.performingDoctorName && ` por ${exam.performingDoctorName}`}
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                {exam.status === 'pendente' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelExam(exam.id)}
                      disabled={cancelExamMutation.isPending}
                      data-testid={`cancel-exam-${exam.id}`}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleStartExam(exam)}
                      disabled={startExamMutation.isPending}
                      data-testid={`start-exam-${exam.id}`}
                    >
                      <PlayCircle className="w-4 h-4 mr-1" />
                      Iniciar
                    </Button>
                  </>
                )}
                {exam.status === 'em_andamento' && (
                  <Button
                    size="sm"
                    onClick={() => openImageDialog(exam)}
                    data-testid={`complete-exam-${exam.id}`}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Adicionar Imagens
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileImage className="w-7 h-7 text-primary" />
              Painel de Radiologia
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gerencie solicitações de exames de imagem
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline" data-testid="refresh-button">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{pendingExams.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">Em Andamento</p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{inProgressExams.length}</p>
              </div>
              <PlayCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">Concluídos</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">{completedExams.length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">Cancelados</p>
                <p className="text-2xl font-bold text-red-800 dark:text-red-200">{cancelledExams.length}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por paciente, CPF, cartão SUS ou exame..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="status-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-2" data-testid="tab-pending">
            <Clock className="w-4 h-4" />
            Pendentes ({pendingExams.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="flex items-center gap-2" data-testid="tab-in-progress">
            <PlayCircle className="w-4 h-4" />
            Em Andamento ({inProgressExams.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2" data-testid="tab-completed">
            <CheckCircle2 className="w-4 h-4" />
            Concluídos ({completedExams.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2" data-testid="tab-cancelled">
            <XCircle className="w-4 h-4" />
            Cancelados ({cancelledExams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingExams.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum exame pendente</p>
            </Card>
          ) : (
            <div>
              {pendingExams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="mt-4">
          {inProgressExams.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <PlayCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum exame em andamento</p>
            </Card>
          ) : (
            <div>
              {inProgressExams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedExams.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum exame concluído</p>
            </Card>
          ) : (
            <div>
              {completedExams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4">
          {cancelledExams.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum exame cancelado</p>
            </Card>
          ) : (
            <div>
              {cancelledExams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Adicionar Imagens do Exame
            </DialogTitle>
            <DialogDescription>
              {selectedExam && (
                <span>
                  {selectedExam.examName} - {getPatientInfo(selectedExam.patientId)?.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Imagens do Raio-X *</Label>
              <p className="text-sm text-gray-500 mb-3">
                Faça upload das imagens do exame. Formatos aceitos: JPG, PNG, DICOM.
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/*,.dcm"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
                <label htmlFor="image-upload" className="cursor-pointer block">
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-sm text-gray-600">Enviando imagens...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">Clique para selecionar imagens</span>
                      <span className="text-xs text-gray-400">JPG, PNG, DICOM (máx. 50MB cada)</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
            
            {uploadedImages.length > 0 && (
              <div>
                <Label className="mb-2 block">Imagens Carregadas ({uploadedImages.length})</Label>
                <div className="grid grid-cols-4 gap-2">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-full h-20 bg-gray-100 rounded overflow-hidden">
                        <img 
                          src={img} 
                          alt={`Imagem ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeUploadedImage(idx)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        type="button"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitImages} 
              disabled={addImagesMutation.isPending || uploadedImages.length === 0}
              data-testid="submit-images-button"
            >
              {addImagesMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Salvar Imagens
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewImagesDialogOpen} onOpenChange={setViewImagesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Imagens do Exame
            </DialogTitle>
            <DialogDescription>
              {selectedExam && (
                <span>
                  {selectedExam.examName} - {getPatientInfo(selectedExam.patientId)?.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {selectedExam?.images?.map((img, idx) => (
              <div key={idx} className="relative">
                <a href={img} target="_blank" rel="noopener noreferrer">
                  <img 
                    src={img} 
                    alt={`Imagem ${idx + 1}`}
                    className="w-full h-48 object-cover rounded-lg border hover:opacity-80 transition-opacity cursor-pointer"
                  />
                </a>
                <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {idx + 1}/{selectedExam.images?.length}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewImagesDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
