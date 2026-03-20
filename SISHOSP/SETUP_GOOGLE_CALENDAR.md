# Configuração do Google Calendar para Hospital Regional de Ouricuri - PE

Este guia explica como configurar a integração com Google Calendar para que os agendamentos apareçam automaticamente no calendário.

## Passo 1: Criar um Projeto no Google Cloud Console

1. Acesse https://console.cloud.google.com/
2. Crie um novo projeto ou selecione um existente
3. No nome do projeto, use "Hospital Regional de Ouricuri - PE"

## Passo 2: Ativar a API do Google Calendar

1. No menu lateral, vá em "APIs & Services" > "Library"
2. Procure por "Google Calendar API"
3. Clique em "ENABLE"

## Passo 3: Configurar OAuth 2.0

1. Vá em "APIs & Services" > "Credentials"
2. Clique em "CREATE CREDENTIALS" > "OAuth client ID"
3. Selecione "Web application"
4. Configure:
   - Name: "Hospital Agendamento"
   - Authorized redirect URIs: `https://developers.google.com/oauthplayground`

## Passo 4: Obter o Refresh Token

1. Acesse https://developers.google.com/oauthplayground
2. No canto superior direito, clique no ícone de configurações (⚙️)
3. Marque "Use your own OAuth credentials"
4. Insira seu Client ID e Client Secret
5. No lado esquerdo, procure "Calendar API v3"
6. Selecione `https://www.googleapis.com/auth/calendar`
7. Clique "Authorize APIs"
8. Faça login com a conta do Google do hospital (ramon@ncconvenios.com.br)
9. Clique "Exchange authorization code for tokens"
10. Copie o "Refresh token"

## Passo 5: Configurar as Variáveis de Ambiente

Adicione estas variáveis no Replit:

```bash
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui  
GOOGLE_REFRESH_TOKEN=seu_refresh_token_aqui
```

## Passo 6: Configurar Email (Opcional)

Para envio de confirmações por email:

```bash
GMAIL_USER=ramon@ncconvenios.com.br
GMAIL_APP_PASSWORD=sua_senha_de_aplicativo
```

### Como gerar uma senha de aplicativo do Gmail:

1. Acesse https://myaccount.google.com/
2. Vá em "Segurança" > "Verificação em duas etapas"
3. Role para baixo e clique em "Senhas de aplicativo"
4. Selecione "Aplicativo personalizado" e digite "Hospital Sistema"
5. Use a senha gerada de 16 caracteres

## Verificação

Após configurar, teste fazendo um agendamento. Você deve ver no console:

```
✅ Google Calendar event created successfully: [ID_DO_EVENTO]
📅 Event link: [LINK_DO_EVENTO]
✅ Confirmation email sent successfully
```

## Solução de Problemas

### Erro "No access, refresh token..."
- Verifique se todas as variáveis estão configuradas
- Confirme que o refresh token foi gerado corretamente

### Erro "Invalid login"
- Use uma senha de aplicativo, não a senha normal do Gmail
- Verifique se a verificação em duas etapas está ativada

### Evento não aparece no calendário
- Verifique se está usando o email correto (ramon@ncconvenios.com.br)
- Confirme que o calendário está compartilhado ou acessível

## Benefícios da Integração

✅ Agendamentos aparecem automaticamente no Google Calendar
✅ Lembretes automáticos por email e notificação
✅ Sincronização em tempo real
✅ Acesso do calendário em qualquer dispositivo
✅ Integração com outros sistemas do hospital