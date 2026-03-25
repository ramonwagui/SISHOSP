# Configuração da Integração WhatsApp Business API

Este guia detalha como configurar a integração com a WhatsApp Business API para envio automático de lembretes de consultas.

## Pré-requisitos

1. **Conta WhatsApp Business**
   - Conta verificada do WhatsApp Business
   - Número de telefone dedicado para o hospital
   - Acesso ao WhatsApp Business Manager

2. **Meta Developer Account**
   - Conta de desenvolvedor no Meta (Facebook)
   - Aplicativo criado no Meta for Developers
   - Produto WhatsApp Business adicionado ao app

## Configuração Passo a Passo

### 1. Configurar WhatsApp Business API

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Crie um novo aplicativo ou use um existente
3. Adicione o produto "WhatsApp Business"
4. Configure seu número de telefone business
5. Obtenha as credenciais necessárias:
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_VERIFY_TOKEN`

### 2. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no ambiente do Replit:

```env
# WhatsApp Business API Configuration
WHATSAPP_PHONE_NUMBER_ID=sua_phone_number_id
WHATSAPP_ACCESS_TOKEN=seu_access_token
WHATSAPP_VERIFY_TOKEN=seu_verify_token
WHATSAPP_API_VERSION=v18.0
```

### 3. Configurar Webhook (Opcional)

Para receber confirmações de entrega e status das mensagens:

1. Configure o webhook URL: `https://seu-app.replit.app/api/whatsapp/webhook`
2. Use o `WHATSAPP_VERIFY_TOKEN` para verificação
3. Inscreva-se nos eventos: `messages`, `message_deliveries`, `message_reads`

## Funcionalidades Implementadas

### Lembretes Automáticos

O sistema envia lembretes automaticamente nos seguintes horários:

1. **24 horas antes**: 9:00 da manhã (dia anterior)
2. **Dia da consulta**: 8:00 da manhã
3. **2 horas antes**: Durante horário comercial (8h-17h)

### Templates de Mensagem

#### Lembrete de 24h
```
🏥 *Hospital Regional de Ouricuri - PE*

Olá [NOME_PACIENTE]! 

📅 Lembramos que você tem uma consulta marcada para *amanhã*:

🕐 **Horário:** [HORARIO]
👨‍⚕️ **Especialidade:** [ESPECIALIDADE]

Por favor, chegue com 15 minutos de antecedência e traga seus documentos.

Em caso de necessidade, entre em contato conosco.
```

#### Lembrete do Dia
```
🏥 *Hospital Regional de Ouricuri - PE*

Bom dia, [NOME_PACIENTE]! 

📅 Lembramos que você tem uma consulta *hoje*:

🕐 **Horário:** [HORARIO]
👨‍⚕️ **Especialidade:** [ESPECIALIDADE]

Por favor, chegue com 15 minutos de antecedência.

Até logo!
```

## Monitoramento e Logs

### Status do Cron Service

O sistema possui monitoramento automático que pode ser verificado nos logs:

```
✅ WhatsApp reminder cron service started
🔍 Checking for reminders at 09:00
📅 Found 3 appointments for tomorrow
✅ Tomorrow reminder sent to João Silva (85987654321)
```

### Interface Administrativa

Acesse `/whatsapp-admin` para:

- Verificar status da integração
- Enviar lembretes manuais
- Visualizar logs de envio
- Configurar mensagens personalizadas

## Troubleshooting

### Problemas Comuns

1. **Mensagens não sendo enviadas**
   - Verifique se o `WHATSAPP_ACCESS_TOKEN` está válido
   - Confirme se o número de telefone está verificado
   - Verifique logs de erro no console

2. **Rate Limiting**
   - O sistema implementa delay de 2 segundos entre mensagens
   - Limite diário do WhatsApp Business API: varia por tipo de conta

3. **Formato de número inválido**
   - Números devem estar no formato internacional (5585987654321)
   - Remover espaços, traços e parênteses

### Logs de Debug

Para ativar logs detalhados, adicione:

```env
DEBUG_WHATSAPP=true
```

## Segurança

- Todas as credenciais são armazenadas como variáveis de ambiente
- Tokens de acesso têm expiração limitada
- Mensagens são enviadas apenas para pacientes com consultas confirmadas
- Rate limiting previne spam acidental

## Suporte

Para suporte técnico:
- Logs detalhados estão disponíveis no console do servidor
- Interface administrativa mostra status em tempo real
- Documentação oficial: [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

---

*Sistema desenvolvido para Hospital Regional de Ouricuri - PE*
*Integração WhatsApp Business API - Agosto 2025*