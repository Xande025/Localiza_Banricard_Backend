import fs from 'fs';
import pdf from 'pdf-parse';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extrai dados do PDF do Banricard e retorna array de restaurantes
 * @param {string} pdfPath - Caminho para o arquivo PDF
 * @returns {Promise<Array>} Array de objetos com dados dos restaurantes
 */
async function extractRestaurantsFromPDF(pdfPath) {
  try {
    console.log('📄 Lendo PDF...');
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    
    console.log('📝 Processando texto do PDF...');
    const lines = data.text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const restaurants = [];
    let currentRestaurant = null;
    
    // Padrões para identificar dados
    // Ajuste estes padrões conforme o formato do PDF do Banricard
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Pular cabeçalhos e rodapés
      if (line.includes('CREDENCIADOS') || 
          line.includes('BANRICARD') || 
          line.includes('Página') ||
          line.match(/^\d+$/)) {
        continue;
      }
      
      // Tentar identificar nome do restaurante (geralmente em maiúsculas ou primeira linha de um bloco)
      if (line.length > 3 && line.length < 100 && !line.match(/^\d/)) {
        // Se já temos um restaurante em construção, salvar o anterior
        if (currentRestaurant && currentRestaurant.name) {
          restaurants.push(currentRestaurant);
        }
        
        // Iniciar novo restaurante
        currentRestaurant = {
          name: line,
          address: '',
          city: '',
          neighborhood: '',
          phone: '',
        };
      } else if (currentRestaurant) {
        // Tentar identificar endereço (contém palavras como Rua, Av, Avenida, etc)
        if (line.match(/(Rua|Av|Avenida|Rodovia|Estrada|Praça|Alameda)/i) && !currentRestaurant.address) {
          currentRestaurant.address = line;
        }
        // Tentar identificar telefone
        else if (line.match(/\(?\d{2}\)?\s?\d{4,5}[-.\s]?\d{4}/)) {
          currentRestaurant.phone = line.replace(/\D/g, '').replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
        }
        // Tentar identificar cidade (última linha antes de próximo restaurante)
        else if (line.length > 2 && line.length < 50 && !line.match(/^\d/)) {
          // Se não tem cidade ainda, pode ser cidade
          if (!currentRestaurant.city) {
            // Verificar se contém bairro e cidade (formato: "Bairro - Cidade")
            const parts = line.split('-').map(p => p.trim());
            if (parts.length === 2) {
              currentRestaurant.neighborhood = parts[0];
              currentRestaurant.city = parts[1];
            } else {
              currentRestaurant.city = line;
            }
          }
        }
      }
    }
    
    // Adicionar último restaurante
    if (currentRestaurant && currentRestaurant.name) {
      restaurants.push(currentRestaurant);
    }
    
    // Filtrar restaurantes válidos (devem ter nome e cidade)
    const validRestaurants = restaurants.filter(r => 
      r.name && r.name.length > 2 && r.city && r.city.length > 2
    );
    
    console.log(`✅ Extraídos ${validRestaurants.length} restaurantes do PDF`);
    return validRestaurants;
    
  } catch (error) {
    console.error('❌ Erro ao processar PDF:', error);
    throw error;
  }
}

// Executar se chamado diretamente
const pdfPath = process.argv[2] || './credentiados.pdf';

if (!fs.existsSync(pdfPath)) {
  console.error(`❌ Arquivo não encontrado: ${pdfPath}`);
  console.log('\n💡 Uso: node scripts/extract-pdf.js caminho/para/pdf.pdf');
  process.exit(1);
}

extractRestaurantsFromPDF(pdfPath)
  .then(restaurants => {
    // Salvar em JSON
    const outputPath = './restaurants-extracted.json';
    fs.writeFileSync(outputPath, JSON.stringify(restaurants, null, 2));
    console.log(`\n💾 Dados salvos em: ${outputPath}`);
    console.log(`📊 Total de restaurantes extraídos: ${restaurants.length}`);
    console.log('\n✅ Próximo passo:');
    console.log(`   node scripts/import-pdf.js ${outputPath}`);
  })
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
