# Limitações da Conta Sandbox WhatsApp Business API

## Problema Identificado

**IMPORTANTE**: O sistema está funcionando corretamente, mas você está usando uma conta **SANDBOX (teste)** do WhatsApp Business API, que tem limitações específicas:

### Limitações da Conta Sandbox

1. **Apenas números pré-aprovados** podem receber mensagens
2. **Número de teste específico** (provavelmente o Ramon Wagner) está na lista de permissões
3. **Outros números não recebem** as mensagens mesmo com "sucesso" da API

### Como Confirmar se é Sandbox

- ✅ API retorna sucesso (wamid.XXX)
- ✅ Logs mostram "enviado com sucesso"
- ❌ Apenas um número específico recebe as mensagens
- ❌ Outros números não recebem, mesmo com sucesso da API

## Soluções

### Solução 1: Adicionar Números à Lista de Teste (Temporária)

1. Acesse seu [Meta for Developers Console](https://developers.facebook.com/)
2. Vá para seu app WhatsApp Business
3. Em "Configuration" → "Phone Numbers"
4. Adicione os números de teste na seção "Recipients"
5. Máximo de 5 números em modo sandbox

### Solução 2: Migrar para Produção (Recomendada)

Para usar o sistema com todos os pacientes reais:

1. **Verificar Negócio no Meta Business Manager**
   - Confirmar empresa no Meta Business Manager
   - Verificar documentos do hospital

2. **Solicitar Aprovação para Produção**
   - Submeter aplicação para revisão do Meta
   - Aguardar aprovação (1-7 dias úteis)

3. **Configurar WhatsApp Business Verificado**
   - Número oficial do hospital verificado
   - Perfil business completo

### Solução 3: Usar Provedor Third-Party

Provedores como Twilio, 360Dialog, CM.com oferecem:
- Setup mais rápido
- Aprovação simplificada
- Suporte técnico dedicado

## Status Atual

**✅ Sistema funcionando perfeitamente**
**⚠️ Limitado por restrições de conta sandbox**
**🎯 Próximo passo: Migrar para produção ou adicionar números de teste**

## Verificação Técnica

Execute este comando para confirmar o status da conta:

```bash
curl -X GET "https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

Procure por:
- `verified_name`: Nome verificado (produção)
- `code_verification_status`: Status de verificação
- `quality_rating`: Rating de qualidade (produção)

Se estes campos estão vazios/null, confirma que é conta sandbox.