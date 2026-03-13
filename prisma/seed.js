import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes (opcional - cuidado em produção!)
  // await prisma.updateHistory.deleteMany();
  // await prisma.restaurant.deleteMany();

  // Exemplos de restaurantes para teste
  const restaurants = [
    {
      name: 'Restaurante Exemplo 1',
      address: 'Rua dos Andradas, 1234',
      city: 'Porto Alegre',
      neighborhood: 'Centro Histórico',
      region: 'Metropolitana',
      state: 'RS',
      phone: '(51) 3221-1234',
      email: 'contato@exemplo1.com.br',
      website: 'https://www.exemplo1.com.br',
      latitude: '-30.0346',
      longitude: '-51.2177',
      verified: false,
      createdBy: 'seed',
    },
    {
      name: 'Lanchonete Exemplo 2',
      address: 'Av. Assis Brasil, 5678',
      city: 'Porto Alegre',
      neighborhood: 'Cristal',
      region: 'Metropolitana',
      state: 'RS',
      phone: '(51) 3333-5678',
      verified: false,
      createdBy: 'seed',
    },
    {
      name: 'Padaria Exemplo 3',
      address: 'Rua João Pessoa, 901',
      city: 'Caxias do Sul',
      neighborhood: 'Centro',
      region: 'Serra',
      state: 'RS',
      phone: '(54) 3221-9012',
      verified: false,
      createdBy: 'seed',
    },
  ];

  for (const restaurant of restaurants) {
    const created = await prisma.restaurant.create({
      data: restaurant,
    });
    console.log(`✅ Criado restaurante: ${created.name} (ID: ${created.id})`);
  }

  console.log('✨ Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
