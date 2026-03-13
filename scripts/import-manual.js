import { PrismaClient } from '@prisma/client';
import { geocodeAddress } from '../src/services/geocoder.js';
import fs from 'fs';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Importa restaurantes de um arquivo JSON manualmente formatado
 * Útil quando a extração automática do PDF não funciona bem
 */
async function importManualJSON(jsonPath) {
  try {
    console.log('📂 Lendo arquivo JSON...');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    if (!Array.isArray(data)) {
      throw new Error('O JSON deve ser um array de restaurantes');
    }
    
    console.log(`📊 Encontrados ${data.length} restaurantes para importar`);
    console.log('\n⚠️  IMPORTANTE: Certifique-se de que o JSON está no formato correto!');
    console.log('Formato esperado:');
    console.log(JSON.stringify({
      name: "Nome do Restaurante",
      address: "Rua Exemplo, 123",
      city: "Porto Alegre",
      neighborhood: "Centro",
      region: "Metropolitana",
      phone: "(51) 1234-5678",
      email: "contato@exemplo.com",
      website: "https://www.exemplo.com"
    }, null, 2));
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\nDeseja continuar? (s/n): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 's') {
      console.log('❌ Importação cancelada');
      return;
    }
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (let i = 0; i < data.length; i++) {
      const restaurant = data[i];
      
      try {
        // Validar dados obrigatórios
        if (!restaurant.name || !restaurant.city) {
          console.log(`⚠️  Ignorado (faltam dados): ${restaurant.name || 'Sem nome'}`);
          skipped++;
          continue;
        }
        
        // Verificar se já existe
        const existing = await prisma.restaurant.findFirst({
          where: {
            name: { equals: restaurant.name.trim(), mode: 'insensitive' },
            city: { equals: restaurant.city.trim(), mode: 'insensitive' },
          },
        });
        
        if (existing) {
          console.log(`⏭️  Já existe: ${restaurant.name} - ${restaurant.city}`);
          skipped++;
          continue;
        }
        
        // Geocodificar se tiver endereço
        let latitude = null;
        let longitude = null;
        
        if (restaurant.address) {
          const fullAddress = `${restaurant.address}, ${restaurant.neighborhood || ''}, ${restaurant.city}, RS, Brasil`
            .replace(/,\s*,/g, ',')
            .replace(/^,\s*|\s*,$/g, '');
          
          console.log(`🗺️  Geocodificando: ${restaurant.name}`);
          const geocode = await geocodeAddress(fullAddress, restaurant.name, 'BR');
          
          if (geocode) {
            latitude = geocode.latitude.toString();
            longitude = geocode.longitude.toString();
            const locationType = geocode.locationType || 'N/A';
            console.log(`   ✅ Coordenadas: (${latitude}, ${longitude}) [${locationType}]`);
          }
          
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
            state: restaurant.state?.trim() || 'RS',
            phone: restaurant.phone?.trim() || null,
            email: restaurant.email?.trim() || null,
            website: restaurant.website?.trim() || null,
            latitude,
            longitude,
            verified: false,
            createdBy: 'manual-import',
          },
        });
        
        console.log(`✅ Importado: ${created.name} (ID: ${created.id})`);
        imported++;
        
      } catch (error) {
        console.error(`❌ Erro ao importar ${restaurant.name}:`, error.message);
        errors++;
      }
      
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 Progresso: ${i + 1}/${data.length}\n`);
      }
    }
    
    console.log('\n✨ Importação concluída!');
    console.log(`✅ Importados: ${imported}`);
    console.log(`⏭️  Ignorados: ${skipped}`);
    console.log(`❌ Erros: ${errors}`);
    
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const jsonPath = process.argv[2];

if (!jsonPath) {
  console.error('❌ Especifique o caminho do arquivo JSON');
  console.log('Uso: node scripts/import-manual.js caminho/para/restaurants.json');
  process.exit(1);
}

if (!fs.existsSync(jsonPath)) {
  console.error(`❌ Arquivo não encontrado: ${jsonPath}`);
  process.exit(1);
}

importManualJSON(jsonPath)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
