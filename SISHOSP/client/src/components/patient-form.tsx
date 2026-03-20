import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertPatientSchema, type InsertPatient } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatCPF, formatSUSCard, formatWhatsApp, validateCPF, validateCellPhone } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { User, CreditCard, Phone, MapPin, Home, Calendar, Mail, Briefcase, Users, Baby, Heart, Scale, Stethoscope, FileText, ChevronRight, Accessibility, ShieldCheck, Check, ChevronsUpDown } from "lucide-react";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const brazilianStates = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

const professionsList = [
  "Administrador(a)",
  "Advogado(a)",
  "Agente Comunitário de Saúde",
  "Agente de Endemias",
  "Agricultor(a)",
  "Agrônomo(a)",
  "Analista de Sistemas",
  "Aposentado(a)",
  "Arquiteto(a)",
  "Artesão(ã)",
  "Assistente Administrativo",
  "Assistente Social",
  "Atendente",
  "Autônomo(a)",
  "Auxiliar Administrativo",
  "Auxiliar de Enfermagem",
  "Auxiliar de Serviços Gerais",
  "Balconista",
  "Bancário(a)",
  "Barbeiro(a)",
  "Bombeiro(a)",
  "Borracheiro(a)",
  "Cabelereiro(a)",
  "Caminhoneiro(a)",
  "Carpinteiro(a)",
  "Cobrador(a)",
  "Comerciante",
  "Confeiteiro(a)",
  "Contador(a)",
  "Costureiro(a)",
  "Cozinheiro(a)",
  "Dentista",
  "Desempregado(a)",
  "Designer",
  "Do Lar",
  "Doméstico(a)",
  "Eletricista",
  "Empreendedor(a)",
  "Empresário(a)",
  "Enfermeiro(a)",
  "Engenheiro(a)",
  "Engenheiro(a) Civil",
  "Engenheiro(a) Elétrico",
  "Engenheiro(a) Mecânico",
  "Esteticista",
  "Estudante",
  "Farmacêutico(a)",
  "Faxineiro(a)",
  "Ferreiro(a)",
  "Fisioterapeuta",
  "Fotógrafo(a)",
  "Funcionário(a) Público(a)",
  "Garçom/Garçonete",
  "Gari",
  "Jardineiro(a)",
  "Jornalista",
  "Lavrador(a)",
  "Manicure",
  "Marceneiro(a)",
  "Mecânico(a)",
  "Médico(a)",
  "Mestre de Obras",
  "Militar",
  "Motorista",
  "Músico(a)",
  "Nutricionista",
  "Operador(a) de Caixa",
  "Operador(a) de Máquinas",
  "Padeiro(a)",
  "Pastor(a)",
  "Pedagogo(a)",
  "Pedreiro(a)",
  "Pensionista",
  "Pescador(a)",
  "Pintor(a)",
  "Pizzaiolo(a)",
  "Policial Civil",
  "Policial Militar",
  "Porteiro(a)",
  "Professor(a)",
  "Programador(a)",
  "Promotor(a) de Vendas",
  "Psicólogo(a)",
  "Publicitário(a)",
  "Recepcionista",
  "Representante Comercial",
  "Segurança",
  "Serralheiro(a)",
  "Servente",
  "Servidor(a) Público(a)",
  "Soldador(a)",
  "Taxista",
  "Técnico(a) de Enfermagem",
  "Técnico(a) de Informática",
  "Técnico(a) em Edificações",
  "Técnico(a) em Segurança do Trabalho",
  "Telefonista",
  "Vendedor(a)",
  "Veterinário(a)",
  "Vigilante",
  "Zelador(a)",
  "Outros"
];

interface PatientFormProps {
  initialData?: InsertPatient;
  onSuccess?: () => void;
  submitLabel?: string;
  formMode?: "full" | "newbornOnly" | "pcdOnly";
}

