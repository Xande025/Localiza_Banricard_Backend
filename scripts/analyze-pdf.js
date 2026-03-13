import fs from 'fs';
import pdf from 'pdf-parse';

/**
 * Script para analisar a estrutura do PDF e ajudar a criar padrões de extração
 */
async function analyzePDF(pdfPath) {
  try {
    console.log('📄 Analisando PDF...\n');
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    
    const lines = data.text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    console.log(`📊 Total de linhas: ${lines.length}`);
    console.log(`📄 Total de páginas: ${data.numpages}\n`);
    
    console.log('📋 Primeiras 100 linhas do PDF:');
    console.log('='.repeat(80));
    lines.slice(0, 100).forEach((line, i) => {
      console.log(`${String(i + 1).padStart(3, ' ')}: ${line}`);
    });
    console.log('='.repeat(80));
    
    // Salvar amostra completa
    fs.writeFileSync('./pdf-full-text.txt', data.text);
    console.log('\n💾 Texto completo salvo em: pdf-full-text.txt');
    
    // Analisar padrões
    console.log('\n🔍 Análise de padrões:');
    
    const cities = new Set();
    const addresses = [];
    const phones = [];
    
    lines.forEach(line => {
      // Cidades conhecidas do RS
      const cityMatch = line.match(/(Porto Alegre|Caxias do Sul|Pelotas|Canoas|Santa Maria|Novo Hamburgo|Viamão|São Leopoldo|Rio Grande|Alvorada|Passo Fundo|Uruguaiana|Sapucaia do Sul|Bagé|Cachoeirinha|Bento Gonçalves|Erechim|Guaíba|Santana do Livramento|Cachoeira do Sul|Esteio|Ijuí|Alegrete|Lajeado|Santo Ângelo|Farroupilha|São Borja|Carazinho|Vacaria|Montenegro)/i);
      if (cityMatch) cities.add(cityMatch[0]);
      
      // Endereços
      if (line.match(/(Rua|Av|Avenida|Rodovia|Estrada|Praça|Alameda|Travessa)/i)) {
        addresses.push(line);
      }
      
      // Telefones
      const phoneMatch = line.match(/\(?\d{2}\)?\s?\d{4,5}[-.\s]?\d{4}/);
      if (phoneMatch) phones.push(phoneMatch[0]);
    });
    
    console.log(`\n🏙️  Cidades encontradas: ${cities.size}`);
    Array.from(cities).slice(0, 15).forEach(city => console.log(`   - ${city}`));
    
    console.log(`\n📍 Endereços encontrados: ${addresses.length}`);
    addresses.slice(0, 10).forEach(addr => console.log(`   - ${addr}`));
    
    console.log(`\n📞 Telefones encontrados: ${phones.length}`);
    phones.slice(0, 10).forEach(phone => console.log(`   - ${phone}`));
    
    // Tentar identificar estrutura
    console.log('\n📐 Tentando identificar estrutura...');
    let restaurantBlocks = 0;
    let inBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/(Rua|Av|Avenida)/i) && !inBlock) {
        restaurantBlocks++;
        inBlock = true;
      }
      if (line.match(/(Porto Alegre|Caxias|Pelotas|Canoas)/i)) {
        inBlock = false;
      }
    }
    
    console.log(`   Possíveis blocos de restaurantes: ~${restaurantBlocks}`);
    
    console.log('\n💡 Dica: Revise o arquivo pdf-full-text.txt para entender melhor a estrutura');
    console.log('💡 Depois execute: node scripts/extract-pdf-improved.js credentiados.pdf');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

const pdfPath = process.argv[2] || './credentiados.pdf';

if (!fs.existsSync(pdfPath)) {
  console.error(`❌ Arquivo não encontrado: ${pdfPath}`);
  process.exit(1);
}

analyzePDF(pdfPath);
