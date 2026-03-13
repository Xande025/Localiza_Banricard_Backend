import { PrismaClient } from '@prisma/client';
import { geocodeAddress } from '../src/services/geocoder.js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Importa restaurantes do JSON extraído do PDF para o banco de dados
 * @param {string} jsonPath - Caminho para o arquivo JSON
 * @param {boolean} skipGeocode - Se true, não faz geocodificação (mais rápido)
 */
async function importRestaurants(jsonPath, skipGeocode = false) {
  try {
    console.log('📂 Lendo arquivo JSON...');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    console.log(`📊 Encontrados ${data.length} restaurantes para importar`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (let i = 0; i < data.length; i++) {
      const restaurant = data[i];
      
      try {
        // Verificar se já existe (por nome e cidade)
        const existing = await prisma.restaurant.findFirst({
          where: {
            name: { equals: restaurant.name, mode: 'insensitive' },
            city: { equals: restaurant.city, mode: 'insensitive' },
          },
        });
        
        if (existing) {
          console.log(`⏭️  Já existe: ${restaurant.name} - ${restaurant.city}`);
          skipped++;
          continue;
        }
        
        // Geocodificar endereço
        let latitude = null;
        let longitude = null;
        
        if (!skipGeocode && restaurant.address) {
          const fullAddress = `${restaurant.address}, ${restaurant.neighborhood || ''}, ${restaurant.city}, RS, Brasil`
            .replace(/,\s*,/g, ',')
            .replace(/^,\s*|\s*,$/g, '');
          
          console.log(`🗺️  Geocodificando: ${fullAddress}`);
          const geocode = await geocodeAddress(fullAddress, restaurant.name, 'BR');
          
          if (geocode) {
            latitude = geocode.latitude.toString();
            longitude = geocode.longitude.toString();
            const locationType = geocode.locationType || 'N/A';
            console.log(`   ✅ Coordenadas: (${latitude}, ${longitude}) [${locationType}]`);
          } else {
            console.log(`   ⚠️  Não foi possível geocodificar`);
          }
          
          // Pequeno delay para não exceder limites da API
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Criar restaurante
        const created = await prisma.restaurant.create({
          data: {
            name: restaurant.name.trim(),
            address: restaurant.address?.trim() || '',
            city: restaurant.city.trim(),
            neighborhood: restaurant.neighborhood?.trim() || null,
            region: restaurant.region?.trim() || null,
            state: 'RS',
            phone: restaurant.phone?.trim() || null,
            email: restaurant.email?.trim() || null,
            website: restaurant.website?.trim() || null,
            latitude,
            longitude,
            verified: false,
            createdBy: 'pdf-import',
          },
        });
        
        console.log(`✅ Importado: ${created.name} (ID: ${created.id})`);
        imported++;
        
      } catch (error) {
        console.error(`❌ Erro ao importar ${restaurant.name}:`, error.message);
        errors++;
      }
      
      // Progresso
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 Progresso: ${i + 1}/${data.length} (${imported} importados, ${skipped} ignorados, ${errors} erros)\n`);
      }
    }
    
    console.log('\n✨ Importação concluída!');
    console.log(`✅ Importados: ${imported}`);
    console.log(`⏭️  Ignorados (já existem): ${skipped}`);
    console.log(`❌ Erros: ${errors}`);
    
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
const jsonPath = process.argv[2] || './restaurants-extracted.json';
const skipGeocode = process.argv.includes('--skip-geocode');

if (!fs.existsSync(jsonPath)) {
  console.error(`❌ Arquivo não encontrado: ${jsonPath}`);
  console.log('💡 Primeiro execute: node scripts/extract-pdf.js caminho/do/pdf.pdf');
  process.exit(1);
}

importRestaurants(jsonPath, skipGeocode)
  .then(() => {
    console.log('🎉 Concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
