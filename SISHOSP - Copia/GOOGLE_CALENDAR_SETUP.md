# Configuração do Google Calendar - Hospital Regional de Ouricuri

## Problema Atual
O erro "Você não tem permissão para visualizar eventos de uma ou mais agendas" ocorre porque o calendário está configurado como privado.

## Como Resolver

### Opção 1: Configurar Calendário como Público
1. Acesse [Google Calendar](https://calendar.google.com)
2. No painel esquerdo, encontre seu calendário do hospital
3. Clique nos 3 pontos ao lado do nome do calendário → "Configurações e compartilhamento"
4. Na seção "Permissões de acesso":
   - Marque "Disponibilizar publicamente"
   - Selecione "Ver todos os detalhes do evento"
5. Copie o ID do calendário da seção "Integrar calendário"
6. Use este ID para gerar um novo link de incorporação

### Opção 2: Usar Link de Incorporação Público
1. No Google Calendar, vá em "Configurações e compartilhamento" do seu calendário
2. Role até "Integrar calendário"
3. Copie o código HTML do iframe fornecido
4. Substitua o link no sistema

### Opção 3: Criar Calendário Específico para o Hospital
1. Crie um novo calendário no Google Calendar chamado "Hospital Regional de Ouricuri"
2. Configure como público desde o início
3. Configure as permissões para "Ver todos os detalhes do evento"
4. Use o ID deste novo calendário

## Link Atual Configurado
Por enquanto, o sistema está usando apenas o calendário de feriados brasileiros para evitar erros de permissão.

## Integração Automática
Os agendamentos criados no sistema continuam sendo sincronizados automaticamente com o Google Calendar através da API configurada.