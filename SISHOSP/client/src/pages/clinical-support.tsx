import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Search, AlertTriangle, BookOpen, Calculator, Pill, FileText, ChevronRight, ArrowLeft, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import {
  searchCID10,
  checkDrugInteractions,
  searchProtocols,
  CLINICAL_PROTOCOLS,
  MEDICAL_CALCULATORS,
  type CID10,
  type DrugInteraction,
  type ClinicalProtocol,
  type MedicalCalculator
} from "@/../../shared/clinical-support";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";

export default function ClinicalSupport() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("cid10");

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={hospitalLogo} 
                alt="Exu Saúde - Sistema de Atendimento Médico" 
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Suporte à Decisão Clínica</h1>
                <p className="text-gray-600">Ferramentas para auxiliar na prática médica</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setLocation('/')}
                variant="outline"
                data-testid="button-back-home"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="cid10" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              CID-10
            </TabsTrigger>
            <TabsTrigger value="interactions" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Interações
            </TabsTrigger>
            <TabsTrigger value="protocols" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Protocolos
            </TabsTrigger>
            <TabsTrigger value="calculators" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Calculadoras
            </TabsTrigger>
          </TabsList>

          {/* CID-10 Search */}
          <TabsContent value="cid10">
            <CID10SearchComponent />
          </TabsContent>

          {/* Drug Interactions */}
          <TabsContent value="interactions">
            <DrugInteractionChecker />
          </TabsContent>

          {/* Clinical Protocols */}
          <TabsContent value="protocols">
            <ClinicalProtocolsLibrary />
          </TabsContent>

          {/* Medical Calculators */}
          <TabsContent value="calculators">
            <MedicalCalculatorsComponent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CID10SearchComponent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCID, setSelectedCID] = useState<CID10 | null>(null);
  const [searchResults, setSearchResults] = useState<CID10[]>([]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = searchCID10(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectCID = (cid: CID10) => {
    setSelectedCID(cid);
    setSearchQuery(`${cid.code} - ${cid.description}`);
    setSearchResults([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Busca de Códigos CID-10
        </CardTitle>
        <CardDescription>
          Pesquise diagnósticos pela descrição ou código. Base com 120+ códigos mais comuns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Input
            placeholder="Digite o código (ex: I10) ou descrição (ex: hipertensão)..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="text-lg"
            data-testid="input-cid10-search"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
              {searchResults.map((cid) => (
                <button
                  key={cid.code}
                  onClick={() => handleSelectCID(cid)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                  data-testid={`option-cid-${cid.code}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-blue-600">{cid.code}</span>
                      <span className="ml-2 text-gray-900">{cid.description}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {cid.category}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedCID && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Código Selecionado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-700 font-medium">Código:</span>
                <span className="font-bold text-blue-900 text-lg">{selectedCID.code}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm text-blue-700 font-medium">Descrição:</span>
                <span className="text-blue-900">{selectedCID.description}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-700 font-medium">Categoria:</span>
                <Badge className="bg-blue-600">{selectedCID.category}</Badge>
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(`${selectedCID.code} - ${selectedCID.description}`);
                }}
                variant="outline"
                size="sm"
                className="mt-2"
                data-testid="button-copy-cid"
              >
                <FileText className="h-4 w-4 mr-2" />
                Copiar para Prontuário
              </Button>
            </CardContent>
          </Card>
        )}

        <Alert>
          <AlertDescription className="text-sm">
            💡 <strong>Dica:</strong> Este sistema contém os códigos CID-10 mais comuns na prática clínica brasileira.
            Para códigos específicos não listados, consulte o manual completo do CID-10.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function DrugInteractionChecker() {
  const [medications, setMedications] = useState<string[]>([]);
  const [currentMed, setCurrentMed] = useState("");
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);

  const addMedication = () => {
    if (currentMed.trim()) {
      const newMeds = [...medications, currentMed.trim()];
      setMedications(newMeds);
      setCurrentMed("");
      
      const foundInteractions = checkDrugInteractions(newMeds);
      setInteractions(foundInteractions);
    }
  };

  const removeMedication = (index: number) => {
    const newMeds = medications.filter((_, i) => i !== index);
    setMedications(newMeds);
    
    const foundInteractions = checkDrugInteractions(newMeds);
    setInteractions(foundInteractions);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'grave': return 'bg-red-100 text-red-800 border-red-300';
      case 'moderada': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'leve': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input de Medicamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medicamentos em Uso
          </CardTitle>
          <CardDescription>
            Adicione os medicamentos que o paciente está usando
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Digite o nome do medicamento..."
              value={currentMed}
              onChange={(e) => setCurrentMed(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addMedication()}
              data-testid="input-medication"
            />
            <Button onClick={addMedication} data-testid="button-add-medication">
              Adicionar
            </Button>
          </div>

          {medications.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Medicamentos adicionados:</Label>
              <div className="space-y-2">
                {medications.map((med, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                  >
                    <span className="font-medium">{med}</span>
                    <Button
                      onClick={() => removeMedication(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`button-remove-medication-${index}`}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {medications.length === 0 && (
            <Alert>
              <AlertDescription className="text-sm">
                Adicione pelo menos 2 medicamentos para verificar interações
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Resultados de Interações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Interações Encontradas
          </CardTitle>
          <CardDescription>
            {interactions.length === 0 && medications.length >= 2
              ? "Nenhuma interação conhecida detectada ✓"
              : interactions.length === 0
              ? "Aguardando medicamentos..."
              : `${interactions.length} interação(ões) detectada(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {interactions.length === 0 && medications.length >= 2 && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                ✓ Nenhuma interação medicamentosa conhecida foi detectada entre os medicamentos listados.
                Continue monitorando o paciente para efeitos adversos.
              </AlertDescription>
            </Alert>
          )}

          {interactions.map((interaction, index) => (
            <Card
              key={index}
              className={`${getSeverityColor(interaction.severity)} border-2`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {interaction.drug1} + {interaction.drug2}
                  </CardTitle>
                  <Badge
                    variant={interaction.severity === 'grave' ? 'destructive' : 'default'}
                    className="uppercase"
                  >
                    {interaction.severity}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold uppercase">Descrição:</Label>
                  <p className="text-sm mt-1">{interaction.description}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs font-semibold uppercase">Conduta Recomendada:</Label>
                  <p className="text-sm mt-1 font-medium">{interaction.management}</p>
                </div>
              </CardContent>
            </Card>
          ))}

          {medications.length < 2 && (
            <Alert>
              <AlertDescription className="text-sm">
                💡 <strong>Como usar:</strong> Adicione os medicamentos que o paciente está usando.
                O sistema verificará automaticamente interações conhecidas.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClinicalProtocolsLibrary() {
  const [selectedProtocol, setSelectedProtocol] = useState<ClinicalProtocol | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProtocols, setFilteredProtocols] = useState<ClinicalProtocol[]>(CLINICAL_PROTOCOLS);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = searchProtocols(query);
      setFilteredProtocols(results);
    } else {
      setFilteredProtocols(CLINICAL_PROTOCOLS);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Lista de Protocolos */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Protocolos Disponíveis</CardTitle>
            <div className="pt-2">
              <Input
                placeholder="Buscar protocolo..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                data-testid="input-protocol-search"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredProtocols.map((protocol) => (
                <button
                  key={protocol.id}
                  onClick={() => setSelectedProtocol(protocol)}
                  className={`w-full text-left p-4 hover:bg-blue-50 transition-colors ${
                    selectedProtocol?.id === protocol.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                  data-testid={`button-protocol-${protocol.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{protocol.condition}</h4>
                      <p className="text-sm text-gray-600 mt-1">{protocol.specialty}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes do Protocolo */}
      <div className="lg:col-span-2">
        {selectedProtocol ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedProtocol.name}</CardTitle>
                  <CardDescription className="mt-2">
                    <Badge className="mr-2">{selectedProtocol.specialty}</Badge>
                    <span className="text-blue-600 font-medium">{selectedProtocol.diagnosis}</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sintomas */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <div className="h-1 w-1 bg-blue-600 rounded-full"></div>
                  Sintomas/Quadro Clínico
                </h3>
                <ul className="grid grid-cols-2 gap-2">
                  {selectedProtocol.symptoms.map((symptom, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <ChevronRight className="h-4 w-4 text-blue-600" />
                      {symptom}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              {/* Tratamento */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <div className="h-1 w-1 bg-green-600 rounded-full"></div>
                  Tratamento
                </h3>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap font-sans">{selectedProtocol.treatment}</pre>
                </div>
              </div>

              <Separator />

              {/* Medicações */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <div className="h-1 w-1 bg-purple-600 rounded-full"></div>
                  Medicações Comuns
                </h3>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <pre className="text-sm whitespace-pre-wrap font-sans text-purple-900">{selectedProtocol.medications}</pre>
                </div>
              </div>

              <Separator />

              {/* Acompanhamento */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <div className="h-1 w-1 bg-blue-600 rounded-full"></div>
                  Acompanhamento
                </h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <pre className="text-sm whitespace-pre-wrap font-sans text-blue-900">{selectedProtocol.followUp}</pre>
                </div>
              </div>

              {/* Red Flags */}
              {selectedProtocol.redFlags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      Sinais de Alarme (Encaminhar Urgência)
                    </h3>
                    <div className="bg-red-50 p-4 rounded-lg border-2 border-red-300">
                      <ul className="space-y-2">
                        {selectedProtocol.redFlags.map((flag, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-red-900">
                            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <span className="font-medium">{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-4 flex gap-2">
                <Button
                  onClick={() => {
                    const text = `PROTOCOLO: ${selectedProtocol.name}\n\n` +
                      `DIAGNÓSTICO: ${selectedProtocol.diagnosis}\n\n` +
                      `TRATAMENTO:\n${selectedProtocol.treatment}\n\n` +
                      `MEDICAÇÕES:\n${selectedProtocol.medications}\n\n` +
                      `ACOMPANHAMENTO:\n${selectedProtocol.followUp}`;
                    navigator.clipboard.writeText(text);
                  }}
                  data-testid="button-copy-protocol"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Copiar Protocolo
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                Selecione um protocolo à esquerda para visualizar os detalhes
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function MedicalCalculatorsComponent() {
  const [selectedCalculator, setSelectedCalculator] = useState<MedicalCalculator | null>(null);
  const [inputs, setInputs] = useState<Record<string, number | string>>({});
  const [result, setResult] = useState<{result: string | number; interpretation: string; category?: string} | null>(null);

  const handleSelectCalculator = (calc: MedicalCalculator) => {
    setSelectedCalculator(calc);
    setInputs({});
    setResult(null);
  };

  const handleInputChange = (name: string, value: string | number) => {
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleCalculate = () => {
    if (selectedCalculator) {
      const calculationResult = selectedCalculator.calculate(inputs);
      setResult(calculationResult);
    }
  };

  const isFormValid = () => {
    if (!selectedCalculator) return false;
    return selectedCalculator.inputs.every(input => {
      const value = inputs[input.name];
      return value !== undefined && value !== '';
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Lista de Calculadoras */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Calculadoras Disponíveis</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {MEDICAL_CALCULATORS.map((calc) => (
                <button
                  key={calc.id}
                  onClick={() => handleSelectCalculator(calc)}
                  className={`w-full text-left p-4 hover:bg-blue-50 transition-colors ${
                    selectedCalculator?.id === calc.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                  data-testid={`button-calculator-${calc.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{calc.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{calc.category}</p>
                      <p className="text-sm text-gray-700 mt-2">{calc.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulário da Calculadora */}
      <div className="lg:col-span-2">
        {selectedCalculator ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{selectedCalculator.name}</CardTitle>
              <CardDescription>
                <Badge className="mr-2">{selectedCalculator.category}</Badge>
                {selectedCalculator.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedCalculator.inputs.map((input) => (
                  <div key={input.name} className="space-y-2">
                    <Label htmlFor={input.name}>
                      {input.label}
                      {input.unit && <span className="text-gray-500 ml-1">({input.unit})</span>}
                    </Label>
                    {input.type === 'number' ? (
                      <Input
                        id={input.name}
                        type="number"
                        placeholder={`Digite ${input.label.toLowerCase()}...`}
                        value={inputs[input.name] || ''}
                        onChange={(e) => handleInputChange(input.name, e.target.value)}
                        min={input.min}
                        max={input.max}
                        step="0.1"
                        data-testid={`input-${input.name}`}
                      />
                    ) : (
                      <Select
                        value={inputs[input.name] as string || ''}
                        onValueChange={(value) => handleInputChange(input.name, value)}
                      >
                        <SelectTrigger data-testid={`select-${input.name}`}>
                          <SelectValue placeholder={`Selecione...`} />
                        </SelectTrigger>
                        <SelectContent>
                          {input.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={handleCalculate}
                disabled={!isFormValid()}
                className="w-full"
                size="lg"
                data-testid="button-calculate"
              >
                <Calculator className="h-5 w-5 mr-2" />
                Calcular
              </Button>

              {/* Resultado */}
              {result && (
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300">
                  <CardHeader>
                    <CardTitle className="text-blue-900">Resultado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center">
                          <span className="text-3xl font-bold text-white">{result.result}</span>
                        </div>
                      </div>
                      {result.category && (
                        <div>
                          <Label className="text-sm text-blue-700">Classificação:</Label>
                          <Badge className="mt-1 bg-blue-600 text-white text-base px-3 py-1">
                            {result.category}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-sm text-blue-700 font-semibold">Interpretação:</Label>
                      <div className="mt-2 p-4 bg-white rounded-lg border border-blue-200">
                        <pre className="text-sm whitespace-pre-wrap font-sans text-gray-900">
                          {result.interpretation}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center py-12">
              <Calculator className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                Selecione uma calculadora à esquerda para começar
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
