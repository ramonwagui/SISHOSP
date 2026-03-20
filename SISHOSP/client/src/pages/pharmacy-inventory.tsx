import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  Calendar, 
  ArrowUpDown, 
  Pill,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Trash2,
  Edit,
  Eye,
  Clock,
  ClipboardList,
  CheckCircle2,
  User,
  Stethoscope,
  Download,
  Loader2,
  LogOut,
  ChevronDown,
  ChevronRight,
  Link2,
  Star,
  Scissors,
  Send,
  Clock as ClockIcon
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { SelectMedicationsCatalog, SelectInventoryBatch, SelectInventoryMovement, SelectPrescription, SelectPrescriptionItem, Patient, PharmacyKitWithItems, SelectPharmacyKitDispensation, SelectPharmacyKit, MedicationKitAssociationWithDetails } from "@shared/schema";
import { TARJA_CLASSIFICACAO } from "@shared/schema";

type PharmacyKitDispensationWithKit = SelectPharmacyKitDispensation & { kit?: SelectPharmacyKit };

type MedicationWithBatch = SelectInventoryBatch & { medication?: SelectMedicationsCatalog };
type MovementWithDetails = SelectInventoryMovement & { medication?: SelectMedicationsCatalog; batch?: SelectInventoryBatch };
type PrescriptionWithDetails = SelectPrescription & { 
  patient?: Patient; 
  items?: SelectPrescriptionItem[];
};

const getTarjaColor = (tarja: string): string => {
  switch (tarja) {
    case "Azul": return "#3b82f6";
    case "Azul Escuro": return "#1e40af";
    case "Magenta": return "#d946ef";
    case "Preta": return "#171717";
    case "Verde": return "#22c55e";
    case "Verde Escuro": return "#166534";
    case "Vermelho": return "#ef4444";
    case "Vermelho Escuro": return "#991b1b";
    default: return "#9ca3af";
  }
};

