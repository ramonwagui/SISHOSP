import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertLegacyAppointmentSchema, type InsertLegacyAppointment, type Specialty, type Patient } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { formatCPF, formatSUSCard, formatWhatsApp, validateCPF } from "@/lib/utils";
import { getAvailableTimeSlots, getMinimumDate, getMaximumDate } from "@/lib/google-calendar";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, RotateCcw, User, CreditCard, Phone, Stethoscope, Calendar, Clock, FileText, Search, MapPin, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const appointmentFormSchema = insertLegacyAppointmentSchema.extend({
  patientCpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve estar no formato 000.000.000-00").refine(validateCPF, {
    message: "CPF inválido",
  }),
});

export default function AppointmentForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");

  const form = useForm<InsertLegacyAppointment>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientName: "",
      patientCpf: "",
      patientRg: "",
      patientBirthDate: "",
      patientGender: "masculino",
      patientSusCard: "",
      patientWhatsapp: "",
      patientAddress: "",
      patientAddressNumber: "",
      patientNeighborhood: "",
      patientZoneType: "urbana",
      patientCity: "",
      patientState: "PE",
      specialtyId: "",
      appointmentDate: "",
      appointmentTime: "",
      reason: "",
      status: "scheduled",
    },
  });

  // Fetch specialties
  const { data: specialties = [], isLoading: specialtiesLoading } = useQuery<Specialty[]>({
    queryKey: ["/api/specialties"],
  });

  // Fetch patients for autocomplete
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: InsertLegacyAppointment) => {
      return await apiRequest("/api/appointments", {
        method: "POST",
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Agendamento realizado com sucesso!",
        description: "Consulta agendada! O sistema sincronizará com Google Calendar e enviará confirmação por email (se configurado).",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao agendar consulta",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertLegacyAppointment) => {
    createAppointmentMutation.mutate(data);
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

  return (
    <Card className="bg-white rounded-2xl shadow-lg border border-gray-100">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl">
        <CardTitle className="text-xl font-semibold">Dados do Paciente</CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Patient Search Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Buscar Paciente Cadastrado
              </h3>
              <div className="space-y-4">
                <Input
                  placeholder="Digite nome ou CPF do paciente para buscar..."
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  data-testid="input-search-patient"
                />
                {patientSearchTerm && (
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {patients
                      .filter(patient => 
                        patient.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
                        patient.cpf.includes(patientSearchTerm)
                      )
                      .slice(0, 5)
                      .map(patient => (
                        <Button
                          key={patient.id}
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setPatientSearchTerm("");
                            form.setValue("patientName", patient.name);
                            form.setValue("patientCpf", patient.cpf);
                            form.setValue("patientRg", patient.rg);
                            form.setValue("patientBirthDate", patient.birthDate);
                            form.setValue("patientGender", patient.gender as "masculino" | "feminino");
                            form.setValue("patientSusCard", patient.susCard);
                            form.setValue("patientWhatsapp", patient.whatsapp);
                            form.setValue("patientAddress", patient.address);
                            form.setValue("patientAddressNumber", patient.addressNumber);
                            form.setValue("patientNeighborhood", patient.neighborhood);
                            form.setValue("patientZoneType", patient.zoneType as "urbana" | "rural");
                            form.setValue("patientCity", patient.city);
                            form.setValue("patientState", patient.state);
                          }}
                          data-testid={`button-select-patient-${patient.id}`}
                        >
                          <div>
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-sm text-gray-500">{formatCPF(patient.cpf)}</p>
                          </div>
                        </Button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="patientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                        <User className="inline mr-2 h-4 w-4 text-blue-600" />
                        Nome Completo * {selectedPatient && <span className="text-green-600">(Paciente Selecionado)</span>}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite seu nome completo"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          data-testid="input-patient-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="patientCpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                      <CreditCard className="inline mr-2 h-4 w-4 text-blue-600" />
                      CPF *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="000.000.000-00"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        data-testid="input-patient-cpf"
                        {...field}
                        onChange={(e) => handleCPFChange(e.target.value, field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="patientRg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                      <CreditCard className="inline mr-2 h-4 w-4 text-blue-600" />
                      RG *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Número do RG"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        data-testid="input-patient-rg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="patientBirthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="inline mr-2 h-4 w-4 text-blue-600" />
                      Data de Nascimento *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        data-testid="input-patient-birth-date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="patientGender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                      <User className="inline mr-2 h-4 w-4 text-blue-600" />
                      Sexo *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600" data-testid="select-patient-gender">
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
                name="patientSusCard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                      <CreditCard className="inline mr-2 h-4 w-4 text-green-600" />
                      Cartão SUS *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="000 0000 0000 0000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        data-testid="input-patient-sus"
                        {...field}
                        onChange={(e) => handleSUSCardChange(e.target.value, field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="patientWhatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                      <Phone className="inline mr-2 h-4 w-4 text-green-600" />
                      WhatsApp *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(87) 99999-9999"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        data-testid="input-patient-whatsapp"
                        {...field}
                        onChange={(e) => handleWhatsAppChange(e.target.value, field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialtyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                      <Stethoscope className="inline mr-2 h-4 w-4 text-blue-600" />
                      Especialidade *
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={specialtiesLoading}
                    >
                      <FormControl>
                        <SelectTrigger
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          data-testid="select-specialty"
                        >
                          <SelectValue placeholder="Selecione a especialidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {specialties.map((specialty) => (
                          <SelectItem
                            key={specialty.id}
                            value={specialty.id}
                            data-testid={`specialty-option-${specialty.id}`}
                          >
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

            {/* Address Information */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="patientAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                          <Home className="inline mr-2 h-4 w-4 text-blue-600" />
                          Endereço *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Rua, Avenida, etc."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            data-testid="input-patient-address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="patientAddressNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                        Número *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nº"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          data-testid="input-patient-address-number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patientNeighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                        Bairro *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome do bairro"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          data-testid="input-patient-neighborhood"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patientZoneType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                        Zona *
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600" data-testid="select-patient-zone">
                            <SelectValue placeholder="Selecione a zona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="urbana">Urbana</SelectItem>
                          <SelectItem value="rural">Rural</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patientCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                        Cidade *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome da cidade"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          data-testid="input-patient-city"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patientState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                        Estado *
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600" data-testid="select-patient-state">
                            <SelectValue placeholder="Selecione o estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AC">Acre</SelectItem>
                          <SelectItem value="AL">Alagoas</SelectItem>
                          <SelectItem value="AP">Amapá</SelectItem>
                          <SelectItem value="AM">Amazonas</SelectItem>
                          <SelectItem value="BA">Bahia</SelectItem>
                          <SelectItem value="CE">Ceará</SelectItem>
                          <SelectItem value="DF">Distrito Federal</SelectItem>
                          <SelectItem value="ES">Espírito Santo</SelectItem>
                          <SelectItem value="GO">Goiás</SelectItem>
                          <SelectItem value="MA">Maranhão</SelectItem>
                          <SelectItem value="MT">Mato Grosso</SelectItem>
                          <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                          <SelectItem value="MG">Minas Gerais</SelectItem>
                          <SelectItem value="PA">Pará</SelectItem>
                          <SelectItem value="PB">Paraíba</SelectItem>
                          <SelectItem value="PR">Paraná</SelectItem>
                          <SelectItem value="PE">Pernambuco</SelectItem>
                          <SelectItem value="PI">Piauí</SelectItem>
                          <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                          <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                          <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                          <SelectItem value="RO">Rondônia</SelectItem>
                          <SelectItem value="RR">Roraima</SelectItem>
                          <SelectItem value="SC">Santa Catarina</SelectItem>
                          <SelectItem value="SP">São Paulo</SelectItem>
                          <SelectItem value="SE">Sergipe</SelectItem>
                          <SelectItem value="TO">Tocantins</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Medical Information */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-100">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FileText className="mr-2 h-5 w-5 text-green-600" />
                Informações da Consulta
              </h4>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                        Motivo/Resumo da Consulta *
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder="Descreva brevemente o motivo da consulta e principais sintomas..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          data-testid="textarea-reason"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="appointmentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                          <Calendar className="inline mr-2 h-4 w-4 text-blue-600" />
                          Data da Consulta *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={getMinimumDate()}
                            max={getMaximumDate()}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            data-testid="input-appointment-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="appointmentTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-semibold text-gray-700 mb-2">
                          <Clock className="inline mr-2 h-4 w-4 text-blue-600" />
                          Horário *
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                              data-testid="select-appointment-time"
                            >
                              <SelectValue placeholder="Selecione o horário" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getAvailableTimeSlots().map((time) => (
                              <SelectItem
                                key={time}
                                value={time}
                                data-testid={`time-option-${time}`}
                              >
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                disabled={createAppointmentMutation.isPending}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all duration-200"
                data-testid="button-submit-appointment"
              >
                {createAppointmentMutation.isPending ? (
                  "Agendando..."
                ) : (
                  <>
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    Agendar Consulta
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                className="flex-1 sm:flex-none bg-gray-100 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                data-testid="button-reset-form"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Limpar Formulário
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}