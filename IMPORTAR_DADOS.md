# 📥 Como Importar Dados do PDF do Banricard

Guia completo para importar os dados do PDF oficial do Banricard para o banco de dados.

## 📋 Pré-requisitos

1. ✅ Banco de dados configurado e rodando
2. ✅ PDF do Banricard baixado: [Credenciados-Banricard-Refeicao-RS.pdf](https://www.banricard.com.br/bdr/link/midias/10355_Credenciados-Banricard-Refeicao-RS.pdf)
3. ✅ Variável `GOOGLE_MAPS_API_KEY` configurada no `.env` (opcional, para geocodificação)

## 🚀 Método 1: Importação Automática (Recomendado)

### Passo 1: Instalar dependência

```bash
cd backend
npm install pdf-parse
```

### Passo 2: Baixar o PDF

Baixe o PDF do site do Banricard e coloque na pasta `backend/` com o nome `credentiados.pdf`, ou use o caminho completo.

### Passo 3: Extrair dados do PDF

#### Opção A: Análise do PDF (Recomendado para primeira vez)

Primeiro, analise a estrutura do PDF:

```bash
npm run analyze:pdf credentiados.pdf
```

Isso mostra a estrutura do PDF e ajuda a entender o formato.

#### Opção B: Extração Direta

Execute o script de extração melhorado:

```bash
npm run extract:pdf credentiados.pdf
```

Ou diretamente:

```bash
node scripts/extract-pdf-improved.js credentiados.pdf
```

Isso cria o arquivo `restaurants-extracted.json` com os dados extraídos.

⚠️ **Nota**: O script `extract-pdf-improved.js` está otimizado para o formato específico do PDF do Banricard (colunas fixas). Se o formato mudar, você pode precisar ajustar os padrões.

### Passo 4: Revisar dados (Opcional)

Abra `restaurants-extracted.json` e verifique se os dados estão corretos. Você pode editar manualmente se necessário.

### Passo 5: Importar para o banco

```bash
# Com geocodificação (recomendado - adiciona coordenadas)
node scripts/import-pdf.js restaurants-extracted.json

# Sem geocodificação (mais rápido, mas sem coordenadas no mapa)
node scripts/import-pdf.js restaurants-extracted.json --skip-geocode
```

## 🚀 Método 2: Importação Manual

Se a extração automática não funcionar bem, você pode criar o JSON manualmente:

### Passo 1: Criar arquivo JSON

Crie um arquivo `restaurants-manual.json` seguindo este formato:

```json
[
  {
    "name": "Nome do Restaurante",
    "address": "Rua Exemplo, 123",
    "city": "Porto Alegre",
    "neighborhood": "Centro",
    "region": "Metropolitana",
    "phone": "(51) 1234-5678",
    "email": "contato@exemplo.com",
    "website": "https://www.exemplo.com"
  }
]
```

### Passo 2: Importar

```bash
node scripts/import-manual.js restaurants-manual.json
```

## 📝 Formato do JSON

Campos obrigatórios:
- `name` - Nome do estabelecimento
- `city` - Cidade

Campos opcionais:
- `address` - Endereço completo
- `neighborhood` - Bairro
- `region` - Região (Metropolitana, Serra, etc)
- `phone` - Telefone
- `email` - Email
- `website` - Website
- `state` - Estado (padrão: "RS")

## ⚙️ Opções de Importação

### Com Geocodificação (Padrão)
```bash
node scripts/import-pdf.js restaurants-extracted.json
```
- ✅ Adiciona coordenadas (latitude/longitude)
- ✅ Restaurantes aparecem no mapa
- ⏱️ Mais lento (respeita limites da API)
- 💰 Usa créditos do Google Maps API

### Sem Geocodificação
```bash
node scripts/import-pdf.js restaurants-extracted.json --skip-geocode
```
- ⚡ Muito mais rápido
- ❌ Não adiciona coordenadas
- ⚠️ Restaurantes aparecem na lista mas NÃO no mapa
- 💡 Útil para importação inicial rápida

## 🔍 Verificar Importação

### Via Prisma Studio
```bash
npm run prisma:studio
```
Abra http://localhost:5555 e veja os dados importados.

### Via API
```bash
curl http://localhost:3000/api/restaurants
```

### Via pgAdmin
Abra o pgAdmin e consulte a tabela `restaurants`.

## ⚠️ Importante

1. **Duplicatas**: O script evita criar duplicatas (verifica nome + cidade)
2. **Geocodificação**: Pode demorar (delay de 100ms entre requisições para respeitar limites)
3. **Erros**: Se um restaurante falhar, o script continua com os próximos
4. **Progresso**: A cada 10 restaurantes, mostra o progresso

## 🐛 Troubleshooting

### Erro: "Cannot find module 'pdf-parse'"
```bash
npm install pdf-parse
```

### Erro: "PDF parsing failed"
- Verifique se o PDF não está corrompido
- Tente baixar novamente do site do Banricard
- O formato do PDF pode ter mudado - ajuste o script `extract-pdf.js`

### Dados extraídos incorretamente
1. Execute primeiro `npm run analyze:pdf` para ver a estrutura
2. Abra `scripts/extract-pdf-improved.js`
3. Ajuste os padrões de reconhecimento conforme o formato do seu PDF
4. Execute novamente a extração

### Geocodificação falhando
- Verifique se `GOOGLE_MAPS_API_KEY` está no `.env`
- Verifique se a Geocoding API está habilitada no Google Cloud
- Use `--skip-geocode` para pular a geocodificação

### Muitos restaurantes sem coordenadas
- Execute o script de geocodificação para os que não têm coordenadas:
```bash
npm run geocode:existing
```

## 📊 Estatísticas

Após a importação, você verá:
- ✅ Quantos foram importados
- ⏭️ Quantos já existiam (ignorados)
- ❌ Quantos tiveram erros

## 🔄 Atualizar Dados

Se o Banricard atualizar o PDF:

1. Baixe o novo PDF
2. Execute novamente os scripts
3. O script detecta duplicatas e não cria novamente
4. Apenas novos restaurantes serão adicionados

## 🔄 Geocodificar Restaurantes Existentes

Se você importou sem geocodificação e agora quer adicionar coordenadas:

### Opção 1: Geocodificar Todos (Recomendado)

```bash
npm run geocode:existing
```

Isso processa todos os restaurantes sem coordenadas.

### Opção 2: Geocodificar em Lotes (Para Testar)

```bash
# Processar apenas 100 restaurantes por vez
npm run geocode:existing:limit
```

### Opção 3: Opções Customizadas

```bash
# Processar apenas 50 restaurantes com delay de 200ms
node scripts/geocode-existing.js --limit=50 --delay=200

# Processar todos com delay menor (mais rápido, cuidado com limites da API)
node scripts/geocode-existing.js --delay=50
```

### O que o script faz:

1. ✅ Busca restaurantes sem `latitude` ou `longitude`
2. ✅ Monta endereço completo (endereço + bairro + cidade + estado + Brasil)
3. ✅ Geocodifica usando Google Maps API
4. ✅ Atualiza o banco com as coordenadas
5. ✅ Mostra progresso e estatísticas
6. ✅ Respeita delay entre requisições (padrão: 100ms)

### Dicas:

- ⏱️ Para 9.489 restaurantes: ~16 minutos (com delay de 100ms)
- 🔄 Você pode interromper (Ctrl+C) e continuar depois - o script processa apenas os que ainda não têm coordenadas
- ⚠️ Se a API retornar erro de limite, aumente o delay: `--delay=200`
- 💡 Execute em horários de menor uso se houver muitos restaurantes

## 💡 Dica

Para grandes volumes (centenas de restaurantes):
1. Primeiro importe sem geocodificação (`--skip-geocode`)
2. Depois, execute `npm run geocode:existing` para geocodificar em lotes
