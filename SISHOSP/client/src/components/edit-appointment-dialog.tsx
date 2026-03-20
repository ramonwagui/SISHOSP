import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { type AppointmentWithDetails, type Specialty, insertLegacyAppointmentSchema, type InsertLegacyAppointment } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { formatCPF, formatSUSCard, formatWhatsApp, validateCPF } from "@/lib/utils";
import { getAvailableTimeSlots, getMinimumDate, getMaximumDate } from "@/lib/google-calendar";
import { useToast } from "@/hooks/use-toast";
import { Edit, Calendar, Clock, User, CreditCard, Phone, Stethoscope, FileText, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const editAppointmentSchema = insertLegacyAppointmentSchema.extend({
  patientCpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve estar no formato 000.000.000-00").refine(validateCPF, {
    message: "CPF inválido",
  }),
}).superRefine((data, ctx) => {
  // Quando o status é "completed" (realizado), "cancelled" (cancelado) ou "rescheduled" (reagendado),
  // não exigir data/hora obrigatoriamente - a consulta já foi finalizada ou cancelada
  const statusesThatDontRequireDateTime = ["completed", "cancelled", "rescheduled"];
  
  if (!statusesThatDontRequireDateTime.includes(data.status)) {
    if (!data.appointmentDate || data.appointmentDate.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data é obrigatória",
        path: ["appointmentDate"],
      });
    }
    if (!data.appointmentTime || data.appointmentTime.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Horário é obrigatório", 
        path: ["appointmentTime"],
      });
    }
  }
});

interface EditAppointmentDialogProps {
  appointment: AppointmentWithDetails;
}

