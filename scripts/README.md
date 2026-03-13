# Scripts de Importação de Dados

Scripts para extrair dados do PDF do Banricard e importar para o banco de dados.

## 📋 Pré-requisitos

1. PDF do Banricard baixado
2. Banco de dados configurado e rodando
3. Variável `GOOGLE_MAPS_API_KEY` configurada no `.env` (para geocodificação)

## 🚀 Como Usar

### Opção 1: Importação Automática (Recomendado)

Este método extrai do PDF e importa diretamente:

```bash
cd backend
npm install pdf-parse  # Instalar dependência se necessário

# Coloque o PDF na pasta backend com o nome "credentiados.pdf"
# Ou especifique o caminho:
node scripts/extract-pdf.js caminho/para/o/pdf.pdf > restaurants-extracted.json
node scripts/import-pdf.js restaurants-extracted.json
```

### Opção 2: Importação Manual (Passo a Passo)

1. **Extrair dados do PDF:**
```bash
cd backend
node scripts/extract-pdf.js caminho/para/credentiados.pdf
```

Isso cria um arquivo `restaurants-extracted.json` com os dados extraídos.

2. **Revisar e ajustar o JSON (opcional):**
Abra `restaurants-extracted.json` e verifique se os dados estão corretos.
Você pode editar manualmente se necessário.

3. **Importar para o banco:**
```bash
# Com geocodificação (mais lento, mas adiciona coordenadas)
node scripts/import-pdf.js restaurants-extracted.json

# Sem geocodificação (mais rápido, mas sem coordenadas)
node scripts/import-pdf.js restaurants-extracted.json --skip-geocode
```

## ⚙️ Opções

### Importar sem geocodificação
```bash
node scripts/import-pdf.js restaurants-extracted.json --skip-geocode
```
- Mais rápido
- Não adiciona coordenadas (lat/lng)
- Restaurantes aparecerão na lista mas não no mapa

### Importar com geocodificação
```bash
node scripts/import-pdf.js restaurants-extracted.json
```
- Mais lento (respeita limites da API do Google)
- Adiciona coordenadas automaticamente
- Restaurantes aparecem no mapa

## 📝 Formato Esperado do JSON

O arquivo JSON deve ter este formato:

```json
[
  {
    "name": "Nome do Restaurante",
    "address": "Rua Exemplo, 123",
    "city": "Porto Alegre",
    "neighborhood": "Centro",
    "phone": "(51) 1234-5678"
  }
]
```

## 🔧 Ajustar Extração do PDF

Se o formato do PDF for diferente, você pode ajustar o script `extract-pdf.js`:

1. Abra `backend/scripts/extract-pdf.js`
2. Ajuste os padrões de reconhecimento conforme o formato do seu PDF
3. Execute novamente a extração

## ⚠️ Notas Importantes

- O script evita duplicatas (verifica por nome + cidade)
- Geocodificação pode demorar (delay de 100ms entre requisições)
- Se a geocodificação falhar, o restaurante é criado sem coordenadas
- Restaurantes sem coordenadas aparecem na lista mas não no mapa

## 🐛 Troubleshooting

### Erro: "Cannot find module 'pdf-parse'"
```bash
npm install pdf-parse
```

### Erro: "PDF parsing failed"
- Verifique se o PDF não está corrompido
- Tente baixar o PDF novamente do site do Banricard

### Dados extraídos incorretamente
- Ajuste os padrões em `extract-pdf.js`
- Ou edite manualmente o arquivo JSON antes de importar

### Geocodificação falhando
- Verifique se `GOOGLE_MAPS_API_KEY` está configurada
- Verifique se a API está habilitada no Google Cloud Console
- Use `--skip-geocode` para pular a geocodificação