export default function PatientForm({ initialData, onSuccess, submitLabel = "Cadastrar Paciente", formMode = "full" }: PatientFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isNewbornOnlyMode = formMode === "newbornOnly";
  const isPcdOnlyMode = formMode === "pcdOnly";
  const [showNewbornSection, setShowNewbornSection] = useState(initialData?.isNewborn || isNewbornOnlyMode);
  const [showPcdSection, setShowPcdSection] = useState(initialData?.isPcd || isPcdOnlyMode);
  
  const [professionInputValue, setProfessionInputValue] = useState("");
  const [showProfessionDropdown, setShowProfessionDropdown] = useState(false);

  const form = useForm<InsertPatient>({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: initialData || {
      name: "",
      cpf: "",
      rg: isNewbornOnlyMode ? "RN" : "",
      rgIssuingAgency: "",
      email: "",
      susCard: "",
      birthDate: "",
      gender: "masculino",
      whatsapp: "",
      phoneIsWhatsapp: true,
      landlinePhone: "",
      profession: "",
      occupation: "",
      motherName: "",
      address: isNewbornOnlyMode ? "Hospital" : "",
      addressNumber: isNewbornOnlyMode ? "S/N" : "",
      neighborhood: isNewbornOnlyMode ? "Centro" : "",
      zoneType: "urbana",
      city: isNewbornOnlyMode ? "Exu" : "",
      state: "PE",
      // Informações Complementares
      fatherName: "",
      religion: "",
      race: "",
      education: "",
      nationality: "Brasileira",
      birthPlace: "",
      // Campos de Recém-Nascido
      isNewborn: isNewbornOnlyMode ? true : false,
      newbornStatus: "",
      skinColor: "",
      isTwin: false,
      antibioticGiven: "",
      breastfeeding: "",
      otherFeeding: "",
      isPremature: false,
      gestationalAge: "",
      hadTransfusion: false,
      transfusionDate: "",
      referenceDate: "",
      birthWeight: "",
      newbornObservation: "",
      // Campos de Pessoa com Deficiência
      isPcd: isPcdOnlyMode ? true : false,
      disabilityType: "",
      disabilityCid: "",
      disabilityDegree: "",
      needsPermanentCompanion: false,
      accessibilityResources: "",
      hasBpcLoas: false,
      pcdObservation: "",
    },
  });

  // Watch for isNewborn changes to toggle section visibility
  const isNewbornValue = form.watch("isNewborn");
  const isPcdValue = form.watch("isPcd");
  
  useEffect(() => {
    setShowNewbornSection(isNewbornValue || isNewbornOnlyMode);
  }, [isNewbornValue]);
  
  useEffect(() => {
    setShowPcdSection(isPcdValue || isPcdOnlyMode);
  }, [isPcdValue]);

  const createPatientMutation = useMutation({
    mutationFn: async (data: InsertPatient) => {
      const method = initialData ? "PUT" : "POST";
      const url = initialData ? `/api/patients/${(initialData as any).id}` : "/api/patients";
      return await apiRequest(url, {
        method,
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: initialData ? "Paciente atualizado com sucesso!" : "Paciente cadastrado com sucesso!",
        description: initialData ? "Os dados do paciente foram atualizados." : "Novo paciente cadastrado no sistema.",
      });
      if (!initialData) form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar paciente",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertPatient) => {
    if (data.whatsapp && data.whatsapp.trim() !== "") {
      if (!validateCellPhone(data.whatsapp)) {
        toast({
          title: "Telefone inválido",
          description: "O telefone deve conter DDD (2 dígitos) + número de celular (9 dígitos começando com 9). Ex: (87) 99999-9999",
          variant: "destructive",
        });
        return;
      }
    }
    createPatientMutation.mutate(data);
  };

  const handleCPFChange = (value: string, onChange: (value: string) => void) => {
    const formatted = formatCPF(value);
    onChange(formatted);
  };

  const handleSUSCardChange = (value: string, onChange: (value: string) => void) => {
    const formatted = formatSUSCard(value);
    onChange(formatted);
  };

  const handleWhatsAppChange = (value: string, onChange: (value: string) => void) => {
    const formatted = formatWhatsApp(value);
    onChange(formatted);
  };

  const getHeaderStyle = () => {
    if (isNewbornOnlyMode) return 'bg-gradient-to-r from-teal-500 to-teal-600';
    if (isPcdOnlyMode) return 'bg-gradient-to-r from-purple-600 to-purple-700';
    return 'bg-gradient-to-r from-blue-600 to-blue-700';
  };

  const getBorderStyle = () => {
    if (isNewbornOnlyMode) return 'border-teal-200';
    if (isPcdOnlyMode) return 'border-purple-200';
    return 'border-gray-100';
  };

  const getFormTitle = () => {
    if (isNewbornOnlyMode) return "Cadastro de Recém-Nascido";
    if (isPcdOnlyMode) return "Cadastro de Pessoa com Deficiência";
    return initialData ? "Editar Dados do Paciente" : "Cadastro de Paciente";
  };

  const getFormIcon = () => {
    if (isNewbornOnlyMode) return <Baby className="h-5 w-5" />;
    if (isPcdOnlyMode) return <Accessibility className="h-5 w-5" />;
    return <User className="h-5 w-5" />;
  };

  return (
    <Card className={`bg-white rounded-2xl shadow-lg border ${getBorderStyle()}`}>
      <CardHeader className={`${getHeaderStyle()} text-white rounded-t-2xl`}>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          {getFormIcon()}
          {getFormTitle()}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Simplified Personal Info for Newborn Only Mode */}
            {isNewbornOnlyMode && (
              <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                <h3 className="text-lg font-medium text-teal-900 mb-4 flex items-center gap-2">
                  <Baby className="h-4 w-4" />
                  Identificação do RN
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-teal-700">
                            <Baby className="h-4 w-4" />
                            Nome do RN *
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: RN de Maria da Silva" className="border-teal-300" data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-teal-700">
                          <Calendar className="h-4 w-4" />
                          Data de Nascimento *
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="border-teal-300" data-testid="input-birth-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-teal-700">Sexo *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-teal-300" data-testid="select-gender">
                              <SelectValue placeholder="Selecione o sexo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="feminino">Feminino</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="motherName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-teal-700">
                            <Users className="h-4 w-4" />
                            Nome da Mãe *
                          </FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Nome completo da mãe" className="border-teal-300" data-testid="input-mother-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Newborn Data Section for newbornOnly mode */}
            {isNewbornOnlyMode && (
              <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                <h3 className="text-lg font-medium text-teal-900 mb-4 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Dados do Recém-Nascido
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="newbornStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-teal-700">Situação do RN</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-newborn-status" className="border-teal-300">
                                <SelectValue placeholder="Selecione a situação" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="uti">UTI Neonatal</SelectItem>
                              <SelectItem value="uci">UCI Neonatal</SelectItem>
                              <SelectItem value="alojamento_conjunto">Alojamento Conjunto</SelectItem>
                              <SelectItem value="alta">Alta</SelectItem>
                              <SelectItem value="obito">Óbito</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="skinColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-teal-700">Cor</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-skin-color" className="border-teal-300">
                                <SelectValue placeholder="Selecione a cor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="branca">Branca</SelectItem>
                              <SelectItem value="parda">Parda</SelectItem>
                              <SelectItem value="preta">Preta</SelectItem>
                              <SelectItem value="amarela">Amarela</SelectItem>
                              <SelectItem value="indigena">Indígena</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="birthWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-teal-700">
                            <Scale className="h-4 w-4" />
                            Peso ao Nascer (Kg)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ""} 
                              placeholder="Ex: 3.250" 
                              className="border-teal-300"
                              data-testid="input-birth-weight" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="isTwin"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0 bg-white p-3 rounded-lg border border-teal-200">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                              className="border-teal-400 data-[state=checked]:bg-teal-600"
                              data-testid="checkbox-is-twin"
                            />
                          </FormControl>
                          <FormLabel className="text-sm text-teal-700 cursor-pointer">Gemelar</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isPremature"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0 bg-white p-3 rounded-lg border border-teal-200">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                              className="border-teal-400 data-[state=checked]:bg-teal-600"
                              data-testid="checkbox-is-premature"
                            />
                          </FormControl>
                          <FormLabel className="text-sm text-teal-700 cursor-pointer">Prematuro</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hadTransfusion"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0 bg-white p-3 rounded-lg border border-teal-200">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                              className="border-teal-400 data-[state=checked]:bg-teal-600"
                              data-testid="checkbox-had-transfusion"
                            />
                          </FormControl>
                          <FormLabel className="text-sm text-teal-700 cursor-pointer">Transfusão</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gestationalAge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-teal-700">Idade Gestacional (semanas)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ""} 
                              placeholder="Ex: 38" 
                              className="border-teal-300"
                              data-testid="input-gestational-age" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="breastfeeding"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-teal-700">Leite Materno</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-breastfeeding" className="border-teal-300">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="exclusivo">Exclusivo</SelectItem>
                              <SelectItem value="misto">Misto</SelectItem>
                              <SelectItem value="nao">Não</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="otherFeeding"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-teal-700">Outra Alimentação</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ""} 
                              placeholder="Ex: Fórmula, Sonda" 
                              className="border-teal-300"
                              data-testid="input-other-feeding" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="antibioticGiven"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-teal-700">
                            <Stethoscope className="h-4 w-4" />
                            Antibiótico
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ""} 
                              placeholder="Medicamento administrado" 
                              className="border-teal-300"
                              data-testid="input-antibiotic" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="transfusionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-teal-700">Data da Transfusão</FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              {...field} 
                              value={field.value || ""} 
                              className="border-teal-300"
                              data-testid="input-transfusion-date" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="referenceDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-teal-700">Data de Referência</FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              {...field} 
                              value={field.value || ""} 
                              className="border-teal-300"
                              data-testid="input-reference-date" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="newbornObservation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-teal-700">Observação do RN</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value || ""} 
                            placeholder="Observações sobre o recém-nascido..." 
                            className="border-teal-300 min-h-[80px]"
                            data-testid="textarea-newborn-observation" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Simplified Personal Info for PcD Only Mode */}
            {isPcdOnlyMode && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-lg font-medium text-purple-900 mb-4 flex items-center gap-2">
                  <Accessibility className="h-4 w-4" />
                  Identificação do Paciente PcD
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-purple-700">
                            <User className="h-4 w-4" />
                            Nome Completo *
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nome completo do paciente" className="border-purple-300" data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-purple-700">
                          <CreditCard className="h-4 w-4" />
                          CPF *
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="000.000.000-00"
                            onChange={(e) => handleCPFChange(e.target.value, field.onChange)}
                            className="border-purple-300"
                            data-testid="input-cpf"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-purple-700">
                          <Calendar className="h-4 w-4" />
                          Data de Nascimento *
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="border-purple-300" data-testid="input-birth-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-purple-700">Sexo *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-purple-300" data-testid="select-gender">
                              <SelectValue placeholder="Selecione o sexo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="feminino">Feminino</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-purple-700">
                          <Phone className="h-4 w-4" />
                          WhatsApp *
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="(87) 99999-9999"
                            onChange={(e) => handleWhatsAppChange(e.target.value, field.onChange)}
                            className="border-purple-300"
                            data-testid="input-whatsapp"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="susCard"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-purple-700">
                          <CreditCard className="h-4 w-4" />
                          Cartão SUS *
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="000 0000 0000 0000"
                            onChange={(e) => handleSUSCardChange(e.target.value, field.onChange)}
                            className="border-purple-300"
                            data-testid="input-sus-card"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-purple-700">
                          <CreditCard className="h-4 w-4" />
                          RG *
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Número do RG" className="border-purple-300" data-testid="input-rg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="motherName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-purple-700">
                          <Users className="h-4 w-4" />
                          Nome da Mãe
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Nome completo da mãe" className="border-purple-300" data-testid="input-mother-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-purple-700">
                            <Home className="h-4 w-4" />
                            Endereço *
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Rua, Avenida, etc." className="border-purple-300" data-testid="input-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="addressNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-purple-700">Número *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nº" className="border-purple-300" data-testid="input-address-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="neighborhood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-purple-700">Bairro *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do bairro" className="border-purple-300" data-testid="input-neighborhood" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-purple-700">Cidade *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome da cidade" className="border-purple-300" data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-purple-700">UF *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-purple-300" data-testid="select-state">
                              <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {brazilianStates.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
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
                    name="zoneType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-purple-700">Zona *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-purple-300" data-testid="select-zone-type">
                              <SelectValue placeholder="Selecione a zona" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="urbana">Zona Urbana</SelectItem>
                            <SelectItem value="rural">Zona Rural</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Accordion Menu Layout for Full Mode */}
            {!isNewbornOnlyMode && !isPcdOnlyMode && (
            <Accordion type="multiple" defaultValue={["personal", "health"]} className="space-y-2">
              
              {/* Personal Information Menu Item */}
              <AccordionItem value="personal" className="border rounded-lg overflow-hidden bg-white shadow-sm">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 [&[data-state=open]]:bg-gray-100">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Informações Pessoais</span>
                      <p className="text-xs text-gray-500">Nome, CPF, RG, Cartão SUS, contatos</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Nome Completo *
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome completo do paciente" data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        CPF *
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="000.000.000-00"
                          onChange={(e) => handleCPFChange(e.target.value, field.onChange)}
                          data-testid="input-cpf"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        RG
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Número do RG" data-testid="input-rg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rgIssuingAgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Órgão Expedidor RG
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Ex: SSP, DETRAN" data-testid="input-rg-issuing-agency" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Data de Nascimento *
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-birth-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sexo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue placeholder="Selecione o sexo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="race"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raça/Cor *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-race">
                            <SelectValue placeholder="Selecione a raça/cor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="branca">Branca</SelectItem>
                          <SelectItem value="preta">Preta</SelectItem>
                          <SelectItem value="parda">Parda</SelectItem>
                          <SelectItem value="amarela">Amarela (origem asiática)</SelectItem>
                          <SelectItem value="indigena">Indígena</SelectItem>
                          <SelectItem value="ignorado">Ignorado / Não informado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="motherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Nome da Mãe
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Nome completo da mãe" data-testid="input-mother-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="susCard"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cartão SUS *
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="000 0000 0000 0000"
                          onChange={(e) => handleSUSCardChange(e.target.value, field.onChange)}
                          data-testid="input-sus-card"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="email" placeholder="email@exemplo.com" data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Telefone *
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="(87) 99999-9999"
                            onChange={(e) => handleWhatsAppChange(e.target.value, field.onChange)}
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneIsWhatsapp"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value ?? true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-phone-is-whatsapp"
                          />
                        </FormControl>
                        <FormLabel className="text-sm cursor-pointer">Este telefone é WhatsApp</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Professional Information Menu Item */}
              <AccordionItem value="professional" className="border rounded-lg overflow-hidden bg-white shadow-sm">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 [&[data-state=open]]:bg-purple-50">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Informações Profissionais</span>
                      <p className="text-xs text-gray-500">Profissão e ocupação</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2 bg-purple-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Profissão
                      </FormLabel>
                      <Popover open={showProfessionDropdown} onOpenChange={setShowProfessionDropdown}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={showProfessionDropdown}
                              className={cn(
                                "w-full justify-between font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="input-profession"
                            >
                              {field.value || "Selecione ou digite..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Buscar profissão..." 
                              value={professionInputValue}
                              onValueChange={setProfessionInputValue}
                            />
                            <CommandList>
                              <CommandEmpty>
                                <div className="p-2 text-sm">
                                  <p>Nenhuma profissão encontrada.</p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 w-full"
                                    onClick={() => {
                                      field.onChange(professionInputValue);
                                      setShowProfessionDropdown(false);
                                    }}
                                  >
                                    Usar "{professionInputValue}"
                                  </Button>
                                </div>
                              </CommandEmpty>
                              <CommandGroup>
                                {professionsList.map((profession) => (
                                  <CommandItem
                                    key={profession}
                                    value={profession}
                                    onSelect={(currentValue) => {
                                      field.onChange(currentValue);
                                      setProfessionInputValue("");
                                      setShowProfessionDropdown(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === profession ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {profession}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Ocupação
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Ex: Ativo, Aposentado" data-testid="input-occupation" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Complementary Information Menu Item */}
              <AccordionItem value="complementary" className="border rounded-lg overflow-hidden bg-white shadow-sm">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 [&[data-state=open]]:bg-amber-50">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Informações Complementares</span>
                      <p className="text-xs text-gray-500">Pai, religião, raça, escolaridade</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2 bg-amber-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="fatherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Nome do Pai
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Nome completo do pai" data-testid="input-father-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="religion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Religião</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-religion">
                            <SelectValue placeholder="Selecione a religião" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="catolica">Católica</SelectItem>
                          <SelectItem value="evangelica">Evangélica</SelectItem>
                          <SelectItem value="espirita">Espírita</SelectItem>
                          <SelectItem value="umbanda">Umbanda</SelectItem>
                          <SelectItem value="candomble">Candomblé</SelectItem>
                          <SelectItem value="judaica">Judaica</SelectItem>
                          <SelectItem value="islamica">Islâmica</SelectItem>
                          <SelectItem value="budista">Budista</SelectItem>
                          <SelectItem value="sem_religiao">Sem Religião</SelectItem>
                          <SelectItem value="outra">Outra</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instrução/Escolaridade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-education">
                            <SelectValue placeholder="Selecione a escolaridade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="nao_alfabetizado">Não Alfabetizado</SelectItem>
                          <SelectItem value="fundamental_incompleto">Fundamental Incompleto</SelectItem>
                          <SelectItem value="fundamental_completo">Fundamental Completo</SelectItem>
                          <SelectItem value="medio_incompleto">Médio Incompleto</SelectItem>
                          <SelectItem value="medio_completo">Médio Completo</SelectItem>
                          <SelectItem value="superior_incompleto">Superior Incompleto</SelectItem>
                          <SelectItem value="superior_completo">Superior Completo</SelectItem>
                          <SelectItem value="pos_graduacao">Pós-Graduação</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nacionalidade</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Ex: Brasileira" data-testid="input-nationality" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthPlace"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Natural de</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Cidade/Estado de nascimento" data-testid="input-birth-place" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Address Menu Item */}
              <AccordionItem value="address" className="border rounded-lg overflow-hidden bg-white shadow-sm">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 [&[data-state=open]]:bg-green-50">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Endereço</span>
                      <p className="text-xs text-gray-500">Rua, bairro, cidade, estado</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2 bg-green-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          Endereço *
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Rua, Avenida, etc." data-testid="input-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="addressNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nº" data-testid="input-address-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome do bairro" data-testid="input-neighborhood" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zoneType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zona *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-zone-type">
                            <SelectValue placeholder="Selecione a zona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="urbana">Zona Urbana</SelectItem>
                          <SelectItem value="rural">Zona Rural</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome da cidade" data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-state">
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brazilianStates.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            )}

            {/* Hidden sections - RN and PcD are now only available when editing existing patients with these flags */}

            {/* Hidden PcD section - only shown when editing existing PcD patients */}
            {showPcdSection && formMode === "full" && !isPcdOnlyMode && (
              <div className="hidden">
                {/* PcD data is preserved but hidden in the full form mode */}
                <FormField
                  control={form.control}
                  name="disabilityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="hidden" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="disabilityDegree"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="hidden" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* PcD Section for pcdOnly mode */}
            {isPcdOnlyMode && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-lg font-medium text-purple-900 mb-4 flex items-center gap-2">
                  <Accessibility className="h-4 w-4" />
                  Dados da Deficiência
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="disabilityType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-purple-700">Tipo de Deficiência *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-disability-type" className="border-purple-300">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="visual">Visual</SelectItem>
                              <SelectItem value="auditiva">Auditiva</SelectItem>
                              <SelectItem value="fisica">Física</SelectItem>
                              <SelectItem value="intelectual">Intelectual</SelectItem>
                              <SelectItem value="multipla">Múltipla</SelectItem>
                              <SelectItem value="psicossocial">Psicossocial</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="disabilityDegree"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-purple-700">Grau *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-disability-degree" className="border-purple-300">
                                <SelectValue placeholder="Selecione o grau" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="leve">Leve</SelectItem>
                              <SelectItem value="moderado">Moderado</SelectItem>
                              <SelectItem value="severo">Severo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="disabilityCid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-purple-700">CID Relacionado</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ""} 
                              placeholder="Ex: H54.0, F70" 
                              className="border-purple-300"
                              data-testid="input-disability-cid" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="needsPermanentCompanion"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0 bg-white p-3 rounded-lg border border-purple-200">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                              className="border-purple-400 data-[state=checked]:bg-purple-600"
                              data-testid="checkbox-needs-companion"
                            />
                          </FormControl>
                          <FormLabel className="text-sm text-purple-700 cursor-pointer">Acompanhante Permanente</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hasBpcLoas"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0 bg-white p-3 rounded-lg border border-purple-200">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                              className="border-purple-400 data-[state=checked]:bg-purple-600"
                              data-testid="checkbox-has-bpc-loas"
                            />
                          </FormControl>
                          <FormLabel className="text-sm text-purple-700 cursor-pointer">Beneficiário BPC/LOAS</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="accessibilityResources"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-purple-700">Recursos de Acessibilidade</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ""} 
                            placeholder="Ex: Cadeira de rodas, Intérprete de Libras, Cão-guia" 
                            className="border-purple-300"
                            data-testid="input-accessibility-resources" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pcdObservation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-purple-700">Observações sobre a Deficiência</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value || ""} 
                            placeholder="Observações adicionais sobre a condição do paciente..." 
                            className="border-purple-300 min-h-[80px]"
                            data-testid="textarea-pcd-observation" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={createPatientMutation.isPending}
              className={`w-full ${isNewbornOnlyMode ? 'bg-teal-600 hover:bg-teal-700' : isPcdOnlyMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              data-testid="button-submit-patient"
            >
              {createPatientMutation.isPending ? "Salvando..." : submitLabel}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}