export default function PharmacyInventory() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [dispensingTypeFilter, setDispensingTypeFilter] = useState<"all" | "prescription" | "procedure">("all");
  const [isAddMedicationOpen, setIsAddMedicationOpen] = useState(false);
  const [isEditMedicationOpen, setIsEditMedicationOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<SelectMedicationsCatalog | null>(null);
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<MedicationWithBatch | null>(null);

  const [newMedication, setNewMedication] = useState({
    name: "",
    genericName: "",
    code: "",
    form: "",
    concentration: "",
    manufacturer: "",
    minStock: "10",
    maxStock: "100",
    tarjaClassificacao: ""
  });

  const [newBatch, setNewBatch] = useState({
    medicationId: "",
    batchNumber: "",
    quantity: "",
    expirationDate: "",
    storageLocation: "",
    supplier: "",
    notes: ""
  });

  const [newMovement, setNewMovement] = useState({
    batchId: "",
    quantity: "",
    movementType: "entrada",
    reason: ""
  });

  const { data: medications = [], isLoading: loadingMedications } = useQuery<SelectMedicationsCatalog[]>({
    queryKey: ["/api/medications"],
  });

  const { data: allBatches = [], isLoading: loadingBatches } = useQuery<MedicationWithBatch[]>({
    queryKey: ["/api/inventory/batches"],
  });

  const { data: lowStockBatches = [] } = useQuery<MedicationWithBatch[]>({
    queryKey: ["/api/inventory/batches/low-stock"],
  });

  const { data: expiringBatches = [] } = useQuery<MedicationWithBatch[]>({
    queryKey: ["/api/inventory/batches/expiring"],
  });

  const { data: movements = [] } = useQuery<MovementWithDetails[]>({
    queryKey: ["/api/inventory/movements"],
  });

  const { data: alerts } = useQuery<{
    lowStock: number;
    expiring: number;
  }>({
    queryKey: ["/api/inventory/alerts"],
  });

  const { data: pendingPrescriptions = [], isLoading: loadingPrescriptions } = useQuery<PrescriptionWithDetails[]>({
    queryKey: ["/api/pharmacy/prescriptions/pending"],
  });

  // Query for pending procedure requests
  const { data: pendingProcedures = [], isLoading: loadingProcedures } = useQuery<any[]>({
    queryKey: ["/api/procedure-requests/pending"],
  });

  // Query for completed procedure requests
  const { data: completedProcedures = [], isLoading: loadingCompletedProcedures } = useQuery<any[]>({
    queryKey: ["/api/procedure-requests/completed"],
  });

  // Unified dispensing queue
  const { data: unifiedQueue = [], isLoading: loadingUnifiedQueue } = useQuery<any[]>({
    queryKey: ["/api/dispensing/queue"],
  });

  // Unified dispensing queue - completed
  const { data: completedQueue = [], isLoading: loadingCompletedQueue } = useQuery<any[]>({
    queryKey: ["/api/dispensing/queue", "completed"],
    queryFn: () => fetch("/api/dispensing/queue?status=completed").then(r => r.json()),
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: materials = [] } = useQuery<SelectMaterialsCatalog[]>({
    queryKey: ["/api/materials"],
  });

  const { data: medicationMaterialRequirements = [] } = useQuery<{
    id: string;
    medicationId: string;
    materialId: string;
    quantity: string;
    notes: string | null;
    material?: SelectMaterialsCatalog;
  }[]>({
    queryKey: ["/api/medication-material-requirements"],
  });

  const [isDispenseDialogOpen, setIsDispenseDialogOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionWithDetails | null>(null);
  const [dispenseBatchId, setDispenseBatchId] = useState("");
  const [dispenseQuantity, setDispenseQuantity] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedItem, setSelectedItem] = useState<SelectPrescriptionItem | null>(null);
  const [isDeleteBatchDialogOpen, setIsDeleteBatchDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<MedicationWithBatch | null>(null);

  // Estados para dispensação de itens de procedimentos
  const [isProcedureDispenseDialogOpen, setIsProcedureDispenseDialogOpen] = useState(false);
  const [selectedProcedureItem, setSelectedProcedureItem] = useState<any>(null);
  const [procedureDispenseBatchId, setProcedureDispenseBatchId] = useState("");
  const [procedureDispenseQuantity, setProcedureDispenseQuantity] = useState("");

  // Normalizar nome do medicamento para comparação (remove acentos, espaços, caracteres especiais)
  const normalizeMedicationName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9]/g, "") // Remove caracteres especiais
      .trim();
  };

  // Extrair o nome base do medicamento (remove forma farmacêutica entre parênteses)
  const extractBaseMedicationName = (name: string): string => {
    // Remove texto entre parênteses como "(comprimido)", "(injetável)", etc.
    const baseName = name.replace(/\s*\([^)]*\)\s*/g, '').trim();
    return normalizeMedicationName(baseName);
  };

  // Filtrar lotes disponíveis para o medicamento do item selecionado
  const availableBatchesForItem = useMemo(() => {
    if (!selectedItem) return [];
    
    return allBatches.filter(batch => {
      // Deve ter quantidade disponível
      if (parseInt(batch.quantity || "0") <= 0) return false;
      
      // Se o item tem medicationId, filtrar apenas pelo ID (match exato)
      if (selectedItem.medicationId && batch.medicationId) {
        return batch.medicationId === selectedItem.medicationId;
      }
      
      // Se não tem medicationId, fazer match inteligente pelo nome
      if (batch.medication?.name && selectedItem.medicationName) {
        const batchNameNorm = normalizeMedicationName(batch.medication.name);
        const batchGenericNorm = batch.medication.genericName 
          ? normalizeMedicationName(batch.medication.genericName) 
          : "";
        
        // Extrair nome base do item (sem forma farmacêutica)
        const itemBaseNorm = extractBaseMedicationName(selectedItem.medicationName);
        const itemFullNorm = normalizeMedicationName(selectedItem.medicationName);
        
        // Match EXATO apenas:
        // 1. Nome base do item é igual ao nome do medicamento do lote
        // 2. Nome completo normalizado é igual ao nome do lote
        // 3. Nome base do item é igual ao nome genérico do lote
        // NÃO usar includes() para evitar falsos positivos como "Amoxicilina" casando com "Amoxicilina + Clavulanato"
        return batchNameNorm === itemBaseNorm || 
               batchNameNorm === itemFullNorm ||
               batchGenericNorm === itemBaseNorm ||
               batchGenericNorm === itemFullNorm;
      }
      
      return false;
    }).sort((a, b) => {
      // Ordenar por validade (FEFO - First Expired, First Out)
      // Lotes sem data de validade vão para o final
      if (!a.expirationDate && !b.expirationDate) return 0;
      if (!a.expirationDate) return 1; // a vai para o final
      if (!b.expirationDate) return -1; // b vai para o final
      
      const dateA = new Date(a.expirationDate).getTime();
      const dateB = new Date(b.expirationDate).getTime();
      
      // Se alguma data for inválida, mover para o final
      if (isNaN(dateA) && isNaN(dateB)) return 0;
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;
      
      return dateA - dateB;
    });
  }, [selectedItem, allBatches]);

  // Materiais necessários para o medicamento selecionado
  const requiredMaterialsForItem = useMemo(() => {
    if (!selectedItem || !dispenseQuantity) return [];
    
    // Encontrar o medicamento pelo nome
    const medication = medications.find(m => {
      const medNameNorm = normalizeMedicationName(m.name);
      const itemNameNorm = normalizeMedicationName(selectedItem.medicationName);
      const itemBaseNorm = extractBaseMedicationName(selectedItem.medicationName);
      return medNameNorm === itemNameNorm || medNameNorm === itemBaseNorm;
    });
    
    if (!medication) return [];
    
    // Buscar os requisitos de materiais para este medicamento
    const requirements = medicationMaterialRequirements.filter(r => r.medicationId === medication.id);
    
    // Calcular a quantidade total de cada material necessário
    const qty = parseInt(dispenseQuantity) || 1;
    return requirements.map(req => {
      const material = materials.find(m => m.id === req.materialId);
      return {
        ...req,
        material,
        totalQuantity: (parseInt(req.quantity) || 1) * qty
      };
    });
  }, [selectedItem, dispenseQuantity, medications, medicationMaterialRequirements, materials]);

  // Pré-selecionar automaticamente o lote mais próximo de vencer (FEFO)
  useEffect(() => {
    if (isDispenseDialogOpen && availableBatchesForItem.length > 0 && !dispenseBatchId) {
      // O primeiro lote já é o mais próximo de vencer (ordenação FEFO)
      setDispenseBatchId(availableBatchesForItem[0].id);
    }
  }, [isDispenseDialogOpen, availableBatchesForItem, dispenseBatchId]);

  // Query para lotes de materiais (para dispensação de procedimentos)
  const { data: materialsBatches = [] } = useQuery<any[]>({
    queryKey: ["/api/materials/batches"],
  });

  // Filtrar lotes disponíveis para item de procedimento selecionado
  const availableBatchesForProcedureItem = useMemo(() => {
    if (!selectedProcedureItem) return [];
    
    // Para medicamentos, usar lotes do inventário de medicamentos
    if (selectedProcedureItem.itemType === 'medication' && selectedProcedureItem.medicationId) {
      return allBatches.filter(batch => {
        if (parseInt(batch.quantity || "0") <= 0) return false;
        return batch.medicationId === selectedProcedureItem.medicationId;
      }).sort((a, b) => {
        if (!a.expirationDate && !b.expirationDate) return 0;
        if (!a.expirationDate) return 1;
        if (!b.expirationDate) return -1;
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      });
    }
    
    // Para materiais, usar lotes do almoxarifado
    if (selectedProcedureItem.itemType === 'material' && selectedProcedureItem.materialId) {
      return materialsBatches.filter((batch: any) => {
        if (parseInt(batch.currentQuantity || "0") <= 0) return false;
        return batch.materialId === selectedProcedureItem.materialId;
      }).sort((a: any, b: any) => {
        if (!a.expirationDate && !b.expirationDate) return 0;
        if (!a.expirationDate) return 1;
        if (!b.expirationDate) return -1;
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      });
    }
    
    return [];
  }, [selectedProcedureItem, allBatches, materialsBatches]);

  // Pré-selecionar lote para procedimentos
  useEffect(() => {
    if (isProcedureDispenseDialogOpen && availableBatchesForProcedureItem.length > 0 && !procedureDispenseBatchId) {
      setProcedureDispenseBatchId(availableBatchesForProcedureItem[0].id);
    }
  }, [isProcedureDispenseDialogOpen, availableBatchesForProcedureItem, procedureDispenseBatchId]);

  // Mutation para dispensar item de procedimento com seleção de lote e quantidade
  const dispenseProcedureItemMutation = useMutation({
    mutationFn: async (data: { itemId: string; batchId?: string; quantity?: string }) => {
      return apiRequest(`/api/procedure-request-items/${data.itemId}/complete`, {
        method: "POST",
        body: { batchId: data.batchId, quantity: data.quantity },
      });
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Item dispensado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/dispensing/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procedure-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procedure-requests/completed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/materials/batches"] });
      setIsProcedureDispenseDialogOpen(false);
      setSelectedProcedureItem(null);
      setProcedureDispenseBatchId("");
      setProcedureDispenseQuantity("");
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Função para abrir o diálogo de dispensação de procedimento
  const openProcedureDispenseDialog = (item: any) => {
    setSelectedProcedureItem(item);
    setProcedureDispenseQuantity(item.quantity || "1");
    setProcedureDispenseBatchId("");
    setIsProcedureDispenseDialogOpen(true);
  };

  const dispenseMutation = useMutation({
    mutationFn: async (data: { prescriptionItemId: string; batchId: string; quantity: string }) => {
      return apiRequest("/api/pharmacy/dispense", { method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/alerts"] });
      setIsDispenseDialogOpen(false);
      setSelectedPrescription(null);
      setDispenseBatchId("");
      setDispenseQuantity("");
      setSelectedItemId("");
      setSelectedItem(null);
      toast({ title: "Sucesso", description: "Medicamento dispensado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const completePrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      return apiRequest(`/api/pharmacy/prescriptions/${prescriptionId}`, { 
        method: "PATCH", 
        body: { status: "completed" }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions/pending"] });
      toast({ title: "Sucesso", description: "Prescrição marcada como concluída!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const getPatientName = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.name || "Paciente não encontrado";
  };

  const createMedicationMutation = useMutation({
    mutationFn: async (data: typeof newMedication) => {
      return apiRequest("/api/medications", { method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      setIsAddMedicationOpen(false);
      setNewMedication({
        name: "",
        genericName: "",
        code: "",
        form: "",
        concentration: "",
        manufacturer: "",
        minStock: "10",
        maxStock: "100",
        tarjaClassificacao: ""
      });
      toast({ title: "Sucesso", description: "Medicamento cadastrado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const updateMedicationMutation = useMutation({
    mutationFn: async (data: { id: string; tarjaClassificacao: string }) => {
      return apiRequest(`/api/medications/${data.id}`, { method: "PATCH", body: { tarjaClassificacao: data.tarjaClassificacao } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches"] });
      setIsEditMedicationOpen(false);
      setEditingMedication(null);
      toast({ title: "Sucesso", description: "Medicamento atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: typeof newBatch) => {
      return apiRequest("/api/inventory/batches", { method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      setIsAddBatchOpen(false);
      setNewBatch({
        medicationId: "",
        batchNumber: "",
        quantity: "",
        expirationDate: "",
        storageLocation: "",
        supplier: "",
        notes: ""
      });
      toast({ title: "Sucesso", description: "Lote cadastrado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const createMovementMutation = useMutation({
    mutationFn: async (data: typeof newMovement) => {
      return apiRequest("/api/inventory/movements", { method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      setIsMovementOpen(false);
      setSelectedBatch(null);
      setNewMovement({
        batchId: "",
        quantity: "",
        movementType: "entrada",
        reason: ""
      });
      toast({ title: "Sucesso", description: "Movimentação registrada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      return apiRequest(`/api/inventory/batches/${batchId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches/expiring"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      setIsDeleteBatchDialogOpen(false);
      setBatchToDelete(null);
      toast({ title: "Sucesso", description: "Lote excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const handleDeleteBatch = (batch: MedicationWithBatch) => {
    setBatchToDelete(batch);
    setIsDeleteBatchDialogOpen(true);
  };

  const confirmDeleteBatch = () => {
    if (batchToDelete) {
      deleteBatchMutation.mutate(batchToDelete.id);
    }
  };

  const filteredBatches = allBatches.filter(batch => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      batch.medication?.name?.toLowerCase().includes(term) ||
      batch.batchNumber?.toLowerCase().includes(term) ||
      batch.medication?.code?.toLowerCase().includes(term)
    );
  });

  // Tipo para medicamento agregado
  type AggregatedMedication = {
    medicationId: string;
    medicationName: string;
    genericName: string;
    code: string;
    form: string;
    concentration: string;
    totalQuantity: number;
    batchCount: number;
    nearestExpiration: string | null;
    minStock: number;
    batches: MedicationWithBatch[];
    status: 'ok' | 'low_stock' | 'expiring' | 'out_of_stock';
    tarjaClassificacao?: string | null;
  };

  // Agregar lotes por medicamento
  const aggregatedMedications = useMemo(() => {
    const grouped = new Map<string, AggregatedMedication>();
    
    allBatches.forEach(batch => {
      // Usar medicationId como chave, ou nome normalizado se não houver
      const key = batch.medicationId || 
        (batch.medication?.name ? extractBaseMedicationName(batch.medication.name) : 'unknown');
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          medicationId: batch.medicationId || key,
          medicationName: batch.medication?.name || 'Medicamento Desconhecido',
          genericName: batch.medication?.genericName || '',
          code: batch.medication?.code || '',
          form: batch.medication?.form || '',
          concentration: batch.medication?.concentration || '',
          totalQuantity: 0,
          batchCount: 0,
          nearestExpiration: null,
          minStock: parseInt(batch.medication?.minStock || '10'),
          batches: [],
          status: 'ok',
          tarjaClassificacao: batch.medication?.tarjaClassificacao || null
        });
      }
      
      const agg = grouped.get(key)!;
      const batchQty = parseInt(batch.quantity || '0');
      
      agg.totalQuantity += batchQty;
      agg.batchCount += 1;
      agg.batches.push(batch);
      
      // Atualizar validade mais próxima
      if (batch.expirationDate) {
        if (!agg.nearestExpiration || 
            new Date(batch.expirationDate) < new Date(agg.nearestExpiration)) {
          agg.nearestExpiration = batch.expirationDate;
        }
      }
    });
    
    // Determinar status de cada medicamento agregado
    grouped.forEach((agg, key) => {
      if (agg.totalQuantity === 0) {
        agg.status = 'out_of_stock';
      } else if (agg.totalQuantity <= agg.minStock) {
        agg.status = 'low_stock';
      } else if (agg.nearestExpiration) {
        const daysToExpire = differenceInDays(parseISO(agg.nearestExpiration), new Date());
        if (daysToExpire <= 30) {
          agg.status = 'expiring';
        }
      }
      
      // Ordenar lotes por validade (FEFO)
      agg.batches.sort((a, b) => {
        if (!a.expirationDate && !b.expirationDate) return 0;
        if (!a.expirationDate) return 1;
        if (!b.expirationDate) return -1;
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      });
    });
    
    return Array.from(grouped.values()).sort((a, b) => 
      a.medicationName.localeCompare(b.medicationName)
    );
  }, [allBatches]);

  // Filtrar medicamentos agregados pela pesquisa
  const filteredAggregatedMedications = useMemo(() => {
    if (!searchTerm) return aggregatedMedications;
    const term = searchTerm.toLowerCase();
    return aggregatedMedications.filter(med =>
      med.medicationName.toLowerCase().includes(term) ||
      med.genericName.toLowerCase().includes(term) ||
      med.code.toLowerCase().includes(term)
    );
  }, [aggregatedMedications, searchTerm]);

  const getStatusBadge = (batch: MedicationWithBatch) => {
    const qty = parseInt(batch.quantity || "0");
    const minStock = parseInt(batch.medication?.minStock || "10");
    
    if (qty === 0) {
      return <Badge variant="destructive" data-testid="badge-status-esgotado">Esgotado</Badge>;
    }
    if (batch.status === "low_stock" || qty <= minStock) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600" data-testid="badge-status-baixo">Estoque Baixo</Badge>;
    }
    if (batch.expirationDate) {
      const daysToExpire = differenceInDays(parseISO(batch.expirationDate), new Date());
      if (daysToExpire <= 30) {
        return <Badge variant="outline" className="border-orange-500 text-orange-600" data-testid="badge-status-vencendo">Vencendo</Badge>;
      }
    }
    return <Badge className="bg-emerald-500" data-testid="badge-status-ok">OK</Badge>;
  };

  const openMovementDialog = (batch: MedicationWithBatch) => {
    setSelectedBatch(batch);
    setNewMovement({
      batchId: batch.id,
      quantity: "",
      movementType: "entrada",
      reason: ""
    });
    setIsMovementOpen(true);
  };

  const importMedicationsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/pharmacy/import-medications", { method: "POST" });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/alerts"] });
      toast({ 
        title: "Importação Concluída", 
        description: data?.message || `Medicamentos importados com sucesso!`
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmitMedication = (e: React.FormEvent) => {
    e.preventDefault();
    createMedicationMutation.mutate(newMedication);
  };

  const handleSubmitBatch = (e: React.FormEvent) => {
    e.preventDefault();
    createBatchMutation.mutate(newBatch);
  };

  const handleSubmitMovement = (e: React.FormEvent) => {
    e.preventDefault();
    createMovementMutation.mutate(newMovement);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
      window.location.href = "/auth";
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Estoque de Medicamentos</h1>
          <p className="text-muted-foreground">Gerencie o inventário da farmácia</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
          <Dialog open={isAddMedicationOpen} onOpenChange={setIsAddMedicationOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-medication">
                <Pill className="mr-2 h-4 w-4" />
                Novo Medicamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Medicamento</DialogTitle>
                <DialogDescription>Adicione um novo medicamento ao catálogo.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitMedication} className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Comercial *</Label>
                  <Input 
                    id="name" 
                    value={newMedication.name} 
                    onChange={(e) => setNewMedication({...newMedication, name: e.target.value})} 
                    required
                    data-testid="input-medication-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genericName">Nome Genérico</Label>
                  <Input 
                    id="genericName" 
                    value={newMedication.genericName} 
                    onChange={(e) => setNewMedication({...newMedication, genericName: e.target.value})}
                    data-testid="input-medication-generic" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Código</Label>
                  <Input 
                    id="code" 
                    value={newMedication.code} 
                    onChange={(e) => setNewMedication({...newMedication, code: e.target.value})}
                    data-testid="input-medication-code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form">Forma Farmacêutica</Label>
                  <Select value={newMedication.form} onValueChange={(v) => setNewMedication({...newMedication, form: v})}>
                    <SelectTrigger data-testid="select-medication-form">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comprimido">Comprimido</SelectItem>
                      <SelectItem value="capsula">Cápsula</SelectItem>
                      <SelectItem value="injecao">Injeção</SelectItem>
                      <SelectItem value="pomada">Pomada</SelectItem>
                      <SelectItem value="xarope">Xarope</SelectItem>
                      <SelectItem value="gotas">Gotas</SelectItem>
                      <SelectItem value="suspensao">Suspensão</SelectItem>
                      <SelectItem value="solucao">Solução</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="concentration">Concentração</Label>
                  <Input 
                    id="concentration" 
                    value={newMedication.concentration} 
                    onChange={(e) => setNewMedication({...newMedication, concentration: e.target.value})}
                    placeholder="Ex: 500mg"
                    data-testid="input-medication-concentration"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Fabricante</Label>
                  <Input 
                    id="manufacturer" 
                    value={newMedication.manufacturer} 
                    onChange={(e) => setNewMedication({...newMedication, manufacturer: e.target.value})}
                    data-testid="input-medication-manufacturer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock">Estoque Mínimo</Label>
                  <Input 
                    id="minStock" 
                    type="number"
                    value={newMedication.minStock} 
                    onChange={(e) => setNewMedication({...newMedication, minStock: e.target.value})}
                    data-testid="input-medication-minstock"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxStock">Estoque Máximo</Label>
                  <Input 
                    id="maxStock" 
                    type="number"
                    value={newMedication.maxStock} 
                    onChange={(e) => setNewMedication({...newMedication, maxStock: e.target.value})}
                    data-testid="input-medication-maxstock"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="tarjaClassificacao">Classificação por Tarja</Label>
                  <Select value={newMedication.tarjaClassificacao || "none"} onValueChange={(v) => setNewMedication({...newMedication, tarjaClassificacao: v === "none" ? "" : v})}>
                    <SelectTrigger data-testid="select-medication-tarja">
                      <SelectValue placeholder="Selecione a tarja (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem classificação</SelectItem>
                      {TARJA_CLASSIFICACAO.map(tarja => (
                        <SelectItem key={tarja} value={tarja}>
                          <span className="flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: getTarjaColor(tarja) }}
                            />
                            {tarja}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="col-span-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" data-testid="button-cancel-medication">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" disabled={createMedicationMutation.isPending} data-testid="button-save-medication">
                    {createMedicationMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditMedicationOpen} onOpenChange={(open) => {
            setIsEditMedicationOpen(open);
            if (!open) setEditingMedication(null);
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Classificação de Medicamento</DialogTitle>
                <DialogDescription>Selecione a classificação por tarja para este medicamento.</DialogDescription>
              </DialogHeader>
              {editingMedication && (
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">{editingMedication.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {editingMedication.concentration} {editingMedication.form}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Classificação por Tarja</Label>
                    <Select 
                      value={editingMedication.tarjaClassificacao || "none"} 
                      onValueChange={(v) => setEditingMedication({...editingMedication, tarjaClassificacao: v === "none" ? null : v})}
                    >
                      <SelectTrigger data-testid="select-edit-medication-tarja">
                        <SelectValue placeholder="Selecione a tarja" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem classificação</SelectItem>
                        {TARJA_CLASSIFICACAO.map(tarja => (
                          <SelectItem key={tarja} value={tarja}>
                            <span className="flex items-center gap-2">
                              <span 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: getTarjaColor(tarja) }}
                              />
                              {tarja}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button 
                      onClick={() => {
                        if (editingMedication) {
                          const tarjaValue = editingMedication.tarjaClassificacao === "none" ? "" : (editingMedication.tarjaClassificacao || "");
                          updateMedicationMutation.mutate({
                            id: editingMedication.id,
                            tarjaClassificacao: tarjaValue
                          });
                        }
                      }}
                      disabled={updateMedicationMutation.isPending}
                      data-testid="button-save-tarja"
                    >
                      {updateMedicationMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isAddBatchOpen} onOpenChange={setIsAddBatchOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-batch">
                <Plus className="mr-2 h-4 w-4" />
                Novo Lote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Lote</DialogTitle>
                <DialogDescription>Registre a entrada de um novo lote de medicamento.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitBatch} className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="medicationId">Medicamento *</Label>
                  <Select value={newBatch.medicationId} onValueChange={(v) => setNewBatch({...newBatch, medicationId: v})}>
                    <SelectTrigger data-testid="select-batch-medication">
                      <SelectValue placeholder="Selecione o medicamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {medications.map(med => (
                        <SelectItem key={med.id} value={med.id}>
                          {med.name} {med.concentration && `- ${med.concentration}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Número do Lote *</Label>
                  <Input 
                    id="batchNumber" 
                    value={newBatch.batchNumber} 
                    onChange={(e) => setNewBatch({...newBatch, batchNumber: e.target.value})}
                    required
                    data-testid="input-batch-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input 
                    id="quantity" 
                    type="number"
                    value={newBatch.quantity} 
                    onChange={(e) => setNewBatch({...newBatch, quantity: e.target.value})}
                    required
                    data-testid="input-batch-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expirationDate">Data de Validade *</Label>
                  <Input 
                    id="expirationDate" 
                    type="date"
                    value={newBatch.expirationDate} 
                    onChange={(e) => setNewBatch({...newBatch, expirationDate: e.target.value})}
                    required
                    data-testid="input-batch-expiration"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storageLocation">Local de Armazenamento</Label>
                  <Input 
                    id="storageLocation" 
                    value={newBatch.storageLocation} 
                    onChange={(e) => setNewBatch({...newBatch, storageLocation: e.target.value})}
                    placeholder="Ex: Prateleira A1"
                    data-testid="input-batch-location"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Input 
                    id="supplier" 
                    value={newBatch.supplier} 
                    onChange={(e) => setNewBatch({...newBatch, supplier: e.target.value})}
                    data-testid="input-batch-supplier"
                  />
                </div>
                <DialogFooter className="col-span-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" data-testid="button-cancel-batch">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" disabled={createBatchMutation.isPending} data-testid="button-save-batch">
                    {createBatchMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Lotes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-batches">{allBatches.length}</div>
            <p className="text-xs text-muted-foreground">lotes cadastrados</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medicamentos</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-medications">{medications.length}</div>
            <p className="text-xs text-muted-foreground">no catálogo</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${alerts?.lowStock ? "border-amber-500" : ""}`}
          onClick={() => navigate("/farmacia/estoque-baixo")}
          data-testid="card-low-stock"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${alerts?.lowStock ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="text-low-stock">{alerts?.lowStock || 0}</div>
            <p className="text-xs text-muted-foreground">itens abaixo do mínimo</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${alerts?.expiring ? "border-orange-500" : ""}`}
          onClick={() => navigate("/farmacia/vencendo")}
          data-testid="card-expiring"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos do Vencimento</CardTitle>
            <Calendar className={`h-4 w-4 ${alerts?.expiring ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-expiring">{alerts?.expiring || 0}</div>
            <p className="text-xs text-muted-foreground">vencem em 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar medicamento ou lote..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-inventory"
          />
        </div>
        <Button variant="outline" onClick={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
          queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches"] });
          queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches/low-stock"] });
          queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches/expiring"] });
          queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
          queryClient.invalidateQueries({ queryKey: ["/api/inventory/alerts"] });
          queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions/pending"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dispensing/queue"] });
          queryClient.invalidateQueries({ queryKey: ["/api/procedure-requests/pending"] });
          queryClient.invalidateQueries({ queryKey: ["/api/procedure-requests/completed"] });
        }} data-testid="button-refresh-inventory">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all" data-testid="tab-all">
            Todos ({filteredBatches.length})
          </TabsTrigger>
          <TabsTrigger value="by-medication" data-testid="tab-by-medication">
            <Pill className="h-4 w-4 mr-1 text-emerald-500" />
            Por Medicamento ({filteredAggregatedMedications.length})
          </TabsTrigger>
          <TabsTrigger value="dispensing" data-testid="tab-dispensing">
            <ClipboardList className="h-4 w-4 mr-1 text-rose-500" />
            Dispensação ({unifiedQueue.length})
          </TabsTrigger>
          <TabsTrigger value="movements" data-testid="tab-movements">
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Movimentações
          </TabsTrigger>
          <TabsTrigger value="materials" data-testid="tab-materials">
            <Package className="h-4 w-4 mr-1 text-blue-500" />
            Materiais
          </TabsTrigger>
          <TabsTrigger value="kits" data-testid="tab-kits">
            <Package className="h-4 w-4 mr-1 text-purple-500" />
            Kits
          </TabsTrigger>
          <TabsTrigger value="med-materials" data-testid="tab-med-materials">
            <Link2 className="h-4 w-4 mr-1 text-teal-500" />
            Materiais por Medicamento
          </TabsTrigger>
          <TabsTrigger value="prescription-list" data-testid="tab-prescription-list">
            <ClipboardList className="h-4 w-4 mr-1 text-blue-500" />
            Lista de Prescrições
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <BatchesTable 
            batches={filteredBatches} 
            loading={loadingBatches}
            getStatusBadge={getStatusBadge}
            onMovement={openMovementDialog}
            onDelete={handleDeleteBatch}
          />
        </TabsContent>

        <TabsContent value="by-medication" className="mt-4">
          <AggregatedMedicationTable 
            medications={filteredAggregatedMedications}
            loading={loadingBatches}
            getStatusBadge={getStatusBadge}
            onMovement={openMovementDialog}
            onDelete={handleDeleteBatch}
            onEditTarja={(medicationId) => {
              const med = medications.find(m => m.id === medicationId);
              if (med) {
                setEditingMedication(med);
                setIsEditMedicationOpen(true);
              }
            }}
          />
        </TabsContent>

        <TabsContent value="dispensing" className="mt-4">
          <UnifiedDispensingQueue 
            queue={unifiedQueue}
            loading={loadingUnifiedQueue}
            showActions={true}
            typeFilter={dispensingTypeFilter}
            onTypeFilterChange={setDispensingTypeFilter}
            batches={allBatches}
            onDispensePrescriptionItem={(item, prescriptionId, patientName) => {
              // Find the full prescription to set selected prescription
              const prescription = pendingPrescriptions.find(p => p.id === prescriptionId);
              if (prescription) {
                setSelectedPrescription(prescription);
                setSelectedItemId(item.id);
                setSelectedItem(item);
                setDispenseBatchId("");
                setDispenseQuantity("");
                setIsDispenseDialogOpen(true);
              }
            }}
            onDispenseProcedureItem={openProcedureDispenseDialog}
          />
        </TabsContent>


        <TabsContent value="movements" className="mt-4">
          <MovementsTable movements={movements} />
        </TabsContent>

        <TabsContent value="materials" className="mt-4">
          <MaterialsTab />
        </TabsContent>

        <TabsContent value="kits" className="mt-4">
          <KitsTab />
        </TabsContent>
        
        <TabsContent value="med-materials" className="mt-4">
          <MedicationMaterialsTab />
        </TabsContent>

        <TabsContent value="prescription-list" className="mt-4">
          <PrescriptionListTab />
        </TabsContent>

      </Tabs>

      {/* Movement Dialog */}
      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Movimentação</DialogTitle>
            <DialogDescription>
              {selectedBatch && (
                <>
                  <strong>{selectedBatch.medication?.name}</strong> - Lote: {selectedBatch.batchNumber}
                  <br />
                  Quantidade atual: {selectedBatch.quantity} unidades
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitMovement} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="movementType">Tipo de Movimentação</Label>
              <Select value={newMovement.movementType} onValueChange={(v) => setNewMovement({...newMovement, movementType: v})}>
                <SelectTrigger data-testid="select-movement-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                  <SelectItem value="perda">Perda / Descarte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="movementQty">Quantidade</Label>
              <Input 
                id="movementQty" 
                type="number"
                min="1"
                value={newMovement.quantity} 
                onChange={(e) => setNewMovement({...newMovement, quantity: e.target.value})}
                required
                data-testid="input-movement-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <Input 
                id="reason" 
                value={newMovement.reason} 
                onChange={(e) => setNewMovement({...newMovement, reason: e.target.value})}
                placeholder="Descreva o motivo da movimentação"
                data-testid="input-movement-reason"
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" data-testid="button-cancel-movement">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={createMovementMutation.isPending} data-testid="button-save-movement">
                {createMovementMutation.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dispense Dialog */}
      <Dialog open={isDispenseDialogOpen} onOpenChange={setIsDispenseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dispensar Medicamento</DialogTitle>
            <DialogDescription>
              {selectedPrescription && (
                <>
                  <strong>Paciente:</strong> {selectedPrescription.patient?.name || getPatientName(selectedPrescription.patientId)}
                  <br />
                  <strong>Médico:</strong> {selectedPrescription.doctorName}
                  <br />
                  <strong>Data:</strong> {selectedPrescription.prescriptionDate && format(parseISO(selectedPrescription.prescriptionDate), "dd/MM/yyyy", { locale: ptBR })}
                  {selectedPrescription.sourceName && (
                    <>
                      <br />
                      <strong>Origem:</strong> <span className="text-blue-600">{selectedPrescription.sourceName}</span>
                    </>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Informações do medicamento prescrito */}
            {selectedItem && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">{selectedItem.medicationName}</span>
                  {selectedItem.kitName && (
                    <Badge variant="outline" className="border-purple-500 text-purple-600 ml-2">
                      Kit: {selectedItem.kitName}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-emerald-700 space-y-1">
                  <p><strong>Dosagem:</strong> {selectedItem.dosage} - {selectedItem.frequency}</p>
                  <p><strong>Qtd. Prescrita:</strong> {selectedItem.quantityPrescribed} | <strong>Já dispensado:</strong> {selectedItem.quantityDispensed || "0"}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Selecionar Lote</Label>
              {availableBatchesForItem.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  Nenhum lote disponível para este medicamento
                </div>
              ) : (
                <Select value={dispenseBatchId} onValueChange={setDispenseBatchId}>
                  <SelectTrigger data-testid="select-dispense-batch">
                    <SelectValue placeholder="Escolha o lote" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBatchesForItem.map(batch => {
                      const daysToExpire = batch.expirationDate 
                        ? differenceInDays(parseISO(batch.expirationDate), new Date())
                        : null;
                      const isExpiringSoon = daysToExpire !== null && daysToExpire <= 30;
                      
                      return (
                        <SelectItem key={batch.id} value={batch.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              Lote: {batch.batchNumber} - {batch.quantity} unid.
                            </span>
                            <span className={`text-xs ${isExpiringSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              Validade: {batch.expirationDate ? format(parseISO(batch.expirationDate), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}
                              {isExpiringSoon && ` (${daysToExpire} dias)`}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Quantidade a Dispensar</Label>
              <Input 
                type="number"
                min="1"
                max={dispenseBatchId ? parseInt(availableBatchesForItem.find(b => b.id === dispenseBatchId)?.quantity || "9999") : undefined}
                value={dispenseQuantity}
                onChange={(e) => setDispenseQuantity(e.target.value)}
                placeholder="Digite a quantidade"
                data-testid="input-dispense-quantity"
              />
              {dispenseBatchId && (
                <p className="text-xs text-muted-foreground">
                  Máximo disponível: {availableBatchesForItem.find(b => b.id === dispenseBatchId)?.quantity || "—"} unidades
                </p>
              )}
            </div>
            
            {/* Materiais necessários para dispensação - oculto para internação, observação e sala vermelha */}
            {requiredMaterialsForItem.length > 0 && 
             !['hospitalization', 'observation', 'red_room'].includes(selectedPrescription?.sourceType || '') && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="h-4 w-4 text-teal-600" />
                  <span className="font-semibold text-teal-800 text-sm">Materiais Necessários</span>
                </div>
                <div className="space-y-1">
                  {requiredMaterialsForItem.map((req, index) => (
                    <div key={req.id || index} className="flex items-center justify-between text-sm">
                      <span className="text-teal-700">{req.material?.name || "Material não encontrado"}</span>
                      <Badge variant="outline" className="bg-white text-teal-700 border-teal-300">
                        {req.totalQuantity} unid.
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-teal-600 mt-2">
                  Estes materiais serão deduzidos automaticamente do estoque.
                </p>
              </div>
            )}
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" data-testid="button-cancel-dispense">Cancelar</Button>
              </DialogClose>
              <Button 
                onClick={() => {
                  if (selectedItemId && dispenseBatchId && dispenseQuantity) {
                    dispenseMutation.mutate({
                      prescriptionItemId: selectedItemId,
                      batchId: dispenseBatchId,
                      quantity: dispenseQuantity
                    });
                  }
                }}
                disabled={!dispenseBatchId || !dispenseQuantity || dispenseMutation.isPending || availableBatchesForItem.length === 0}
                data-testid="button-confirm-dispense"
              >
                {dispenseMutation.isPending ? "Dispensando..." : "Confirmar Dispensação"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Procedure Item Dispense Dialog */}
      <Dialog open={isProcedureDispenseDialogOpen} onOpenChange={setIsProcedureDispenseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dispensar Item de Procedimento</DialogTitle>
            <DialogDescription>
              {selectedProcedureItem && (
                <>
                  <strong>Item:</strong> {selectedProcedureItem.itemName}
                  <br />
                  <strong>Tipo:</strong> {selectedProcedureItem.itemType === 'medication' ? '💊 Medicamento' : '📦 Material'}
                  <br />
                  <strong>Quantidade Solicitada:</strong> {selectedProcedureItem.quantity || 1}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Selecionar Lote</Label>
              {availableBatchesForProcedureItem.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  Nenhum lote disponível para este item
                </div>
              ) : (
                <Select value={procedureDispenseBatchId} onValueChange={setProcedureDispenseBatchId}>
                  <SelectTrigger data-testid="select-procedure-dispense-batch">
                    <SelectValue placeholder="Escolha o lote" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBatchesForProcedureItem.map((batch: any) => {
                      const daysToExpire = batch.expirationDate 
                        ? differenceInDays(parseISO(batch.expirationDate), new Date())
                        : null;
                      const isExpiringSoon = daysToExpire !== null && daysToExpire <= 30;
                      const quantity = batch.quantity || batch.currentQuantity || 0;
                      
                      return (
                        <SelectItem key={batch.id} value={batch.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              Lote: {batch.batchNumber} - {quantity} unid.
                            </span>
                            <span className={`text-xs ${isExpiringSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              Validade: {batch.expirationDate ? format(parseISO(batch.expirationDate), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}
                              {isExpiringSoon && ` (${daysToExpire} dias)`}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Quantidade a Dispensar</Label>
              <Input 
                type="number"
                min="1"
                max={procedureDispenseBatchId ? parseInt((availableBatchesForProcedureItem.find((b: any) => b.id === procedureDispenseBatchId) as any)?.quantity || (availableBatchesForProcedureItem.find((b: any) => b.id === procedureDispenseBatchId) as any)?.currentQuantity || "9999") : undefined}
                value={procedureDispenseQuantity}
                onChange={(e) => setProcedureDispenseQuantity(e.target.value)}
                placeholder="Digite a quantidade"
                data-testid="input-procedure-dispense-quantity"
              />
              {procedureDispenseBatchId && (
                <p className="text-xs text-muted-foreground">
                  Máximo disponível: {(availableBatchesForProcedureItem.find((b: any) => b.id === procedureDispenseBatchId) as any)?.quantity || (availableBatchesForProcedureItem.find((b: any) => b.id === procedureDispenseBatchId) as any)?.currentQuantity || "—"} unidades
                </p>
              )}
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" data-testid="button-cancel-procedure-dispense">Cancelar</Button>
              </DialogClose>
              <Button 
                onClick={() => {
                  if (selectedProcedureItem?.id && procedureDispenseQuantity) {
                    dispenseProcedureItemMutation.mutate({
                      itemId: selectedProcedureItem.id,
                      batchId: procedureDispenseBatchId || undefined,
                      quantity: procedureDispenseQuantity
                    });
                  }
                }}
                disabled={!procedureDispenseQuantity || dispenseProcedureItemMutation.isPending}
                data-testid="button-confirm-procedure-dispense"
              >
                {dispenseProcedureItemMutation.isPending ? "Dispensando..." : "Confirmar Dispensação"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Batch Confirmation Dialog */}
      <Dialog open={isDeleteBatchDialogOpen} onOpenChange={setIsDeleteBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão de Lote</DialogTitle>
            <DialogDescription>
              {batchToDelete && (
                <>
                  Tem certeza que deseja excluir o lote <strong>{batchToDelete.batchNumber}</strong> do medicamento <strong>{batchToDelete.medication?.name}</strong>?
                  <br /><br />
                  <span className="text-amber-600">Quantidade atual: {batchToDelete.quantity} unidades</span>
                  <br />
                  <span className="text-red-600">Esta ação não pode ser desfeita.</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" data-testid="button-cancel-delete-batch">Cancelar</Button>
            </DialogClose>
            <Button 
              variant="destructive"
              onClick={confirmDeleteBatch}
              disabled={deleteBatchMutation.isPending}
              data-testid="button-confirm-delete-batch"
            >
              {deleteBatchMutation.isPending ? "Excluindo..." : "Excluir Lote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BatchesTable({ 
  batches, 
  loading, 
  getStatusBadge, 
  onMovement,
  onDelete,
  showDaysToExpire = false
}: { 
  batches: MedicationWithBatch[];
  loading: boolean;
  getStatusBadge: (batch: MedicationWithBatch) => JSX.Element;
  onMovement: (batch: MedicationWithBatch) => void;
  onDelete: (batch: MedicationWithBatch) => void;
  showDaysToExpire?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum lote encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medicamento</TableHead>
            <TableHead>Lote</TableHead>
            <TableHead className="text-center">Quantidade</TableHead>
            <TableHead>Validade</TableHead>
            {showDaysToExpire && <TableHead>Dias p/ Vencimento</TableHead>}
            <TableHead>Local</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map(batch => {
            const daysToExpire = batch.expirationDate 
              ? differenceInDays(parseISO(batch.expirationDate), new Date())
              : null;
            
            return (
              <TableRow key={batch.id} data-testid={`row-batch-${batch.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {batch.medication?.tarjaClassificacao && (
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getTarjaColor(batch.medication.tarjaClassificacao) }}
                        title={`Tarja ${batch.medication.tarjaClassificacao}`}
                      />
                    )}
                    <div>
                      <p className="font-medium">{batch.medication?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {batch.medication?.concentration} {batch.medication?.form}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono">{batch.batchNumber}</TableCell>
                <TableCell className="text-center font-semibold">{batch.quantity}</TableCell>
                <TableCell>
                  {batch.expirationDate 
                    ? format(parseISO(batch.expirationDate), "dd/MM/yyyy", { locale: ptBR })
                    : "—"
                  }
                </TableCell>
                {showDaysToExpire && (
                  <TableCell>
                    {daysToExpire !== null && (
                      <Badge variant={daysToExpire <= 7 ? "destructive" : daysToExpire <= 30 ? "outline" : "secondary"}>
                        {daysToExpire} dias
                      </Badge>
                    )}
                  </TableCell>
                )}
                <TableCell>{batch.storageLocation || "—"}</TableCell>
                <TableCell>{getStatusBadge(batch)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => onMovement(batch)}
                      data-testid={`button-movement-${batch.id}`}
                      title="Movimentação"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => onDelete(batch)}
                      data-testid={`button-delete-${batch.id}`}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Excluir Lote"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

// Tipo para medicamento agregado (usado no componente)
type AggregatedMedicationType = {
  medicationId: string;
  medicationName: string;
  genericName: string;
  code: string;
  form: string;
  concentration: string;
  totalQuantity: number;
  batchCount: number;
  nearestExpiration: string | null;
  minStock: number;
  batches: MedicationWithBatch[];
  status: 'ok' | 'low_stock' | 'expiring' | 'out_of_stock';
  tarjaClassificacao?: string | null;
};

function AggregatedMedicationTable({ 
  medications,
  loading,
  getStatusBadge,
  onMovement,
  onDelete,
  onEditTarja
}: { 
  medications: AggregatedMedicationType[];
  loading: boolean;
  getStatusBadge: (batch: MedicationWithBatch) => JSX.Element;
  onMovement: (batch: MedicationWithBatch) => void;
  onDelete: (batch: MedicationWithBatch) => void;
  onEditTarja: (medicationId: string) => void;
}) {
  const [expandedMeds, setExpandedMeds] = useState<Set<string>>(new Set());

  const toggleExpanded = (medicationId: string) => {
    setExpandedMeds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(medicationId)) {
        newSet.delete(medicationId);
      } else {
        newSet.add(medicationId);
      }
      return newSet;
    });
  };

  const getAggregatedStatusBadge = (med: AggregatedMedicationType) => {
    switch (med.status) {
      case 'out_of_stock':
        return <Badge variant="destructive">Esgotado</Badge>;
      case 'low_stock':
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Estoque Baixo</Badge>;
      case 'expiring':
        return <Badge variant="outline" className="border-orange-500 text-orange-600">Vencendo</Badge>;
      default:
        return <Badge className="bg-emerald-500">OK</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (medications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Pill className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum medicamento encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Medicamento</TableHead>
            <TableHead className="text-center">Total em Estoque</TableHead>
            <TableHead className="text-center">Lotes</TableHead>
            <TableHead>Próx. Validade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {medications.map(med => {
            const isExpanded = expandedMeds.has(med.medicationId);
            const nearestDays = med.nearestExpiration 
              ? differenceInDays(parseISO(med.nearestExpiration), new Date())
              : null;
            
            return (
              <>
                <TableRow 
                  key={med.medicationId} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpanded(med.medicationId)}
                  data-testid={`row-medication-${med.medicationId}`}
                >
                  <TableCell>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {med.tarjaClassificacao && (
                        <span 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getTarjaColor(med.tarjaClassificacao) }}
                          title={`Tarja ${med.tarjaClassificacao}`}
                        />
                      )}
                      <div>
                        <p className="font-medium">{med.medicationName}</p>
                        <p className="text-xs text-muted-foreground">
                          {med.concentration} {med.form}
                          {med.genericName && ` • ${med.genericName}`}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-2xl font-bold text-emerald-600">{med.totalQuantity}</span>
                    <span className="text-xs text-muted-foreground ml-1">unid.</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{med.batchCount} {med.batchCount === 1 ? 'lote' : 'lotes'}</Badge>
                  </TableCell>
                  <TableCell>
                    {med.nearestExpiration ? (
                      <div>
                        <p>{format(parseISO(med.nearestExpiration), "dd/MM/yyyy", { locale: ptBR })}</p>
                        {nearestDays !== null && nearestDays <= 30 && (
                          <p className="text-xs text-orange-600">{nearestDays} dias</p>
                        )}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{getAggregatedStatusBadge(med)}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTarja(med.medicationId);
                      }}
                      title="Editar Classificação"
                      data-testid={`button-edit-tarja-${med.medicationId}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                
                {/* Linhas expandidas com detalhes dos lotes */}
                {isExpanded && med.batches.map(batch => {
                  const daysToExpire = batch.expirationDate 
                    ? differenceInDays(parseISO(batch.expirationDate), new Date())
                    : null;
                  
                  return (
                    <TableRow 
                      key={batch.id} 
                      className="bg-muted/30"
                      data-testid={`row-batch-detail-${batch.id}`}
                    >
                      <TableCell></TableCell>
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{batch.batchNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{batch.quantity}</TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {batch.storageLocation || "—"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">
                            {batch.expirationDate 
                              ? format(parseISO(batch.expirationDate), "dd/MM/yyyy", { locale: ptBR })
                              : "—"
                            }
                          </p>
                          {daysToExpire !== null && daysToExpire <= 30 && (
                            <Badge variant={daysToExpire <= 7 ? "destructive" : "outline"} className="text-xs">
                              {daysToExpire} dias
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(batch)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={(e) => {
                              e.stopPropagation();
                              onMovement(batch);
                            }}
                            title="Movimentação"
                          >
                            <ArrowUpDown className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(batch);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Excluir Lote"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function MovementsTable({ movements }: { movements: MovementWithDetails[] }) {
  if (movements.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <ArrowUpDown className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
        </CardContent>
      </Card>
    );
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'entrada':
        return <ArrowDownCircle className="h-4 w-4 text-emerald-500" />;
      case 'saida':
      case 'perda':
        return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      case 'lote_excluido':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'entrada': return 'Entrada';
      case 'saida': return 'Saída';
      case 'ajuste': return 'Ajuste';
      case 'perda': return 'Perda';
      case 'lote_excluido': return 'Lote Excluído';
      default: return type;
    }
  };

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/Hora</TableHead>
            <TableHead>Medicamento</TableHead>
            <TableHead>Lote</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-center">Qtd</TableHead>
            <TableHead>Anterior → Novo</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Responsável</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map(mov => (
            <TableRow key={mov.id} data-testid={`row-movement-${mov.id}`}>
              <TableCell className="text-sm">
                {mov.createdAt 
                  ? format(new Date(mov.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })
                  : "—"
                }
              </TableCell>
              <TableCell>{mov.medication?.name || "—"}</TableCell>
              <TableCell className="font-mono">{mov.batch?.batchNumber || "—"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {getMovementIcon(mov.movementType || "")}
                  <span>{getMovementLabel(mov.movementType || "")}</span>
                </div>
              </TableCell>
              <TableCell className="text-center font-semibold">
                <span className={mov.quantity?.startsWith('-') ? "text-red-600" : "text-emerald-600"}>
                  {mov.quantity}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {mov.previousQuantity} → {mov.newQuantity}
              </TableCell>
              <TableCell className="text-sm">
                {mov.patientName || "—"}
              </TableCell>
              <TableCell className="text-sm">{mov.reason || "—"}</TableCell>
              <TableCell className="text-sm">{mov.performedByName || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function PrescriptionsQueue({ 
  prescriptions, 
  loading, 
  getPatientName,
  batches,
  onDispense,
  onComplete
}: { 
  prescriptions: PrescriptionWithDetails[];
  loading: boolean;
  getPatientName: (patientId: string) => string;
  batches: MedicationWithBatch[];
  onDispense: (prescription: PrescriptionWithDetails, itemId: string) => void;
  onComplete: (prescriptionId: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
          <p className="text-muted-foreground">Nenhuma prescrição pendente</p>
          <p className="text-sm text-muted-foreground mt-2">Todas as prescrições foram dispensadas!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {prescriptions.map(prescription => (
        <Card key={prescription.id} className="border-l-4 border-l-rose-500" data-testid={`card-prescription-${prescription.id}`}>
          <CardHeader className="py-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {prescription.patient?.name || getPatientName(prescription.patientId)}
                </CardTitle>
                <CardDescription className="flex items-center gap-4 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" />
                    {prescription.doctorName}
                    {prescription.doctorCrm && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (CRM: {prescription.doctorCrm})
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {prescription.prescriptionDate && format(parseISO(prescription.prescriptionDate), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                {prescription.sourceName && (
                  <Badge variant="outline" className="border-blue-500 text-blue-600">
                    {prescription.sourceName}
                  </Badge>
                )}
                <Badge variant="outline" className="border-rose-500 text-rose-600">
                  Pendente
                </Badge>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                  onClick={() => onComplete(prescription.id)}
                  data-testid={`button-complete-${prescription.id}`}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Concluir
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-2">
            {prescription.items && prescription.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicamento</TableHead>
                    <TableHead>Posologia</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Kit</TableHead>
                    <TableHead>Qtd Prescrita</TableHead>
                    <TableHead>Qtd Dispensada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescription.items.map(item => (
                    <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                      <TableCell className="font-medium">{item.medicationName}</TableCell>
                      <TableCell className="text-sm">
                        {[item.dosage, item.frequency].filter(Boolean).join(" - ")}
                      </TableCell>
                      <TableCell className="text-sm">{item.duration || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {item.kitName ? (
                          <Badge variant="outline" className="border-purple-500 text-purple-600">
                            {item.kitName}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-center">{item.quantityPrescribed || "1"}</TableCell>
                      <TableCell className="text-center">{item.quantityDispensed || "0"}</TableCell>
                      <TableCell>
                        {item.status === "dispensed" ? (
                          <Badge className="bg-emerald-500">Dispensado</Badge>
                        ) : item.status === "partially_dispensed" ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-600">Parcial</Badge>
                        ) : (
                          <Badge variant="outline">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.status !== "dispensed" && (
                          <Button 
                            size="sm" 
                            onClick={() => onDispense(prescription, item.id)}
                            data-testid={`button-dispense-${item.id}`}
                          >
                            <Pill className="h-4 w-4 mr-1" />
                            Dispensar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-2">Nenhum item na prescrição</p>
            )}
            {prescription.notes && (
              <p className="text-sm text-muted-foreground mt-2 p-2 bg-gray-50 rounded">
                <strong>Obs:</strong> {prescription.notes}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ==========================================
// MATERIALS TAB COMPONENT
// ==========================================

type SelectMaterialsCatalog = {
  id: string;
  name: string;
  code?: string | null;
  shortName?: string | null;
  description?: string | null;
  category: string;
  materialGroup?: string | null;
  unit: string;
  minStock: string;
  maxStock?: string | null;
  manufacturer?: string | null;
  storageConditions?: string | null;
  isActive: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

type SelectMaterialsBatch = {
  id: string;
  materialId: string;
  batchNumber: string;
  initialQuantity: string;
  quantity: string;
  expirationDate?: string | null;
  supplier?: string | null;
  storageLocation?: string | null;
  notes?: string | null;
  status: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

type MaterialWithBatch = SelectMaterialsBatch & { material?: SelectMaterialsCatalog };

// Kit categories for organization
const KIT_CATEGORIES = [
  "Procedimentos",
  "Cirúrgico",
  "Emergência",
  "Pediatria",
  "Curativos",
  "Infusão",
  "Geral"
];

// Componente para gerenciar medicamentos associados a um kit
function KitMedicationsSection({ kitId, kitName }: { kitId: string; kitName: string }) {
  const { toast } = useToast();
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [selectedMedicationId, setSelectedMedicationId] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [notes, setNotes] = useState("");

  // Buscar medicamentos do catálogo
  const { data: medications = [] } = useQuery<SelectMedicationsCatalog[]>({
    queryKey: ["/api/medications"],
  });

  // Buscar associações do kit
  const { data: associations = [], isLoading } = useQuery<MedicationKitAssociationWithDetails[]>({
    queryKey: ["/api/medication-kit-associations/kit", kitId],
  });

  // Mutation para adicionar associação
  const addAssociationMutation = useMutation({
    mutationFn: async (data: { medicationId: string; kitId: string; isDefault: boolean; notes?: string }) => {
      return apiRequest("/api/medication-kit-associations", { method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-kit-associations/kit", kitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/medication-kit-associations"] });
      setIsAddMedOpen(false);
      setSelectedMedicationId("");
      setIsDefault(false);
      setNotes("");
      toast({ title: "Sucesso", description: "Medicamento associado ao kit!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  // Mutation para remover associação
  const removeAssociationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/medication-kit-associations/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-kit-associations/kit", kitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/medication-kit-associations"] });
      toast({ title: "Sucesso", description: "Associação removida!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  // Mutation para atualizar padrão
  const updateDefaultMutation = useMutation({
    mutationFn: async ({ id, isDefault }: { id: string; isDefault: boolean }) => {
      return apiRequest(`/api/medication-kit-associations/${id}`, { method: "PATCH", body: { isDefault } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-kit-associations/kit", kitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/medication-kit-associations"] });
    }
  });

  const handleAddMedication = () => {
    if (!selectedMedicationId) {
      toast({ title: "Erro", description: "Selecione um medicamento", variant: "destructive" });
      return;
    }
    addAssociationMutation.mutate({ medicationId: selectedMedicationId, kitId, isDefault, notes });
  };

  // Medicamentos já associados (para filtrar no dropdown)
  const associatedMedIds = new Set(associations.map(a => a.medicationId));
  const availableMedications = medications.filter(m => !associatedMedIds.has(m.id));

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Pill className="h-4 w-4 text-purple-500" />
          Medicamentos que usam este Kit
        </h4>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsAddMedOpen(true)}
          data-testid={`button-add-med-to-kit-${kitId}`}
        >
          <Plus className="h-4 w-4 mr-1" />
          Associar Medicamento
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : associations.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded">
          Nenhum medicamento associado a este kit. Associe medicamentos para que este kit apareça como opção na prescrição.
        </p>
      ) : (
        <div className="space-y-2">
          {associations.map(assoc => (
            <div 
              key={assoc.id} 
              className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-200"
            >
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-sm">{assoc.medication?.name || "Medicamento não encontrado"}</span>
                {assoc.isDefault && (
                  <Badge className="bg-purple-600 text-white text-xs">Padrão</Badge>
                )}
                {assoc.notes && (
                  <span className="text-xs text-muted-foreground">({assoc.notes})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!assoc.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateDefaultMutation.mutate({ id: assoc.id, isDefault: true })}
                    title="Definir como padrão"
                  >
                    <Star className="h-4 w-4 text-gray-400" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAssociationMutation.mutate(assoc.id)}
                  data-testid={`button-remove-med-assoc-${assoc.id}`}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog para adicionar medicamento */}
      <Dialog open={isAddMedOpen} onOpenChange={setIsAddMedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associar Medicamento ao Kit</DialogTitle>
            <DialogDescription>
              Escolha um medicamento para associar ao kit "{kitName}". Quando este medicamento for prescrito, 
              o médico poderá escolher este kit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Medicamento</Label>
              <Select value={selectedMedicationId} onValueChange={setSelectedMedicationId}>
                <SelectTrigger data-testid="select-med-for-kit">
                  <SelectValue placeholder="Selecione um medicamento" />
                </SelectTrigger>
                <SelectContent>
                  {availableMedications.map(med => (
                    <SelectItem key={med.id} value={med.id}>
                      {med.name} {med.concentration && `- ${med.concentration}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="isDefault" 
                checked={isDefault} 
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isDefault" className="text-sm">Kit padrão para este medicamento</Label>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Input 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Usar para aplicação EV"
                data-testid="input-med-kit-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button 
              onClick={handleAddMedication}
              disabled={addAssociationMutation.isPending || !selectedMedicationId}
              data-testid="button-confirm-add-med-to-kit"
            >
              {addAssociationMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Associar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KitsTab() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddKitOpen, setIsAddKitOpen] = useState(false);
  const [isEditKitOpen, setIsEditKitOpen] = useState(false);
  const [isDispenseOpen, setIsDispenseOpen] = useState(false);
  const [selectedKit, setSelectedKit] = useState<PharmacyKitWithItems | null>(null);
  const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set());
  
  const [newKit, setNewKit] = useState({
    name: "",
    description: "",
    category: "Geral",
    items: [] as { materialId: string; quantity: string }[]
  });
  
  const [dispensation, setDispensation] = useState({
    patientName: "",
    notes: "",
    destinationSector: ""
  });
  
  const { data: kits = [], isLoading: loadingKits } = useQuery<PharmacyKitWithItems[]>({
    queryKey: ["/api/pharmacy-kits"],
  });
  
  const { data: materials = [] } = useQuery<SelectMaterialsCatalog[]>({
    queryKey: ["/api/materials"],
  });
  
  const { data: dispensations = [] } = useQuery<PharmacyKitDispensationWithKit[]>({
    queryKey: ["/api/pharmacy-kit-dispensations"],
  });
  
  const toggleExpandedKit = (kitId: string) => {
    setExpandedKits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(kitId)) {
        newSet.delete(kitId);
      } else {
        newSet.add(kitId);
      }
      return newSet;
    });
  };
  
  const addItemToKit = () => {
    setNewKit(prev => ({
      ...prev,
      items: [...prev.items, { materialId: "", quantity: "1" }]
    }));
  };
  
  const removeItemFromKit = (index: number) => {
    setNewKit(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };
  
  const updateKitItem = (index: number, field: "materialId" | "quantity", value: string) => {
    setNewKit(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };
  
  const createKitMutation = useMutation({
    mutationFn: async (data: typeof newKit) => {
      return apiRequest("/api/pharmacy-kits", { method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy-kits"] });
      setIsAddKitOpen(false);
      setNewKit({ name: "", description: "", category: "Geral", items: [] });
      toast({ title: "Sucesso", description: "Kit criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });
  
  const updateKitMutation = useMutation({
    mutationFn: async (data: { id: string; kit: typeof newKit }) => {
      return apiRequest(`/api/pharmacy-kits/${data.id}`, { method: "PATCH", body: data.kit });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy-kits"] });
      setIsEditKitOpen(false);
      setSelectedKit(null);
      setNewKit({ name: "", description: "", category: "Geral", items: [] });
      toast({ title: "Sucesso", description: "Kit atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });
  
  const deleteKitMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/pharmacy-kits/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy-kits"] });
      toast({ title: "Sucesso", description: "Kit excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });
  
  const dispenseKitMutation = useMutation({
    mutationFn: async (data: { id: string; dispensation: typeof dispensation }) => {
      return apiRequest(`/api/pharmacy-kits/${data.id}/dispense`, { method: "POST", body: data.dispensation });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy-kits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy-kit-dispensations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/materials-batches"] });
      setIsDispenseOpen(false);
      setSelectedKit(null);
      setDispensation({ patientName: "", notes: "", destinationSector: "" });
      toast({ title: "Sucesso", description: "Kit dispensado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });
  
  const handleCreateKit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKit.name || newKit.items.length === 0) {
      toast({ title: "Erro", description: "Informe o nome e pelo menos um material", variant: "destructive" });
      return;
    }
    createKitMutation.mutate(newKit);
  };
  
  const handleUpdateKit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKit) return;
    updateKitMutation.mutate({ id: selectedKit.id, kit: newKit });
  };
  
  const handleDispenseKit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKit) return;
    dispenseKitMutation.mutate({ id: selectedKit.id, dispensation });
  };
  
  const openEditDialog = (kit: PharmacyKitWithItems) => {
    setSelectedKit(kit);
    setNewKit({
      name: kit.name,
      description: kit.description || "",
      category: kit.category || "Geral",
      items: kit.items.map(item => ({ materialId: item.materialId, quantity: item.quantity || "1" }))
    });
    setIsEditKitOpen(true);
  };
  
  const openDispenseDialog = (kit: PharmacyKitWithItems) => {
    setSelectedKit(kit);
    setDispensation({ patientName: "", notes: "", destinationSector: "" });
    setIsDispenseOpen(true);
  };
  
  const filteredKits = useMemo(() => {
    return kits.filter(kit => 
      kit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (kit.description?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );
  }, [kits, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar kits..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-kits"
          />
        </div>
        <Button onClick={() => { setNewKit({ name: "", description: "", category: "Geral", items: [] }); setIsAddKitOpen(true); }} data-testid="button-add-kit">
          <Plus className="h-4 w-4 mr-2" />
          Novo Kit
        </Button>
      </div>

      {loadingKits ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filteredKits.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum kit cadastrado</p>
            <p className="text-sm">Crie kits para agrupar materiais frequentemente usados juntos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredKits.map(kit => (
            <Card key={kit.id} className="overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                onClick={() => toggleExpandedKit(kit.id)}
              >
                <div className="flex items-center gap-3">
                  <button className="p-1">
                    {expandedKits.has(kit.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <Package className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-medium">{kit.name}</p>
                    <p className="text-sm text-muted-foreground">{kit.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{kit.category}</Badge>
                  <Badge variant="outline">{kit.totalMaterials} {kit.totalMaterials === 1 ? 'material' : 'materiais'}</Badge>
                  {kit.hasStock ? (
                    <Badge className="bg-green-100 text-green-700">Estoque OK</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700">Sem Estoque</Badge>
                  )}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openEditDialog(kit)}
                      data-testid={`button-edit-kit-${kit.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="default"
                      disabled={!kit.hasStock}
                      onClick={() => openDispenseDialog(kit)}
                      data-testid={`button-dispense-kit-${kit.id}`}
                    >
                      <ArrowDownCircle className="h-4 w-4 mr-1" />
                      Dispensar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => deleteKitMutation.mutate(kit.id)}
                      data-testid={`button-delete-kit-${kit.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {expandedKits.has(kit.id) && (
                <div className="border-t bg-muted/30 p-4 space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Materiais do Kit
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead className="text-center">Quantidade</TableHead>
                          <TableHead className="text-center">Unidade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kit.items.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>{item.material?.name || "Material não encontrado"}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-center">{item.material?.unit || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Medicamentos Associados ao Kit */}
                  <KitMedicationsSection kitId={kit.id} kitName={kit.name} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Histórico de Dispensações */}
      {dispensations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimas Dispensações</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kit</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Dispensado por</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispensations.slice(0, 10).map(disp => (
                  <TableRow key={disp.id}>
                    <TableCell>{disp.kit?.name || "-"}</TableCell>
                    <TableCell>{disp.patientName || "-"}</TableCell>
                    <TableCell>{disp.destinationSector || "-"}</TableCell>
                    <TableCell>{disp.dispensedByName || "-"}</TableCell>
                    <TableCell>{disp.createdAt ? format(new Date(disp.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog Criar Kit */}
      <Dialog open={isAddKitOpen} onOpenChange={setIsAddKitOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Kit de Materiais</DialogTitle>
            <DialogDescription>Crie um kit agrupando materiais frequentemente usados juntos</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateKit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Kit *</Label>
                <Input 
                  value={newKit.name} 
                  onChange={(e) => setNewKit({...newKit, name: e.target.value})}
                  placeholder="Ex: Kit Curativo Grande"
                  required
                  data-testid="input-kit-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={newKit.category} onValueChange={(v) => setNewKit({...newKit, category: v})}>
                  <SelectTrigger data-testid="select-kit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KIT_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input 
                value={newKit.description} 
                onChange={(e) => setNewKit({...newKit, description: e.target.value})}
                placeholder="Descrição opcional do kit"
                data-testid="input-kit-description"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Materiais do Kit *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItemToKit} data-testid="button-add-kit-item">
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Material
                </Button>
              </div>
              {newKit.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Adicione materiais ao kit</p>
              ) : (
                <div className="space-y-2">
                  {newKit.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Select value={item.materialId} onValueChange={(v) => updateKitItem(index, "materialId", v)}>
                        <SelectTrigger className="flex-1" data-testid={`select-kit-material-${index}`}>
                          <SelectValue placeholder="Selecione o material" />
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map(mat => (
                            <SelectItem key={mat.id} value={mat.id}>{mat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input 
                        type="number" 
                        min="1"
                        className="w-24"
                        value={item.quantity}
                        onChange={(e) => updateKitItem(index, "quantity", e.target.value)}
                        placeholder="Qtd"
                        data-testid={`input-kit-item-qty-${index}`}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItemFromKit(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={createKitMutation.isPending} data-testid="button-save-kit">
                {createKitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Kit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Kit */}
      <Dialog open={isEditKitOpen} onOpenChange={setIsEditKitOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Kit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateKit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Kit *</Label>
                <Input 
                  value={newKit.name} 
                  onChange={(e) => setNewKit({...newKit, name: e.target.value})}
                  required
                  data-testid="input-edit-kit-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={newKit.category} onValueChange={(v) => setNewKit({...newKit, category: v})}>
                  <SelectTrigger data-testid="select-edit-kit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KIT_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input 
                value={newKit.description} 
                onChange={(e) => setNewKit({...newKit, description: e.target.value})}
                data-testid="input-edit-kit-description"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Materiais do Kit *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItemToKit}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {newKit.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select value={item.materialId} onValueChange={(v) => updateKitItem(index, "materialId", v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione o material" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map(mat => (
                          <SelectItem key={mat.id} value={mat.id}>{mat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      type="number" 
                      min="1"
                      className="w-24"
                      value={item.quantity}
                      onChange={(e) => updateKitItem(index, "quantity", e.target.value)}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItemFromKit(index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={updateKitMutation.isPending} data-testid="button-update-kit">
                {updateKitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Dispensar Kit */}
      <Dialog open={isDispenseOpen} onOpenChange={setIsDispenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispensar Kit</DialogTitle>
            <DialogDescription>
              {selectedKit && (
                <>
                  <strong>{selectedKit.name}</strong>
                  <br />
                  {selectedKit.totalMaterials} materiais serão deduzidos do estoque
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDispenseKit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Paciente (opcional)</Label>
              <Input 
                value={dispensation.patientName}
                onChange={(e) => setDispensation({...dispensation, patientName: e.target.value})}
                placeholder="Nome do paciente"
                data-testid="input-dispense-patient"
              />
            </div>
            <div className="space-y-2">
              <Label>Setor de Destino</Label>
              <Input 
                value={dispensation.destinationSector}
                onChange={(e) => setDispensation({...dispensation, destinationSector: e.target.value})}
                placeholder="Ex: Sala de Procedimentos"
                data-testid="input-dispense-sector"
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input 
                value={dispensation.notes}
                onChange={(e) => setDispensation({...dispensation, notes: e.target.value})}
                placeholder="Observações opcionais"
                data-testid="input-dispense-notes"
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={dispenseKitMutation.isPending} data-testid="button-confirm-dispense">
                {dispenseKitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Dispensar Kit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Tipo para os requisitos de material por medicamento
type MedicationMaterialRequirement = {
  id: string;
  medicationId: string;
  materialId: string;
  quantity: string;
  notes?: string | null;
  medication?: SelectMedicationsCatalog;
  material?: SelectMaterialsCatalog;
};

function PrescriptionListTab() {
  const { toast } = useToast();

  const { data: prescriptions = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pharmacy/prescription-list"],
    refetchInterval: 30000,
  });

  const releaseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/pharmacy/prescription-list/${id}/release`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescription-list"] });
      toast({ title: "Prescrição liberada", description: "A prescrição foi marcada como liberada." });
    },
    onError: () => {
      toast({ title: "Erro ao liberar", description: "Não foi possível liberar a prescrição.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium">Nenhuma prescrição na lista</p>
        <p className="text-sm">Prescrições enviadas pelos médicos aparecerão aqui.</p>
      </div>
    );
  }

  const pending = prescriptions.filter((p: any) => !p.listReleasedAt);
  const released = prescriptions.filter((p: any) => p.listReleasedAt);

  return (
    <div className="space-y-4 mt-4">
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Aguardando Liberação ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((prescription: any) => (
              <Card key={prescription.id} className="border-amber-200 bg-amber-50">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-amber-700 border-amber-400 bg-amber-100">
                          <Clock className="h-3 w-3 mr-1" />
                          Aguardando
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {prescription.prescriptionDate
                            ? format(parseISO(prescription.prescriptionDate), "dd/MM/yyyy", { locale: ptBR })
                            : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-800">
                        <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {prescription.patientName || "Paciente não identificado"}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Stethoscope className="h-3 w-3 shrink-0" />
                        Dr(a). {prescription.doctorName || "—"}
                        {prescription.sourceName && (
                          <span className="ml-1 text-gray-400">· {prescription.sourceName}</span>
                        )}
                      </div>
                      {prescription.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic truncate">{prescription.notes}</p>
                      )}
                      {prescription.items && prescription.items.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {prescription.items.map((item: any) => (
                            <div key={item.id} className="flex items-start gap-2 text-xs bg-white border border-amber-100 rounded p-1.5">
                              <Pill className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-medium text-gray-800">{item.medicationName}</span>
                                {item.dosage && <span className="text-gray-500 ml-1">— {item.dosage}</span>}
                                {item.frequency && <span className="text-gray-400 ml-1">· {item.frequency}</span>}
                                {item.duration && <span className="text-gray-400 ml-1">· {item.duration}</span>}
                                {item.instructions && <span className="text-gray-400 ml-1">· {item.instructions}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => releaseMutation.mutate(prescription.id)}
                      disabled={releaseMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 shrink-0"
                    >
                      {releaseMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Liberar
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {released.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Liberadas ({released.length})
          </h3>
          <div className="space-y-3">
            {released.map((prescription: any) => (
              <Card key={prescription.id} className="border-green-200 bg-green-50 opacity-80">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-green-700 border-green-400 bg-green-100">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Liberada
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {prescription.prescriptionDate
                            ? format(parseISO(prescription.prescriptionDate), "dd/MM/yyyy", { locale: ptBR })
                            : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-800">
                        <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {prescription.patientName || "Paciente não identificado"}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Stethoscope className="h-3 w-3 shrink-0" />
                        Dr(a). {prescription.doctorName || "—"}
                        {prescription.sourceName && (
                          <span className="ml-1 text-gray-400">· {prescription.sourceName}</span>
                        )}
                      </div>
                      {prescription.items && prescription.items.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {prescription.items.map((item: any) => (
                            <div key={item.id} className="flex items-start gap-2 text-xs bg-white border border-green-100 rounded p-1.5">
                              <Pill className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-medium text-gray-800">{item.medicationName}</span>
                                {item.dosage && <span className="text-gray-500 ml-1">— {item.dosage}</span>}
                                {item.frequency && <span className="text-gray-400 ml-1">· {item.frequency}</span>}
                                {item.duration && <span className="text-gray-400 ml-1">· {item.duration}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {prescription.listReleasedAt && (
                        <p className="text-xs text-green-600 mt-1.5">
                          Liberado por <strong>{prescription.listReleasedBy}</strong> em{" "}
                          {format(new Date(prescription.listReleasedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MedicationMaterialsTab() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<SelectMedicationsCatalog | null>(null);
  const [expandedMedications, setExpandedMedications] = useState<Set<string>>(new Set());
  const [newRequirements, setNewRequirements] = useState<{materialId: string; quantity: string; notes: string}[]>([]);
  
  const { data: medications = [], isLoading: loadingMedications } = useQuery<SelectMedicationsCatalog[]>({
    queryKey: ["/api/medications"],
  });
  
  const { data: materials = [], isLoading: loadingMaterials } = useQuery<SelectMaterialsCatalog[]>({
    queryKey: ["/api/materials"],
  });
  
  const { data: requirements = [], isLoading: loadingRequirements } = useQuery<MedicationMaterialRequirement[]>({
    queryKey: ["/api/medication-material-requirements"],
  });
  
  const toggleExpandedMedication = (medicationId: string) => {
    setExpandedMedications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(medicationId)) {
        newSet.delete(medicationId);
      } else {
        newSet.add(medicationId);
      }
      return newSet;
    });
  };
  
  const addRequirementItem = () => {
    setNewRequirements(prev => [...prev, { materialId: "", quantity: "1", notes: "" }]);
  };
  
  const removeRequirementItem = (index: number) => {
    setNewRequirements(prev => prev.filter((_, i) => i !== index));
  };
  
  const updateRequirementItem = (index: number, field: "materialId" | "quantity" | "notes", value: string) => {
    setNewRequirements(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };
  
  const saveRequirementsMutation = useMutation({
    mutationFn: async (data: { medicationId: string; requirements: typeof newRequirements }) => {
      return apiRequest(`/api/medications/${data.medicationId}/material-requirements`, {
        method: "PUT",
        body: { requirements: data.requirements }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-material-requirements"] });
      setIsAddOpen(false);
      setSelectedMedication(null);
      setNewRequirements([]);
      toast({ title: "Sucesso", description: "Materiais associados com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });
  
  const deleteRequirementMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/medication-material-requirements/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-material-requirements"] });
      toast({ title: "Sucesso", description: "Material removido com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });
  
  const openEditDialog = (medication: SelectMedicationsCatalog) => {
    setSelectedMedication(medication);
    const existingReqs = requirements.filter(r => r.medicationId === medication.id);
    setNewRequirements(existingReqs.map(r => ({
      materialId: r.materialId,
      quantity: r.quantity,
      notes: r.notes || ""
    })));
    setIsAddOpen(true);
  };
  
  const handleSaveRequirements = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedication) return;
    
    const validReqs = newRequirements.filter(r => r.materialId && r.quantity);
    if (validReqs.length === 0) {
      toast({ title: "Atenção", description: "Adicione pelo menos um material", variant: "destructive" });
      return;
    }
    
    saveRequirementsMutation.mutate({
      medicationId: selectedMedication.id,
      requirements: validReqs
    });
  };
  
  // Agrupar requisitos por medicamento
  const groupedRequirements = useMemo(() => {
    const groups = new Map<string, MedicationMaterialRequirement[]>();
    requirements.forEach(req => {
      if (!groups.has(req.medicationId)) {
        groups.set(req.medicationId, []);
      }
      groups.get(req.medicationId)!.push(req);
    });
    return groups;
  }, [requirements]);
  
  // Medicamentos com materiais associados
  const medicationsWithRequirements = useMemo(() => {
    return medications.filter(m => groupedRequirements.has(m.id));
  }, [medications, groupedRequirements]);
  
  // Medicamentos sem materiais associados (para adicionar)
  const medicationsWithoutRequirements = useMemo(() => {
    return medications.filter(m => !groupedRequirements.has(m.id));
  }, [medications, groupedRequirements]);
  
  const filteredMedications = useMemo(() => {
    if (!searchTerm) return medicationsWithRequirements;
    const lower = searchTerm.toLowerCase();
    return medicationsWithRequirements.filter(m => 
      m.name.toLowerCase().includes(lower) ||
      m.genericName?.toLowerCase().includes(lower)
    );
  }, [medicationsWithRequirements, searchTerm]);
  
  if (loadingMedications || loadingMaterials || loadingRequirements) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card className="border-teal-200 bg-teal-50/30">
        <CardHeader>
          <CardTitle className="flex items-center text-teal-800">
            <Link2 className="h-5 w-5 mr-2" />
            Materiais por Medicamento
          </CardTitle>
          <CardDescription>
            Configure quais materiais são necessários para cada medicamento. 
            Esses materiais serão automaticamente incluídos na dispensação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar medicamento..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-med-materials"
              />
            </div>
            <Button onClick={() => {
              setSelectedMedication(null);
              setNewRequirements([]);
              setIsAddOpen(true);
            }} data-testid="button-add-med-materials">
              <Plus className="h-4 w-4 mr-2" />
              Configurar Materiais
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground mb-4">
            <Badge variant="outline" className="mr-2">{medicationsWithRequirements.length}</Badge>
            medicamentos com materiais configurados
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Medicamento</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Materiais</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedications.map(medication => {
                const medReqs = groupedRequirements.get(medication.id) || [];
                const isExpanded = expandedMedications.has(medication.id);
                
                return (
                  <>
                    <TableRow 
                      key={medication.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpandedMedication(medication.id)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{medication.name}</div>
                        {medication.genericName && (
                          <div className="text-xs text-muted-foreground">{medication.genericName}</div>
                        )}
                      </TableCell>
                      <TableCell>{medication.dosageForm}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{medReqs.length} material(is)</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(medication);
                          }}
                          data-testid={`button-edit-med-materials-${medication.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${medication.id}-details`}>
                        <TableCell></TableCell>
                        <TableCell colSpan={4}>
                          <div className="bg-muted/30 rounded-lg p-3">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Material</TableHead>
                                  <TableHead>Quantidade</TableHead>
                                  <TableHead>Observações</TableHead>
                                  <TableHead className="w-16"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {medReqs.map(req => (
                                  <TableRow key={req.id}>
                                    <TableCell>{req.material?.name || req.materialId}</TableCell>
                                    <TableCell>{req.quantity}</TableCell>
                                    <TableCell className="text-muted-foreground">{req.notes || "-"}</TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteRequirementMutation.mutate(req.id)}
                                        disabled={deleteRequirementMutation.isPending}
                                        data-testid={`button-delete-req-${req.id}`}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {filteredMedications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {searchTerm ? "Nenhum medicamento encontrado" : "Nenhum medicamento com materiais configurados"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Dialog para configurar materiais */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedMedication ? `Materiais para ${selectedMedication.name}` : "Configurar Materiais"}
            </DialogTitle>
            <DialogDescription>
              Adicione os materiais necessários para este medicamento. 
              Eles serão incluídos automaticamente na dispensação.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRequirements} className="space-y-4">
            {!selectedMedication && (
              <div className="space-y-2">
                <Label>Selecione o Medicamento</Label>
                <Select 
                  value={selectedMedication?.id || ""} 
                  onValueChange={(id) => {
                    const med = medications.find(m => m.id === id);
                    if (med) {
                      setSelectedMedication(med);
                      const existingReqs = requirements.filter(r => r.medicationId === med.id);
                      setNewRequirements(existingReqs.map(r => ({
                        materialId: r.materialId,
                        quantity: r.quantity,
                        notes: r.notes || ""
                      })));
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-medication">
                    <SelectValue placeholder="Selecione um medicamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medications.map(med => (
                      <SelectItem key={med.id} value={med.id}>
                        {med.name} {med.concentration && `- ${med.concentration}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {selectedMedication && (
              <>
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Materiais Necessários</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addRequirementItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Material
                    </Button>
                  </div>
                  
                  {newRequirements.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Clique em "Adicionar Material" para começar
                    </div>
                  )}
                  
                  {newRequirements.map((req, index) => (
                    <div key={index} className="flex items-end gap-2 p-2 bg-muted/30 rounded">
                      <div className="flex-1">
                        <Label className="text-xs">Material</Label>
                        <Select
                          value={req.materialId}
                          onValueChange={(v) => updateRequirementItem(index, "materialId", v)}
                        >
                          <SelectTrigger data-testid={`select-material-${index}`}>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map(mat => (
                              <SelectItem key={mat.id} value={mat.id}>
                                {mat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">Qtd</Label>
                        <Input
                          type="number"
                          min="1"
                          value={req.quantity}
                          onChange={(e) => updateRequirementItem(index, "quantity", e.target.value)}
                          data-testid={`input-quantity-${index}`}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Observações</Label>
                        <Input
                          value={req.notes}
                          onChange={(e) => updateRequirementItem(index, "notes", e.target.value)}
                          placeholder="Ex: para injeção IM"
                          data-testid={`input-notes-${index}`}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRequirementItem(index)}
                        data-testid={`button-remove-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" disabled={saveRequirementsMutation.isPending} data-testid="button-save-requirements">
                    {saveRequirementsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Salvar Materiais
                  </Button>
                </DialogFooter>
              </>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const MATERIAL_CATEGORIES = [
  "EPI",
  "Curativo",
  "Descartável",
  "Limpeza",
  "Escritório",
  "Higiene",
  "Instrumental",
  "Laboratório",
  "Geral"
];

const MATERIAL_GROUPS = [
  "ANTISSÉPTICOS / DESINFETANTES",
  "PRODUTOS QUÍMICOS",
  "OUTROS MATERIAIS",
  "RADIOLOGIA",
  "TUBOS, SONDAS E DRENOS",
  "FIOS, CABOS E CONEXÕES",
  "ACESSÓRIOS E INSTRUMENTAIS CIRÚRGICOS",
  "DISPOSITIVOS DE INFUSÃO",
  "CURATIVOS",
  "DISPOSITIVOS DE INCISÃO",
  "LÁTEX",
  "TÊXTEIS",
  "BOLSAS E COLETORES",
  "ÓRTESES / PRÓTESES",
  "MATERIAIS ESPECIAIS"
];

const MATERIAL_UNITS = [
  "UN",
  "PCT",
  "CX",
  "LITRO",
  "ROLO",
  "GALÃO",
  "KG",
  "ML",
  "PAR",
  "FARDO",
  "UND",
  "PCTS"
];

function MaterialsTab() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<MaterialWithBatch | null>(null);
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());
  
  const toggleExpandedMaterial = (materialId: string) => {
    setExpandedMaterials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return newSet;
    });
  };
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    code: "",
    shortName: "",
    category: "Geral",
    materialGroup: "",
    unit: "UN",
    minStock: "10",
    manufacturer: "",
    storageConditions: ""
  });
  const [groupFilter, setGroupFilter] = useState("all");
  const [newBatch, setNewBatch] = useState({
    materialId: "",
    batchNumber: "",
    quantity: "",
    expirationDate: "",
    supplier: "",
    storageLocation: "",
    notes: ""
  });
  const [newMovement, setNewMovement] = useState({
    batchId: "",
    materialId: "",
    quantity: "",
    movementType: "entrada",
    reason: "",
    destinationSector: ""
  });

  const { data: materials = [], isLoading: loadingMaterials } = useQuery<SelectMaterialsCatalog[]>({
    queryKey: ["/api/materials"],
  });

  const { data: materialBatches = [], isLoading: loadingBatches } = useQuery<MaterialWithBatch[]>({
    queryKey: ["/api/materials-batches"],
  });

  const createMaterialMutation = useMutation({
    mutationFn: async (data: typeof newMaterial) => {
      return apiRequest("/api/materials", { method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setIsAddMaterialOpen(false);
      setNewMaterial({
        name: "",
        code: "",
        shortName: "",
        category: "Geral",
        materialGroup: "",
        unit: "UN",
        minStock: "10",
        manufacturer: "",
        storageConditions: ""
      });
      toast({ title: "Sucesso", description: "Material cadastrado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: typeof newBatch) => {
      return apiRequest("/api/materials-batches", { method: "POST", body: { ...data, initialQuantity: data.quantity } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials-batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setIsAddBatchOpen(false);
      setNewBatch({
        materialId: "",
        batchNumber: "",
        quantity: "",
        expirationDate: "",
        supplier: "",
        storageLocation: "",
        notes: ""
      });
      toast({ title: "Sucesso", description: "Lote cadastrado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const createMovementMutation = useMutation({
    mutationFn: async (data: typeof newMovement) => {
      return apiRequest("/api/materials-movements", { method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials-batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setIsMovementOpen(false);
      setSelectedBatch(null);
      setNewMovement({
        batchId: "",
        materialId: "",
        quantity: "",
        movementType: "entrada",
        reason: "",
        destinationSector: ""
      });
      toast({ title: "Sucesso", description: "Movimentação registrada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const importMaterialsMutation = useMutation({
    mutationFn: async (materials: Array<{ name: string; unit: string; category: string }>) => {
      return apiRequest("/api/materials/import", { method: "POST", body: { materials } });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setIsImportOpen(false);
      toast({ 
        title: "Importação Concluída", 
        description: data.message || `${data.imported} materiais importados`
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const filteredMaterials = useMemo(() => {
    return materials.filter(mat => {
      const matchesSearch = !searchTerm || 
        mat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mat.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mat.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mat.materialGroup?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || mat.category === categoryFilter;
      const matchesGroup = groupFilter === "all" || mat.materialGroup === groupFilter;
      return matchesSearch && matchesCategory && matchesGroup;
    });
  }, [materials, searchTerm, categoryFilter, groupFilter]);

  const openMovementDialog = (batch: MaterialWithBatch) => {
    setSelectedBatch(batch);
    setNewMovement({
      batchId: batch.id,
      materialId: batch.materialId,
      quantity: "",
      movementType: "saida",
      reason: "",
      destinationSector: ""
    });
    setIsMovementOpen(true);
  };

  const handleSubmitMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    createMaterialMutation.mutate(newMaterial);
  };

  const handleSubmitBatch = (e: React.FormEvent) => {
    e.preventDefault();
    createBatchMutation.mutate(newBatch);
  };

  const handleSubmitMovement = (e: React.FormEvent) => {
    e.preventDefault();
    createMovementMutation.mutate(newMovement);
  };

  const importExcelMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/materials/import-excel", { method: "POST" });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setIsImportOpen(false);
      toast({ 
        title: "Importação Concluída", 
        description: data.message || `${data.imported} materiais importados da planilha`
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const handleImportExcel = () => {
    importExcelMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-emerald-500">Disponível</Badge>;
      case "low_stock": return <Badge variant="outline" className="border-amber-500 text-amber-600">Estoque Baixo</Badge>;
      case "depleted": return <Badge variant="destructive">Esgotado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar material..."
              className="pl-8 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-materials"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40" data-testid="select-category-filter">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {MATERIAL_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-64" data-testid="select-group-filter">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Grupos</SelectItem>
              {MATERIAL_GROUPS.map(grp => (
                <SelectItem key={grp} value={grp}>{grp}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setIsImportOpen(true)} data-testid="button-import-materials">
            <Download className="h-4 w-4 mr-2" />
            Importar Materiais
          </Button>
          <Button variant="outline" onClick={() => setIsAddBatchOpen(true)} data-testid="button-add-material-batch">
            <Package className="h-4 w-4 mr-2" />
            Adicionar Lote
          </Button>
          <Button onClick={() => setIsAddMaterialOpen(true)} data-testid="button-add-material">
            <Plus className="h-4 w-4 mr-2" />
            Novo Material
          </Button>
        </div>
      </div>

      {/* Materials Table - Expandable rows like medications */}
      {loadingMaterials ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum material encontrado. Clique em "Novo Material" ou "Importar Materiais" para começar.
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-center">Total em Estoque</TableHead>
                <TableHead className="text-center">Lotes</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map(mat => {
                const matBatches = materialBatches.filter(b => b.materialId === mat.id);
                const totalStock = matBatches.reduce((sum, b) => sum + parseInt(b.quantity || "0"), 0);
                const isExpanded = expandedMaterials.has(mat.id);
                const nearestExpiry = matBatches
                  .filter(b => b.expirationDate)
                  .sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime())[0];
                
                return (
                  <>
                    <TableRow 
                      key={mat.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpandedMaterial(mat.id)}
                      data-testid={`row-material-${mat.id}`}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{mat.name.substring(0, 80)}{mat.name.length > 80 ? '...' : ''}</div>
                        <div className="text-xs text-muted-foreground">
                          {mat.unit} {mat.code && `• Cód: ${mat.code}`}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-2xl font-bold ${totalStock < parseInt(mat.minStock) ? 'text-red-600' : 'text-emerald-600'}`}>
                          {totalStock}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">unid.</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{matBatches.length} {matBatches.length === 1 ? 'lote' : 'lotes'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">{mat.materialGroup || mat.category || '—'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewBatch({ ...newBatch, materialId: mat.id });
                            setIsAddBatchOpen(true);
                          }}
                          title="Adicionar Lote"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded batch details */}
                    {isExpanded && matBatches.map(batch => {
                      const daysToExpire = batch.expirationDate 
                        ? differenceInDays(parseISO(batch.expirationDate), new Date())
                        : null;
                      
                      return (
                        <TableRow 
                          key={batch.id} 
                          className="bg-muted/30"
                          data-testid={`row-material-batch-${batch.id}`}
                        >
                          <TableCell></TableCell>
                          <TableCell className="pl-8">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">{batch.batchNumber}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{batch.quantity}</TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {batch.storageLocation || "—"}
                          </TableCell>
                          <TableCell>
                            {batch.expirationDate ? (
                              <div>
                                <p className="text-sm">{format(parseISO(batch.expirationDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                                {daysToExpire !== null && daysToExpire <= 30 && (
                                  <Badge variant={daysToExpire <= 7 ? "destructive" : "outline"} className="text-xs">
                                    {daysToExpire} dias
                                  </Badge>
                                )}
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  setSelectedBatch(batch);
                                  setNewMovement({ ...newMovement, batchId: batch.id, materialId: mat.id, movementType: "dispatch" });
                                  setIsMovementOpen(true);
                                }}
                                title="Registrar Movimentação"
                              >
                                <ArrowUpDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {/* Show message if no batches */}
                    {isExpanded && matBatches.length === 0 && (
                      <TableRow className="bg-muted/30">
                        <TableCell></TableCell>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                          Nenhum lote cadastrado. Clique em "+" para adicionar um lote.
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Legacy Batches Section - Hidden, kept for reference */}
      {false && materialBatches.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Lotes de Materiais</CardTitle>
            <CardDescription>Controle de lotes por validade e quantidade</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialBatches.slice(0, 10).map(batch => (
                  <TableRow key={batch.id} data-testid={`row-batch-${batch.id}`}>
                    <TableCell className="font-medium">{batch.material?.name || "—"}</TableCell>
                    <TableCell>{batch.batchNumber}</TableCell>
                    <TableCell>{batch.quantity} {batch.material?.unit}</TableCell>
                    <TableCell>
                      {batch.expirationDate ? format(parseISO(batch.expirationDate), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell>{batch.storageLocation || "—"}</TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openMovementDialog(batch)}>
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Material Dialog */}
      <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Material</DialogTitle>
            <DialogDescription>Adicione um novo material ao catálogo</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitMaterial} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="matName">Nome do Material *</Label>
              <Input 
                id="matName"
                value={newMaterial.name}
                onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value, shortName: e.target.value.substring(0,50)})}
                placeholder="Ex: LUVAS DE PROCEDIMENTO M"
                required
                data-testid="input-material-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matGroup">Grupo *</Label>
              <Select value={newMaterial.materialGroup} onValueChange={(v) => setNewMaterial({...newMaterial, materialGroup: v})}>
                <SelectTrigger data-testid="select-material-group">
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_GROUPS.map(grp => (
                    <SelectItem key={grp} value={grp}>{grp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matCategory">Categoria</Label>
                <Select value={newMaterial.category} onValueChange={(v) => setNewMaterial({...newMaterial, category: v})}>
                  <SelectTrigger data-testid="select-material-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="matUnit">Unidade *</Label>
                <Select value={newMaterial.unit} onValueChange={(v) => setNewMaterial({...newMaterial, unit: v})}>
                  <SelectTrigger data-testid="select-material-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_UNITS.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matCode">Código</Label>
                <Input 
                  id="matCode"
                  value={newMaterial.code}
                  onChange={(e) => setNewMaterial({...newMaterial, code: e.target.value})}
                  placeholder="Código interno"
                  data-testid="input-material-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="matMinStock">Estoque Mínimo</Label>
                <Input 
                  id="matMinStock"
                  type="number"
                  min="0"
                  value={newMaterial.minStock}
                  onChange={(e) => setNewMaterial({...newMaterial, minStock: e.target.value})}
                  data-testid="input-material-min-stock"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={createMaterialMutation.isPending} data-testid="button-save-material">
                {createMaterialMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Batch Dialog */}
      <Dialog open={isAddBatchOpen} onOpenChange={setIsAddBatchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Lote de Material</DialogTitle>
            <DialogDescription>Adicione um novo lote ao estoque</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitBatch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batchMaterial">Material *</Label>
              <Select value={newBatch.materialId} onValueChange={(v) => setNewBatch({...newBatch, materialId: v})}>
                <SelectTrigger data-testid="select-batch-material">
                  <SelectValue placeholder="Selecione o material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batchNumber">Número do Lote *</Label>
                <Input 
                  id="batchNumber"
                  value={newBatch.batchNumber}
                  onChange={(e) => setNewBatch({...newBatch, batchNumber: e.target.value})}
                  placeholder="Ex: LOT2024001"
                  required
                  data-testid="input-batch-number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batchQty">Quantidade *</Label>
                <Input 
                  id="batchQty"
                  type="number"
                  min="1"
                  value={newBatch.quantity}
                  onChange={(e) => setNewBatch({...newBatch, quantity: e.target.value})}
                  required
                  data-testid="input-batch-quantity"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batchExp">Validade</Label>
                <Input 
                  id="batchExp"
                  type="date"
                  value={newBatch.expirationDate}
                  onChange={(e) => setNewBatch({...newBatch, expirationDate: e.target.value})}
                  data-testid="input-batch-expiration"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batchLocation">Local de Armazenamento</Label>
                <Input 
                  id="batchLocation"
                  value={newBatch.storageLocation}
                  onChange={(e) => setNewBatch({...newBatch, storageLocation: e.target.value})}
                  placeholder="Ex: Sala 01, Prateleira A"
                  data-testid="input-batch-location"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchSupplier">Fornecedor</Label>
              <Input 
                id="batchSupplier"
                value={newBatch.supplier}
                onChange={(e) => setNewBatch({...newBatch, supplier: e.target.value})}
                placeholder="Nome do fornecedor"
                data-testid="input-batch-supplier"
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={createBatchMutation.isPending} data-testid="button-save-batch">
                {createBatchMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Movimentação</DialogTitle>
            <DialogDescription>
              {selectedBatch && (
                <>
                  <strong>{selectedBatch.material?.name}</strong> - Lote: {selectedBatch.batchNumber}
                  <br />
                  Quantidade atual: {selectedBatch.quantity} {selectedBatch.material?.unit}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitMovement} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="movType">Tipo de Movimentação</Label>
              <Select value={newMovement.movementType} onValueChange={(v) => setNewMovement({...newMovement, movementType: v})}>
                <SelectTrigger data-testid="select-mat-movement-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                  <SelectItem value="perda">Perda / Descarte</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="movQty">Quantidade</Label>
              <Input 
                id="movQty" 
                type="number"
                min="1"
                value={newMovement.quantity}
                onChange={(e) => setNewMovement({...newMovement, quantity: e.target.value})}
                required
                data-testid="input-mat-movement-qty"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="movSector">Setor de Destino</Label>
              <Input 
                id="movSector" 
                value={newMovement.destinationSector}
                onChange={(e) => setNewMovement({...newMovement, destinationSector: e.target.value})}
                placeholder="Ex: Sala de Procedimentos"
                data-testid="input-mat-destination-sector"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="movReason">Motivo</Label>
              <Input 
                id="movReason" 
                value={newMovement.reason}
                onChange={(e) => setNewMovement({...newMovement, reason: e.target.value})}
                placeholder="Ex: Uso em procedimento"
                data-testid="input-mat-movement-reason"
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={createMovementMutation.isPending} data-testid="button-save-mat-movement">
                {createMovementMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Materiais da Planilha</DialogTitle>
            <DialogDescription>
              Importe a lista completa de materiais hospitalares da planilha Excel.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Esta ação irá importar <strong>199 materiais hospitalares</strong> da planilha Excel fornecida, 
              incluindo: agulhas, seringas, ataduras, gazes, sondas, cateteres, equipos, luvas, e diversos outros materiais médicos.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Os materiais serão automaticamente classificados nos grupos: Curativos, Dispositivos de Infusão, 
              Tubos/Sondas/Drenos, Látex, Têxteis, Antissépticos, etc.
            </p>
            <p className="text-sm text-amber-600 mb-4">
              Materiais já existentes serão ignorados.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleImportExcel} disabled={importExcelMutation.isPending} data-testid="button-confirm-import">
              {importExcelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importar Materiais
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component for displaying pending procedure requests with item-level tracking
function ProceduresQueue({
  procedures,
  loading,
  filterChannel = "all",
  showActions = true,
  onDispenseItem,
}: {
  procedures: any[];
  loading: boolean;
  filterChannel?: "all" | "pharmacy" | "materials" | "mixed";
  showActions?: boolean;
  onDispenseItem?: (item: any) => void;
}) {
  const { toast } = useToast();
  
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/procedure-requests/${id}/complete`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Procedimento concluído",
        description: "Todos os itens foram dispensados com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/procedure-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procedure-requests/completed"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível completar o procedimento.",
        variant: "destructive",
      });
    },
  });

  const completeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest(`/api/procedure-request-items/${itemId}/complete`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Item dispensado",
        description: "O item foi dispensado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/procedure-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procedure-requests/completed"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível completar o item.",
        variant: "destructive",
      });
    },
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge className="bg-red-500">Urgente</Badge>;
      case "high":
        return <Badge className="bg-orange-500">Alta</Badge>;
      case "low":
        return <Badge className="bg-green-500">Baixa</Badge>;
      default:
        return <Badge className="bg-blue-500">Normal</Badge>;
    }
  };

  const getSourceBadge = (sourceType: string, sourceName: string) => {
    const colors: Record<string, string> = {
      hospitalization: "bg-purple-500",
      observation: "bg-blue-500",
      red_room: "bg-red-500",
      queue: "bg-amber-500",
      outpatient: "bg-green-500",
    };
    return (
      <Badge className={colors[sourceType] || "bg-gray-500"}>
        {sourceName || sourceType}
      </Badge>
    );
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case "pharmacy":
        return <Badge className="bg-blue-600">💊 Farmácia</Badge>;
      case "materials":
        return <Badge className="bg-orange-600">🔧 Almoxarifado</Badge>;
      case "mixed":
        return <Badge className="bg-purple-600">💊🔧 Misto</Badge>;
      default:
        return <Badge className="bg-gray-500">{channel}</Badge>;
    }
  };

  // Filter procedures by channel
  const filteredProcedures = filterChannel === "all" 
    ? procedures 
    : procedures.filter(p => p.fulfillmentChannel === filterChannel);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (filteredProcedures.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <CheckCircle2 className="h-12 w-12 text-teal-500 mb-4" />
          <p className="text-lg font-medium text-gray-700">Nenhum procedimento pendente</p>
          <p className="text-sm text-gray-500">
            {filterChannel === "pharmacy" 
              ? "Nenhum medicamento pendente para dispensar."
              : filterChannel === "materials"
              ? "Nenhum material pendente para dispensar."
              : "Todas as solicitações foram atendidas."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Scissors className="h-5 w-5 text-teal-600" />
        <span className="font-medium">Procedimentos Pendentes ({filteredProcedures.length})</span>
      </div>

      {filteredProcedures.map((proc) => {
        const pendingItems = proc.items?.filter((i: any) => i.status === "pending") || [];
        const medicationItems = proc.items?.filter((i: any) => i.itemType === "medication") || [];
        const materialItems = proc.items?.filter((i: any) => i.itemType === "material") || [];
        
        return (
          <Card key={proc.id} className={`border-l-4 ${
            proc.fulfillmentChannel === "pharmacy" 
              ? "border-l-blue-500" 
              : proc.fulfillmentChannel === "materials"
              ? "border-l-orange-500"
              : "border-l-purple-500"
          }`}>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Package className="h-5 w-5 text-teal-600" />
                      <span className="font-semibold text-lg">
                        {proc.requestMode === "kit" 
                          ? (proc.kit?.name || "Kit") 
                          : `Solicitação Personalizada`}
                      </span>
                      {getPriorityBadge(proc.priority)}
                      {getChannelBadge(proc.fulfillmentChannel)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{proc.patientName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Stethoscope className="h-4 w-4" />
                        <span>{proc.requestedByName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {proc.sourceType && getSourceBadge(proc.sourceType, proc.sourceName)}
                      <span className="text-xs text-gray-400">
                        {proc.createdAt && format(new Date(proc.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    {proc.notes && (
                      <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                        {proc.notes}
                      </p>
                    )}
                  </div>

                  {showActions && (
                    <Button
                      onClick={() => completeMutation.mutate(proc.id)}
                      disabled={completeMutation.isPending || pendingItems.length === 0}
                      className="bg-teal-600 hover:bg-teal-700"
                      data-testid={`button-complete-procedure-${proc.id}`}
                    >
                      {completeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Concluir Tudo
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Items List */}
                {proc.items && proc.items.length > 0 && (
                  <div className="border-t pt-3 mt-2">
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Itens da solicitação ({proc.items.length}):
                    </p>
                    <div className="space-y-2">
                      {/* Medication Items */}
                      {medicationItems.length > 0 && (
                        <div className="bg-blue-50 p-2 rounded-lg">
                          <p className="text-xs font-medium text-blue-700 mb-1">💊 Medicamentos</p>
                          <div className="space-y-1">
                            {medicationItems.map((item: any) => (
                              <div 
                                key={item.id} 
                                className={`flex items-center justify-between p-2 rounded ${
                                  item.status === "completed" 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-white"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {item.status === "completed" ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <div className="h-4 w-4 border-2 border-gray-300 rounded" />
                                  )}
                                  <span className="text-sm">{item.itemName}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {item.quantity} {item.unit || "un"}
                                  </Badge>
                                  {item.instructions && (
                                    <span className="text-xs text-gray-500">- {item.instructions}</span>
                                  )}
                                </div>
                                {showActions && item.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onDispenseItem ? onDispenseItem(item) : completeItemMutation.mutate(item.id)}
                                    disabled={completeItemMutation.isPending}
                                    className="h-7 text-xs"
                                  >
                                    Dispensar
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Material Items */}
                      {materialItems.length > 0 && (
                        <div className="bg-orange-50 p-2 rounded-lg">
                          <p className="text-xs font-medium text-orange-700 mb-1">🔧 Materiais</p>
                          <div className="space-y-1">
                            {materialItems.map((item: any) => (
                              <div 
                                key={item.id} 
                                className={`flex items-center justify-between p-2 rounded ${
                                  item.status === "completed" 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-white"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {item.status === "completed" ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <div className="h-4 w-4 border-2 border-gray-300 rounded" />
                                  )}
                                  <span className="text-sm">{item.itemName}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {item.quantity} {item.unit || "un"}
                                  </Badge>
                                  {item.instructions && (
                                    <span className="text-xs text-gray-500">- {item.instructions}</span>
                                  )}
                                </div>
                                {showActions && item.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onDispenseItem ? onDispenseItem(item) : completeItemMutation.mutate(item.id)}
                                    disabled={completeItemMutation.isPending}
                                    className="h-7 text-xs"
                                  >
                                    Dispensar
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Kit items for kit-mode requests */}
                {proc.requestMode === "kit" && proc.kit?.items && proc.kit.items.length > 0 && !proc.items?.length && (
                  <div className="border-t pt-3 mt-2">
                    <p className="text-xs font-medium text-gray-600 mb-1">Itens do kit:</p>
                    <div className="flex flex-wrap gap-1">
                      {proc.kit.items.map((item: any) => (
                        <Badge 
                          key={item.id} 
                          variant="outline" 
                          className={`text-xs ${
                            item.itemType === "medication" 
                              ? "bg-blue-50 text-blue-700" 
                              : "bg-orange-50 text-orange-700"
                          }`}
                        >
                          {item.itemType === "medication" ? "💊" : "🔧"}{" "}
                          {item.medication?.name || item.material?.name || "Item"} ({item.defaultQuantity})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Unified Dispensing Queue - combines prescriptions and procedure requests
function UnifiedDispensingQueue({
  queue,
  loading,
  showActions = true,
  typeFilter = "all",
  onTypeFilterChange,
  batches,
  onDispensePrescriptionItem,
  onDispenseProcedureItem,
}: {
  queue: any[];
  loading: boolean;
  showActions?: boolean;
  typeFilter?: "all" | "prescription" | "procedure";
  onTypeFilterChange?: (filter: "all" | "prescription" | "procedure") => void;
  batches: any[];
  onDispensePrescriptionItem: (item: any, prescriptionId: string, patientName: string) => void;
  onDispenseProcedureItem: (item: any) => void;
}) {
  const { toast } = useToast();

  // Mutation for completing procedure requests
  const completeProcedureMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/procedure-requests/${id}/complete`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Procedimento concluído",
        description: "Todos os itens foram dispensados com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dispensing/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procedure-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procedure-requests/completed"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível completar o procedimento.",
        variant: "destructive",
      });
    },
  });

  // Mutation for completing procedure item
  const completeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest(`/api/procedure-request-items/${itemId}/complete`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Item dispensado",
        description: "O item foi dispensado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dispensing/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procedure-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procedure-requests/completed"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível dispensar o item.",
        variant: "destructive",
      });
    },
  });

  // Mutation for completing prescriptions
  const completePrescriptionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/pharmacy/prescriptions/${id}`, {
        method: "PATCH",
        body: { status: "dispensed" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Prescrição dispensada",
        description: "Todos os itens foram dispensados com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dispensing/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions/pending"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível completar a prescrição.",
        variant: "destructive",
      });
    },
  });

  const getTypeBadge = (type: string) => {
    if (type === "prescription") {
      return <Badge className="bg-rose-500">💊 Prescrição</Badge>;
    }
    return <Badge className="bg-teal-500">🏥 Procedimento</Badge>;
  };

  const getOriginBadge = (origin: string) => {
    const labels: Record<string, string> = {
      prontuario: "Prontuário",
      internacao: "Internação",
      observacao: "Observação",
      sala_vermelha: "Sala Vermelha",
      hospitalization: "Internação",
      observation: "Observação",
      red_room: "Sala Vermelha",
    };
    const colors: Record<string, string> = {
      prontuario: "bg-gray-500",
      internacao: "bg-purple-500",
      observacao: "bg-blue-500",
      sala_vermelha: "bg-red-500",
      hospitalization: "bg-purple-500",
      observation: "bg-blue-500",
      red_room: "bg-red-500",
    };
    return (
      <Badge className={colors[origin] || "bg-gray-500"}>
        {labels[origin] || origin}
      </Badge>
    );
  };

  // Filter queue by type
  const filteredQueue = typeFilter === "all" 
    ? queue 
    : queue.filter(item => item.type === typeFilter);

  const prescriptionCount = queue.filter(q => q.type === "prescription").length;
  const procedureCount = queue.filter(q => q.type === "procedure").length;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <Button
          variant={typeFilter === "all" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onTypeFilterChange?.("all")}
          className="h-8"
          data-testid="filter-all"
        >
          Todos ({queue.length})
        </Button>
        <Button
          variant={typeFilter === "prescription" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onTypeFilterChange?.("prescription")}
          className="h-8"
          data-testid="filter-prescription"
        >
          💊 Prescrições ({prescriptionCount})
        </Button>
        <Button
          variant={typeFilter === "procedure" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onTypeFilterChange?.("procedure")}
          className="h-8"
          data-testid="filter-procedure"
        >
          🏥 Procedimentos ({procedureCount})
        </Button>
      </div>

      {filteredQueue.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
            <p className="text-lg font-medium">Nenhuma dispensação pendente</p>
            <p className="text-sm text-muted-foreground mt-2">
              {typeFilter === "prescription" 
                ? "Não há prescrições pendentes."
                : typeFilter === "procedure"
                ? "Não há procedimentos pendentes."
                : "Todas as dispensações foram concluídas!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQueue.map((item) => (
            <Card 
              key={`${item.type}-${item.id}`} 
              className={`border-l-4 ${
                item.type === "prescription" 
                  ? "border-l-rose-500" 
                  : "border-l-teal-500"
              }`}
              data-testid={`card-dispensing-${item.type}-${item.id}`}
            >
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeBadge(item.type)}
                        {getOriginBadge(item.origin)}
                        {item.kitName && (
                          <Badge variant="outline" className="text-xs">
                            Kit: {item.kitName}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{item.patientName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Stethoscope className="h-4 w-4" />
                          <span>{item.doctorName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {item.createdAt && format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {item.pendingItemCount}/{item.itemCount} pendentes
                        </Badge>
                      </div>

                      {item.notes && (
                        <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    {showActions && (
                      <Button
                        onClick={() => {
                          if (item.type === "prescription") {
                            completePrescriptionMutation.mutate(item.id);
                          } else {
                            completeProcedureMutation.mutate(item.id);
                          }
                        }}
                        disabled={
                          completePrescriptionMutation.isPending || 
                          completeProcedureMutation.isPending || 
                          item.pendingItemCount === 0
                        }
                        className={item.type === "prescription" ? "bg-rose-600 hover:bg-rose-700" : "bg-teal-600 hover:bg-teal-700"}
                        data-testid={`button-complete-${item.type}-${item.id}`}
                      >
                        {(completePrescriptionMutation.isPending || completeProcedureMutation.isPending) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Concluir Tudo
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Items List */}
                  {item.items && item.items.length > 0 && (
                    <div className="border-t pt-3 mt-2">
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Itens ({item.items.length}):
                      </p>
                      <div className="space-y-1">
                        {item.items.map((subItem: any) => {
                          const isPending = subItem.status === "pending";
                          const isMedication = subItem.itemType === "medication" || item.type === "prescription";
                          
                          return (
                            <div 
                              key={subItem.id} 
                              className={`flex items-center justify-between p-2 rounded ${
                                !isPending
                                  ? "bg-green-100 text-green-800" 
                                  : isMedication
                                  ? "bg-blue-50"
                                  : "bg-orange-50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {!isPending ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <div className="h-4 w-4 border-2 border-gray-300 rounded" />
                                )}
                                <span className="text-sm">
                                  {isMedication ? "💊" : "🔧"} {subItem.itemName || subItem.medicationName}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {subItem.quantity} {subItem.unit || subItem.dosage || "un"}
                                </Badge>
                                {(subItem.instructions || subItem.frequency) && (
                                  <span className="text-xs text-gray-500">
                                    - {subItem.instructions || subItem.frequency}
                                  </span>
                                )}
                              </div>
                              {showActions && isPending && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (item.type === "procedure") {
                                      onDispenseProcedureItem(subItem);
                                    } else {
                                      // For prescriptions, open dispense dialog
                                      onDispensePrescriptionItem(subItem, item.id, item.patientName);
                                    }
                                  }}
                                  disabled={false}
                                  className="h-7 text-xs"
                                >
                                  Dispensar
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
