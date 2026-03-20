// Google Calendar integration utilities
export interface CalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

export function createCalendarEvent(
  patientName: string,
  specialty: string,
  date: string,
  time: string,
  reason: string,
  whatsapp: string
): CalendarEvent {
  const startDateTime = `${date}T${time}:00`;
  const endDateTime = `${date}T${time}:00`;
  
  return {
    summary: `Consulta ${patientName} - ${specialty}`,
    description: `Paciente: ${patientName}\nMotivo: ${reason}\nWhatsApp: ${whatsapp}`,
    start: {
      dateTime: startDateTime,
      timeZone: 'America/Recife',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'America/Recife',
    },
  };
}

export function getAvailableTimeSlots(): string[] {
  return [
    '08:00',
    '08:30',
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
    '17:30',
  ];
}

export function getMinimumDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

export function getMaximumDate(): string {
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3); // 3 months ahead
  return maxDate.toISOString().split('T')[0];
}
