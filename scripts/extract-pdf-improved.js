import fs from 'fs';
import pdf from 'pdf-parse';

/**
 * Versão melhorada do extrator de PDF
 * Adaptado para o formato específico do PDF do Banricard
 * Formato: CIDADE (coluna fixa ~20) + NOME (~50) + ENDEREÇO (~60) + BAIRRO (final)
 */
async function extractRestaurantsFromPDF(pdfPath) {
  try {
    console.log('📄 Lendo PDF...');
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    
    console.log('📝 Processando texto do PDF...');
    const text = data.text;
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    console.log(`📊 Total de linhas processadas: ${lines.length}`);
    
    const restaurants = [];
    
    // Lista de cidades do RS (em maiúsculas como aparecem no PDF)
    const citiesRS = [
      'ACEGUA', 'AGUA SANTA', 'AGUAS CLARAS', 'AGUDO', 'AJURICABA', 'ALECRIM', 'ALEGRETE',
      'ALVORADA', 'ANTONIO PRADO', 'ARARANGUA', 'ARROIO DO MEIO', 'ARROIO DOS RATOS',
      'BAGE', 'BARRA DO RIBEIRO', 'BENTO GONCALVES', 'BOM JESUS', 'BOM RETIRO DO SUL',
      'CACHOEIRA DO SUL', 'CACHOEIRINHA', 'CAMAQUA', 'CANDELARIA', 'CANELA', 'CANOAS',
      'CARAZINHO', 'CARLOS BARBOSA', 'CASCA', 'CAXIAS DO SUL', 'CERRO LARGO', 'CHAPADA',
      'CIDREIRA', 'CRISSIUMAL', 'CRUZ ALTA', 'DOIS IRMAOS', 'DOM PEDRITO', 'ELDORADO DO SUL',
      'ENCANTADO', 'ERECHIM', 'ESTEIO', 'ESTRELA', 'FARROUPILHA', 'FLORES DA CUNHA',
      'FREDERICO WESTPHALEN', 'GARIBALDI', 'GAUCHA', 'GRAVATAI', 'GUAIBA', 'HORIZONTINA',
      'IBIRUBA', 'IJUI', 'IMBE', 'IPIRANGA DO SUL', 'ITAQUI', 'IVOTI', 'JAGUARAO',
      'LAGOA VERMELHA', 'LAJEADO', 'LAVRAS DO SUL', 'MARAU', 'MOSTARDAS', 'MONTENEGRO',
      'NOVA PETROPOLIS', 'NOVO HAMBURGO', 'OSORIO', 'PALMEIRA DAS MISSOES', 'PANAMBI',
      'PAROBE', 'PASSO FUNDO', 'PELOTAS', 'PINHEIRO MACHADO', 'PORTO ALEGRE', 'QUARAI',
      'RIO GRANDE', 'ROCA SALES', 'ROSARIO DO SUL', 'SANANDUVA', 'SANTA CRUZ DO SUL',
      'SANTA MARIA', 'SANTA ROSA', 'SANTA VITORIA DO PALMAR', 'SANTANA DO LIVRAMENTO',
      'SANTO ANGELO', 'SAO BORJA', 'SAO FRANCISCO DE PAULA', 'SAO GABRIEL', 'SAO LEOPOLDO',
      'SAO LUIZ GONZAGA', 'SAO SEBASTIAO DO CAI', 'SAPIRANGA', 'SAPUCAIA DO SUL',
      'SARANDI', 'SEBERI', 'SERRA', 'SERRINHA', 'SOLEDADE', 'TAPEJARA', 'TAQUARA',
      'TAQUARI', 'TENENTE PORTELA', 'TORRES', 'TRAMANDAI', 'TRIUNFO', 'TUPANCIRETA',
      'URUGUAIANA', 'VACARIA', 'VENANCIO AIRES', 'VERANOPOLIS', 'VIAMAO', 'XANGRI-LA'
    ];
    
    // Padrão para identificar início de linha com cidade
    const cityPattern = new RegExp(`^(${citiesRS.join('|')})(\\([^)]+\\))?`, 'i');
    
    let processed = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Pular cabeçalhos e linhas muito curtas
      if (line.length < 10 ||
          line.match(/^(Cidade|Nome|Estabelecimento|Endereço|Bairro|Credenciados|Banricard|Página|\d+)$/i) ||
          line.includes('VALE REFEIÇÃO') ||
          line.includes('ESTABELECIMENTOS')) {
        continue;
      }
      
      // Tentar identificar cidade no início da linha
      const cityMatch = line.match(cityPattern);
      if (!cityMatch) continue;
      
      const cityFull = cityMatch[0].trim();
      let city = cityFull;
      
      // Remover parênteses (ex: "AGUAS CLARAS(VIAMAO)" -> "AGUAS CLARAS")
      if (city.includes('(')) {
        city = city.substring(0, city.indexOf('(')).trim();
      }
      
      // Remover a cidade do início (aproximadamente 20-25 caracteres)
      let remaining = line.substring(cityMatch[0].length).trim();
      
      // O formato parece usar espaços fixos para separar colunas
      // Estratégia: dividir por múltiplos espaços consecutivos
      const parts = remaining.split(/\s{3,}/).filter(p => p.trim().length > 0);
      
      if (parts.length === 0) continue;
      
      let name = '';
      let address = '';
      let neighborhood = '';
      
      // Analisar as partes
      // Geralmente: [0] = nome, [1] = endereço, [2] = bairro
      // Mas pode variar
      
      if (parts.length >= 1) {
        name = parts[0].trim();
        
        // Remover CPF/CNPJ do nome se estiver no final
        name = name.replace(/\s+\d{11,14}$/, '').trim();
      }
      
      if (parts.length >= 2) {
        // A segunda parte pode ser endereço ou continuação do nome
        const part2 = parts[1].trim();
        
        // Se contém padrão de endereço, é endereço
        if (part2.match(/(RUA|AV|AVENIDA|ROD|RODOVIA|EST|ESTRADA|PRAÇA|AL|ALAMEDA|TRAVESSA|BECO|VILA|LOTEAMENTO|BR-|RS|ERS|RST|KM|,|\/)/i)) {
          address = part2;
          
          // Se tem mais partes, a última pode ser bairro
          if (parts.length >= 3) {
            neighborhood = parts[parts.length - 1].trim();
          }
        } else {
          // Pode ser continuação do nome
          name += ' ' + part2;
          
          // Próxima parte deve ser endereço
          if (parts.length >= 3) {
            address = parts[2].trim();
            
            // Última parte é bairro
            if (parts.length >= 4) {
              neighborhood = parts[parts.length - 1].trim();
            }
          }
        }
      }
      
      // Se não encontrou endereço nas partes, tentar extrair do texto completo
      if (!address && remaining.length > name.length) {
        const afterName = remaining.substring(name.length).trim();
        
        // Procurar por padrão de endereço
        const addressMatch = afterName.match(/(RUA|AV|AVENIDA|ROD|RODOVIA|EST|ESTRADA|PRAÇA|AL|ALAMEDA|TRAVESSA|BECO|VILA|LOTEAMENTO|BR-|RS|ERS|RST)/i);
        if (addressMatch) {
          const addrStart = afterName.indexOf(addressMatch[0]);
          address = afterName.substring(addrStart).trim();
          
          // Remover bairro do final do endereço se estiver lá
          const bairroMatch = address.match(/\s+(CENTRO|CIDADE ALTA|VILA|BAIRRO|ZONA|DISTRITO|INTERIOR|COLONIA|PARADA|KM|NOVA|SANTOS|PRADO|LIBERDADE|IBIRAPUITA|OSWALDO|EMILIO|MORRO|AGUAS|PARADA|RINCAO|NOVA BRASILIA|SANTOS DUMONT|AGUAS CLARAS|MORRO GRANDE|PARADA 87|COLONIA NOVA|RINCAO DO MOSQUITO)(\s|$)/i);
          if (bairroMatch && !neighborhood) {
            neighborhood = bairroMatch[1].trim();
            address = address.substring(0, address.indexOf(bairroMatch[0])).trim();
          }
        }
      }
      
      // Limpar e normalizar
      name = name.trim();
      address = address.trim();
      neighborhood = neighborhood.trim() || null;
      
      // Normalizar cidade (primeira letra maiúscula)
      const normalizedCity = city.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      // Validar dados mínimos
      if (name.length < 3 || normalizedCity.length < 3) continue;
      
      restaurants.push({
        name: name,
        address: address || '',
        city: normalizedCity,
        neighborhood: neighborhood,
        phone: null,
        state: 'RS',
      });
      
      processed++;
      
      if (processed % 500 === 0) {
        console.log(`   Processados: ${processed}...`);
      }
    }
    
    // Remover duplicatas
    const uniqueRestaurants = [];
    const seen = new Set();
    
    for (const r of restaurants) {
      const key = `${r.name.toLowerCase().trim()}_${r.city.toLowerCase().trim()}`;
      if (!seen.has(key) && r.name.length > 2 && r.city.length > 2) {
        seen.add(key);
        uniqueRestaurants.push(r);
      }
    }
    
    console.log(`\n✅ Extraídos ${uniqueRestaurants.length} restaurantes únicos`);
    console.log(`📊 Total processado: ${restaurants.length}`);
    console.log(`🔄 Duplicatas removidas: ${restaurants.length - uniqueRestaurants.length}`);
    
    return uniqueRestaurants;
    
  } catch (error) {
    console.error('❌ Erro ao processar PDF:', error);
    throw error;
  }
}

// Executar
const pdfPath = process.argv[2] || './credentiados.pdf';

if (!fs.existsSync(pdfPath)) {
  console.error(`❌ Arquivo não encontrado: ${pdfPath}`);
  console.log('\n💡 Uso: node scripts/extract-pdf-improved.js caminho/para/pdf.pdf');
  process.exit(1);
}

extractRestaurantsFromPDF(pdfPath)
  .then(restaurants => {
    const outputPath = './restaurants-extracted.json';
    fs.writeFileSync(outputPath, JSON.stringify(restaurants, null, 2));
    console.log(`\n💾 Dados salvos em: ${outputPath}`);
    
    if (restaurants.length > 0) {
      console.log('\n📋 Exemplo dos primeiros restaurantes:');
      restaurants.slice(0, 5).forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.name}`);
        console.log(`   ${r.address || 'Sem endereço'}`);
        console.log(`   ${r.neighborhood ? r.neighborhood + ' - ' : ''}${r.city}`);
      });
    }
    
    console.log('\n✅ Próximo passo:');
    console.log(`   node scripts/import-pdf.js ${outputPath}`);
  })
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
