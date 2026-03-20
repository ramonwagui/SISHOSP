import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  Lightbulb, 
  AlertTriangle, 
  Check, 
  Info, 
  Pill,
  Search,
  Plus,
  X,
  Sparkles
} from "lucide-react";
import { 
  searchMedications,
  suggestMedicationsByCID,
  type Medication 
} from "@/../../shared/medications-database";
import { 
  searchCID10,
  checkDrugInteractions,
  type CID10, 
  type DrugInteraction 
} from "@/../../shared/clinical-support";

interface SmartDiagnosisInputProps {
  value: string;
  onChange: (value: string, cid?: CID10) => void;
  onCIDSelected?: (cid: CID10) => void;
}

export function SmartDiagnosisInput({ value, onChange, onCIDSelected }: SmartDiagnosisInputProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [searchResults, setSearchResults] = useState<CID10[]>([]);
  const [selectedCID, setSelectedCID] = useState<CID10 | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onChange(query);
    
    if (query.length >= 2) {
      const results = searchCID10(query);
      setSearchResults(results);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSelectCID = (cid: CID10) => {
    const diagnosisText = `${cid.description} (CID ${cid.code})`;
    setSearchQuery(diagnosisText);
    onChange(diagnosisText, cid);
    setSelectedCID(cid);
    setSearchResults([]);
    setShowResults(false);
    if (onCIDSelected) {
      onCIDSelected(cid);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Digite o diagnóstico ou busque pelo CID-10..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className="pl-10"
            data-testid="input-smart-diagnosis"
          />
        </div>
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
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
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
          <Check className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-900">
            CID-10 selecionado: <strong>{selectedCID.code}</strong> - {selectedCID.description}
          </span>
        </div>
      )}
    </div>
  );
}

interface SmartMedicationInputProps {
  medications: string[];
  onMedicationsChange: (medications: string[]) => void;
  selectedCID?: CID10 | null;
}

export function SmartMedicationInput({ 
  medications, 
  onMedicationsChange,
  selectedCID 
}: SmartMedicationInputProps) {
  const [currentMed, setCurrentMed] = useState("");
  const [searchResults, setSearchResults] = useState<Medication[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [selectedMedDetail, setSelectedMedDetail] = useState<Medication | null>(null);
  const [suggestedMeds, setSuggestedMeds] = useState<Medication[]>([]);

  useEffect(() => {
    if (medications.length >= 2) {
      const foundInteractions = checkDrugInteractions(medications);
      setInteractions(foundInteractions);
    } else {
      setInteractions([]);
    }
  }, [medications]);

  useEffect(() => {
    if (selectedCID) {
      const suggestions = suggestMedicationsByCID(selectedCID.code);
      setSuggestedMeds(suggestions);
    } else {
      setSuggestedMeds([]);
    }
  }, [selectedCID]);

  const handleSearch = (query: string) => {
    setCurrentMed(query);
    
    if (query.length >= 2) {
      const results = searchMedications(query);
      setSearchResults(results);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const addMedication = (medName: string) => {
    if (medName.trim() && !medications.includes(medName.trim())) {
      onMedicationsChange([...medications, medName.trim()]);
      setCurrentMed("");
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSelectMedication = (med: Medication) => {
    setSelectedMedDetail(med);
    setShowResults(false);
  };

  const handleAddSelectedMedication = (dose: string) => {
    if (selectedMedDetail) {
      const prescriptionText = `${selectedMedDetail.name} ${dose}`;
      addMedication(prescriptionText);
      setSelectedMedDetail(null);
      setCurrentMed("");
    }
  };

  const removeMedication = (index: number) => {
    onMedicationsChange(medications.filter((_, i) => i !== index));
  };

  const addSuggestedMedication = (med: Medication, dose: string) => {
    const prescriptionText = `${med.name} ${dose}`;
    addMedication(prescriptionText);
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
    <div className="space-y-4">
      {/* Sugestões baseadas no diagnóstico */}
      {suggestedMeds.length > 0 && (
        <Alert className="bg-indigo-50 border-indigo-200">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold text-indigo-900">
                Medicamentos sugeridos para {selectedCID?.description}:
              </p>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {suggestedMeds.slice(0, 3).map((med) => (
                  <div key={med.name} className="flex items-center justify-between p-2 bg-white rounded border border-indigo-200">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{med.name}</p>
                      <p className="text-xs text-gray-600">{med.category}</p>
                    </div>
                    <div className="flex gap-1">
                      {med.commonDoses.slice(0, 2).map((dose, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant="outline"
                          onClick={() => addSuggestedMedication(med, dose)}
                          className="text-xs"
                          data-testid={`button-add-suggested-${med.name}-${idx}`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {dose}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Campo de busca */}
      <div className="relative">
        <div className="relative">
          <Pill className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Digite o nome do medicamento..."
            value={currentMed}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addMedication(currentMed)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className="pl-10"
            data-testid="input-medication-search"
          />
        </div>
        
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            {searchResults.map((med) => (
              <button
                key={med.name}
                onClick={() => handleSelectMedication(med)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                data-testid={`option-medication-${med.name}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{med.name}</p>
                    <p className="text-sm text-gray-600">{med.genericName} • {med.category}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {med.commonDoses.slice(0, 2).map((dose, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {dose}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Info className="h-4 w-4 text-blue-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detalhes do medicamento selecionado */}
      {selectedMedDetail && (
        <Card className="border-2 border-blue-300 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{selectedMedDetail.name}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMedDetail(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              {selectedMedDetail.genericName} • {selectedMedDetail.category}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-blue-900">Doses Comuns:</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedMedDetail.commonDoses.map((dose, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    onClick={() => handleAddSelectedMedication(dose)}
                    data-testid={`button-add-dose-${idx}`}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {dose}
                  </Button>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <Label className="text-xs font-semibold">Indicações:</Label>
                <ul className="list-disc list-inside mt-1 text-gray-700">
                  {selectedMedDetail.indications.slice(0, 3).map((ind, idx) => (
                    <li key={idx}>{ind}</li>
                  ))}
                </ul>
              </div>
              <div>
                <Label className="text-xs font-semibold">Contraindicações:</Label>
                <ul className="list-disc list-inside mt-1 text-gray-700">
                  {selectedMedDetail.contraindications.slice(0, 3).map((contra, idx) => (
                    <li key={idx}>{contra}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            {selectedMedDetail.pregnancyCategory && (
              <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                <p className="text-xs">
                  <strong>Gravidez:</strong> Categoria {selectedMedDetail.pregnancyCategory}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de medicamentos adicionados */}
      {medications.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Medicamentos Prescritos:</Label>
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
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas de interações medicamentosas */}
      {interactions.length > 0 && (
        <Alert className="bg-red-50 border-red-300">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-semibold text-red-900">
                ⚠️ {interactions.length} interação(ões) medicamentosa(s) detectada(s)!
              </p>
              {interactions.map((interaction, idx) => (
                <Card key={idx} className={`${getSeverityColor(interaction.severity)} border-2`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">
                        {interaction.drug1} + {interaction.drug2}
                      </p>
                      <Badge variant={interaction.severity === 'grave' ? 'destructive' : 'default'} className="uppercase">
                        {interaction.severity}
                      </Badge>
                    </div>
                    <p className="text-xs mb-2">{interaction.description}</p>
                    <div className="p-2 bg-white/50 rounded">
                      <p className="text-xs font-semibold">Conduta:</p>
                      <p className="text-xs">{interaction.management}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