export default function EditAppointmentDialog({ appointment }: EditAppointmentDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertLegacyAppointment>({
    resolver: zodResolver(editAppointmentSchema),
    defaultValues: {
      patientName: appointment.patientName || appointment.patient?.name || "",
      patientCpf: appointment.patientCpf || appointment.patient?.cpf || "",
      patientRg: appointment.patient?.rg || "",
      patientBirthDate: appointment.patient?.birthDate || "",
      patientGender: (appointment.patient?.gender as "masculino" | "feminino") || "masculino",
      patientSusCard: appointment.patientSusCard || appointment.patient?.susCard || "",
      patientWhatsapp: appointment.patientWhatsapp || appointment.patient?.whatsapp || "",
      patientAddress: appointment.patient?.address || "",
      patientAddressNumber: appointment.patient?.addressNumber || "",
      patientNeighborhood: appointment.patient?.neighborhood || "",
      patientZoneType: (appointment.patient?.zoneType as "urbana" | "rural") || "urbana",
      patientCity: appointment.patient?.city || "",
      patientState: appointment.patient?.state || "",
      specialtyId: appointment.specialtyId,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      reason: appointment.reason,
      status: appointment.status as "scheduled" | "rescheduled" | "cancelled" | "completed",
    },
  });
  
  // Watch the status field to show/hide date/time requirements
  const watchedStatus = form.watch("status");

  // Fetch specialties
  const { data: specialties = [], isLoading: specialtiesLoading } = useQuery<Specialty[]>({
    queryKey: ["/api/specialties"],
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: InsertLegacyAppointment) => {
      return await apiRequest(`/api/appointments/${appointment.id}`, {
        method: "PUT",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Agendamento atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/reports/appointments"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar agendamento",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertLegacyAppointment) => {
    updateAppointmentMutation.mutate(data);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
          data-testid={`button-edit-${appointment.id}`}
        >
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="mr-2 h-5 w-5 text-blue-600" />
            Editar Agendamento - {appointment.patientName || appointment.patient?.name}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <User className="mr-2 h-5 w-5 text-blue-600" />
                Dados Pessoais
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="patientName"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Nome Completo *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome completo do paciente"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          data-testid="input-edit-patient-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patientCpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        <CreditCard className="inline mr-2 h-4 w-4 text-blue-600" />
                        CPF *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="000.000.000-00"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          data-testid="input-edit-patient-cpf"
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
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        RG *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 12.345.678-9"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          data-testid="input-edit-patient-rg"
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
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Data de Nascimento *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          data-testid="input-edit-patient-birth-date"
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
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Gênero *
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                            <SelectValue placeholder="Selecione o gênero" />
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
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        <CreditCard className="inline mr-2 h-4 w-4 text-green-600" />
                        Cartão SUS *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="000 0000 0000 0000"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          data-testid="input-edit-patient-sus"
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
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        <Phone className="inline mr-2 h-4 w-4 text-green-600" />
                        WhatsApp *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(87) 99999-9999"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          data-testid="input-edit-patient-whatsapp"
                          {...field}
                          onChange={(e) => handleWhatsAppChange(e.target.value, field.onChange)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-100">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <MapPin className="mr-2 h-5 w-5 text-green-600" />
                Endereço
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="patientAddress"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Endereço *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Rua, Avenida, etc."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          data-testid="input-edit-patient-address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patientAddressNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Número *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          data-testid="input-edit-patient-address-number"
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
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Bairro *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome do bairro"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          data-testid="input-edit-patient-neighborhood"
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
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Zona *
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg">
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
                  name="patientCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Cidade *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome da cidade"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          data-testid="input-edit-patient-city"
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
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        UF *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="PE"
                          maxLength={2}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          data-testid="input-edit-patient-state"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
                      <FormLabel className="text-sm font-semibold text-gray-700">
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                            data-testid="select-edit-specialty"
                          >
                            <SelectValue placeholder="Selecione a especialidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {specialties.map((specialty) => (
                            <SelectItem
                              key={specialty.id}
                              value={specialty.id}
                              data-testid={`edit-specialty-option-${specialty.id}`}
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
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Motivo/Resumo da Consulta *
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Descreva brevemente o motivo da consulta..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          data-testid="textarea-edit-reason"
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
                        <FormLabel className="text-sm font-semibold text-gray-700">
                          <Calendar className="inline mr-2 h-4 w-4 text-blue-600" />
                          Data da Consulta {["completed", "cancelled", "rescheduled"].includes(watchedStatus) ? "(Opcional)" : "*"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={["completed", "cancelled", "rescheduled"].includes(watchedStatus) ? undefined : getMinimumDate()}
                            max={["completed", "cancelled", "rescheduled"].includes(watchedStatus) ? undefined : getMaximumDate()}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                            data-testid="input-edit-appointment-date"
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
                        <FormLabel className="text-sm font-semibold text-gray-700">
                          <Clock className="inline mr-2 h-4 w-4 text-blue-600" />
                          Horário {["completed", "cancelled", "rescheduled"].includes(watchedStatus) ? "(Opcional)" : "*"}
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                              data-testid="select-edit-appointment-time"
                            >
                              <SelectValue placeholder="Selecione o horário" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getAvailableTimeSlots().map((time) => (
                              <SelectItem
                                key={time}
                                value={time}
                                data-testid={`edit-time-option-${time}`}
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

                {/* Mensagem informativa quando status é "realizado" */}
                {watchedStatus === "completed" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="text-green-600 text-xl">ℹ️</div>
                    <div className="text-sm text-green-800">
                      <strong>Status: Realizado</strong>
                      <p className="mt-1">
                        Quando a consulta está marcada como "Realizada", os campos de data e horário são opcionais.
                        A consulta será contabilizada automaticamente nos relatórios de "Consultas Realizadas".
                      </p>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Status do Agendamento *
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                            data-testid="select-edit-status"
                          >
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="scheduled" data-testid="status-option-scheduled" className="status-scheduled">
                            🔵 Agendado
                          </SelectItem>
                          <SelectItem value="rescheduled" data-testid="status-option-rescheduled" className="status-rescheduled">
                            🟡 Reagendado
                          </SelectItem>
                          <SelectItem value="completed" data-testid="status-option-completed" className="status-completed">
                            🟢 Realizado
                          </SelectItem>
                          <SelectItem value="cancelled" data-testid="status-option-cancelled" className="status-cancelled">
                            🔴 Cancelado
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-edit"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateAppointmentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-save-edit"
              >
                {updateAppointmentMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}