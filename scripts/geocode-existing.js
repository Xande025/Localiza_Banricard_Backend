import { PrismaClient } from '@prisma/client';
import { geocodeAddress } from '../src/services/geocoder.js';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Tenta extrair o endereço do campo name quando address está vazio
 * @param {string} name - Nome do estabelecimento que pode conter endereço
 * @param {string} city - Cidade para remover do final
 * @returns {string|null} - Endereço extraído ou null
 */
function extractAddressFromName(name, city) {
  if (!name || name.trim().length === 0) return null;
  
  // Padrões comuns de endereços (R, AV, RUA, etc.)
  const addressPatterns = [
    /(R\.?\s+[A-Z][^,]+(?:,\s*\d+)?)/i,           // R. Nome, número
    /(AV\.?\s+[A-Z][^,]+(?:,\s*\d+)?)/i,          // AV. Nome, número
    /(AVENIDA\s+[A-Z][^,]+(?:,\s*\d+)?)/i,        // AVENIDA Nome, número
    /(RUA\s+[A-Z][^,]+(?:,\s*\d+)?)/i,            // RUA Nome, número
    /(ESTRADA\s+[A-Z][^,]+(?:,\s*\d+)?)/i,        // ESTRADA Nome, número
    /(RODOVIA\s+[A-Z][^,]+(?:,\s*\d+)?)/i,        // RODOVIA Nome, número
    /(PRAÇA\s+[A-Z][^,]+(?:,\s*\d+)?)/i,          // PRAÇA Nome, número
    /(ALAMEDA\s+[A-Z][^,]+(?:,\s*\d+)?)/i,        // ALAMEDA Nome, número
    /(TRAVESSA\s+[A-Z][^,]+(?:,\s*\d+)?)/i,       // TRAVESSA Nome, número
  ];
  
  // Tentar encontrar padrão de endereço
  for (const pattern of addressPatterns) {
    const match = name.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Se não encontrou padrão específico, tentar remover a cidade do final
  // e usar o que sobrar como endereço (pode conter endereço + bairro)
  if (city) {
    const cityPattern = new RegExp(`\\s*-\\s*${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const withoutCity = name.replace(cityPattern, '').trim();
    
    // Se sobrou algo significativo (mais de 10 caracteres), usar como endereço
    if (withoutCity.length > 10) {
      return withoutCity;
    }
  }
  
  return null;
}

/**
 * Geocodifica restaurantes que ainda não têm coordenadas ou re-geocodifica todos
 * @param {number} limit - Limite de restaurantes para processar (0 = todos)
 * @param {number} delay - Delay em ms entre requisições (padrão: 100ms)
 * @param {boolean} regeocodeAll - Se true, re-geocodifica todos os restaurantes (incluindo os que já têm coordenadas)
 * @param {string} city - Filtrar por cidade (opcional)
 */
async function geocodeExistingRestaurants(limit = 0, delay = 100, regeocodeAll = false, city = null) {
  try {
    if (city) {
      console.log(`🏙️  Filtrando por cidade: ${city}\n`);
    }
    
    if (regeocodeAll) {
      console.log('🔄 Re-geocodificando TODOS os restaurantes para melhorar precisão...\n');
    } else {
    console.log('🔍 Buscando restaurantes sem coordenadas...\n');
    }
    
    // Construir cláusula where
    let whereClause = regeocodeAll ? {} : {
        OR: [
          { latitude: null },
          { longitude: null },
        ],
    };
    
    // Adicionar filtro de cidade se fornecido
    if (city) {
      whereClause.city = { equals: city, mode: 'insensitive' };
    }
    
    // Buscar restaurantes
    const restaurants = await prisma.restaurant.findMany({
      where: whereClause,
      ...(limit > 0 && { take: limit }),
    });
    
    if (restaurants.length === 0) {
      if (regeocodeAll) {
        console.log('⚠️  Nenhum restaurante encontrado no banco de dados!');
      } else {
      console.log('✅ Todos os restaurantes já têm coordenadas!');
      }
      return;
    }
    
    if (regeocodeAll) {
      if (city) {
        console.log(`📊 Re-geocodificando ${restaurants.length} restaurantes de ${city} para melhorar precisão\n`);
      } else {
        console.log(`📊 Re-geocodificando ${restaurants.length} restaurantes para melhorar precisão\n`);
      }
    } else {
      if (city) {
        console.log(`📊 Encontrados ${restaurants.length} restaurantes sem coordenadas em ${city}\n`);
      } else {
    console.log(`📊 Encontrados ${restaurants.length} restaurantes para geocodificar\n`);
      }
    }
    
    let success = 0;
    let failed = 0;
    let skipped = 0;
    
    for (let i = 0; i < restaurants.length; i++) {
      const restaurant = restaurants[i];
      
      try {
        // Tentar obter endereço do campo address ou extrair do name
        let addressToGeocode = restaurant.address?.trim() || '';
        let addressSource = 'campo address';
        
        // Se não tem endereço, tentar extrair do nome
        if (!addressToGeocode || addressToGeocode.length === 0) {
          const extractedAddress = extractAddressFromName(restaurant.name, restaurant.city);
          
          if (extractedAddress) {
            addressToGeocode = extractedAddress;
            addressSource = 'extraído do nome';
            console.log(`🔍 [${i + 1}/${restaurants.length}] Endereço extraído do nome: ${restaurant.name}`);
            console.log(`   📍 Endereço extraído: ${addressToGeocode}`);
          } else {
            // Se ainda não conseguiu, tentar usar o nome completo (menos a cidade)
            if (restaurant.city) {
              const cityPattern = new RegExp(`\\s*-\\s*${restaurant.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
              const nameWithoutCity = restaurant.name.replace(cityPattern, '').trim();
              
              if (nameWithoutCity.length > 10) {
                addressToGeocode = nameWithoutCity;
                addressSource = 'nome completo (sem cidade)';
                console.log(`🔍 [${i + 1}/${restaurants.length}] Tentando usar nome completo: ${restaurant.name}`);
                console.log(`   📍 Endereço derivado: ${addressToGeocode}`);
              } else {
                console.log(`⏭️  [${i + 1}/${restaurants.length}] Sem endereço: ${restaurant.name} - ${restaurant.city}`);
                skipped++;
                continue;
              }
            } else {
              console.log(`⏭️  [${i + 1}/${restaurants.length}] Sem endereço: ${restaurant.name} - ${restaurant.city}`);
              skipped++;
              continue;
            }
          }
        }
        
        // Montar endereço completo para geocodificação
        const addressParts = [
          addressToGeocode,
          restaurant.neighborhood,
          restaurant.city,
          restaurant.state,
          'Brasil'
        ].filter(part => part && part.trim().length > 0);
        
        const fullAddress = addressParts.join(', ');
        
        console.log(`🗺️  [${i + 1}/${restaurants.length}] Geocodificando: ${restaurant.name}`);
        console.log(`   📍 Endereço (${addressSource}): ${fullAddress}`);
        
        const geocode = await geocodeAddress(fullAddress, restaurant.name, 'BR');
        
        if (geocode) {
          // Preparar dados para atualização
          const updateData = {
            latitude: geocode.latitude.toString(),
            longitude: geocode.longitude.toString(),
          };
          
          // Se o endereço foi extraído do nome, também atualizar o campo address
          if (addressSource !== 'campo address' && addressToGeocode) {
            updateData.address = addressToGeocode;
            console.log(`   📝 Endereço salvo no banco: ${addressToGeocode}`);
          }
          
          await prisma.restaurant.update({
            where: { id: restaurant.id },
            data: updateData,
          });
          
          const locationType = geocode.locationType || 'N/A';
          console.log(`   ✅ Coordenadas: (${geocode.latitude}, ${geocode.longitude}) [${locationType}]`);
          success++;
        } else {
          console.log(`   ⚠️  Não foi possível geocodificar`);
          failed++;
        }
        
        // Delay para não exceder limites da API
        if (i < restaurants.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        console.error(`   ❌ Erro: ${error.message}`);
        failed++;
      }
      
      // Progresso a cada 10 restaurantes
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 Progresso: ${i + 1}/${restaurants.length} (${success} sucesso, ${failed} falhas, ${skipped} ignorados)\n`);
      }
    }
    
    console.log('\n✨ Geocodificação concluída!');
    console.log(`✅ Sucesso: ${success}`);
    console.log(`❌ Falhas: ${failed}`);
    console.log(`⏭️  Ignorados (sem endereço): ${skipped}`);
    console.log(`📊 Total processado: ${restaurants.length}`);
    
    // Estatísticas finais (apenas se não estiver re-geocodificando todos)
    if (!regeocodeAll) {
    const remaining = await prisma.restaurant.count({
      where: {
        OR: [
          { latitude: null },
          { longitude: null },
        ],
      },
    });
    
    if (remaining > 0) {
      console.log(`\n⚠️  Ainda restam ${remaining} restaurantes sem coordenadas.`);
      console.log('💡 Execute novamente para continuar: npm run geocode:existing');
    } else {
      console.log('\n🎉 Todos os restaurantes foram geocodificados!');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na geocodificação:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const delayArg = args.find(arg => arg.startsWith('--delay='));
const cityArg = args.find(arg => arg.startsWith('--city='));
const regeocodeAll = args.includes('--all') || args.includes('--regeocode-all');

const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 0;
const delay = delayArg ? parseInt(delayArg.split('=')[1]) : 100;
const city = cityArg ? cityArg.split('=')[1] : null;

console.log('🚀 Iniciando geocodificação de restaurantes existentes...\n');
console.log(`⚙️  Configuração:`);
console.log(`   - Modo: ${regeocodeAll ? 'Re-geocodificar todos' : 'Apenas sem coordenadas'}`);
if (city) {
  console.log(`   - Cidade: ${city}`);
}
console.log(`   - Limite: ${limit === 0 ? 'Todos' : limit}`);
console.log(`   - Delay: ${delay}ms entre requisições\n`);

geocodeExistingRestaurants(limit, delay, regeocodeAll, city)
  .then(() => {
    console.log('\n🎉 Concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
