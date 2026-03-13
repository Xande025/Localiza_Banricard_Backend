import prisma from '../lib/prisma.js';
import { geocodeAddress } from '../services/geocoder.js';

/**
 * Lista todos os restaurantes com filtros opcionais
 */
export const getAllRestaurants = async (req, res) => {
  try {
    const { city, neighborhood, region, search, verified, limit, offset } = req.query;

    const where = {};

    // Filtro por cidade
    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    // Filtro por bairro
    if (neighborhood) {
      where.neighborhood = { contains: neighborhood, mode: 'insensitive' };
    }

    // Filtro por região
    if (region) {
      where.region = { contains: region, mode: 'insensitive' };
    }

    // Busca por texto (nome ou endereço)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filtro por verificação
    if (verified !== undefined) {
      where.verified = verified === 'true';
    }

    // Executar query
    const restaurants = await prisma.restaurant.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
    });

    res.json({
      success: true,
      count: restaurants.length,
      data: restaurants
    });
  } catch (error) {
    console.error('Erro ao buscar restaurantes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar restaurantes',
      error: error.message
    });
  }
};

/**
 * Busca um restaurante por ID
 */
export const getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: parseInt(id) }
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante não encontrado'
      });
    }

    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('Erro ao buscar restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar restaurante',
      error: error.message
    });
  }
};

/**
 * Cria um novo restaurante
 */
export const createRestaurant = async (req, res) => {
  try {
    const { name, address, city, neighborhood, region, phone, email, website, latitude, longitude } = req.body;

    let lat = latitude ? parseFloat(latitude) : null;
    let lng = longitude ? parseFloat(longitude) : null;

    // Geocodificar se não tiver coordenadas
    if (!lat || !lng) {
      const fullAddress = `${address}, ${neighborhood || ''}, ${city}, RS, Brasil`.replace(/,\s*,/g, ',').replace(/^,\s*|\s*,$/g, '');
      const geocode = await geocodeAddress(fullAddress, name, 'BR');
      
      if (geocode) {
        lat = geocode.latitude;
        lng = geocode.longitude;
        console.log(`Geocodificado: ${fullAddress} → (${lat}, ${lng}) [${geocode.locationType || 'N/A'}]`);
      } else {
        console.warn(`Não foi possível geocodificar: ${fullAddress}`);
      }
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        address,
        city,
        neighborhood,
        region,
        phone,
        email,
        website,
        latitude: lat ? lat.toString() : null,
        longitude: lng ? lng.toString() : null,
        createdBy: req.body.createdBy || 'user'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Restaurante criado com sucesso',
      data: restaurant
    });
  } catch (error) {
    console.error('Erro ao criar restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar restaurante',
      error: error.message
    });
  }
};

/**
 * Atualiza um restaurante existente
 */
export const updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Converter coordenadas para string se fornecidas
    if (updateData.latitude !== undefined) {
      updateData.latitude = updateData.latitude ? parseFloat(updateData.latitude).toString() : null;
    }
    if (updateData.longitude !== undefined) {
      updateData.longitude = updateData.longitude ? parseFloat(updateData.longitude).toString() : null;
    }

    // Se endereço foi alterado, re-geocodificar
    if (updateData.address || updateData.city || updateData.neighborhood) {
      const existing = await prisma.restaurant.findUnique({ where: { id: parseInt(id) } });
      if (existing) {
        const newAddress = updateData.address || existing.address;
        const newCity = updateData.city || existing.city;
        const newNeighborhood = updateData.neighborhood !== undefined ? updateData.neighborhood : existing.neighborhood;
        const placeName = updateData.name || existing.name;
        
        const fullAddress = `${newAddress}, ${newNeighborhood || ''}, ${newCity}, RS, Brasil`.replace(/,\s*,/g, ',').replace(/^,\s*|\s*,$/g, '');
        const geocode = await geocodeAddress(fullAddress, placeName, 'BR');
        
        if (geocode) {
          updateData.latitude = geocode.latitude.toString();
          updateData.longitude = geocode.longitude.toString();
        }
      }
    }

    const restaurant = await prisma.restaurant.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Restaurante atualizado com sucesso',
      data: restaurant
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Restaurante não encontrado'
      });
    }
    console.error('Erro ao atualizar restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar restaurante',
      error: error.message
    });
  }
};

/**
 * Remove um restaurante
 */
export const deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.restaurant.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Restaurante removido com sucesso'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Restaurante não encontrado'
      });
    }
    console.error('Erro ao remover restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover restaurante',
      error: error.message
    });
  }
};

/**
 * Lista todas as cidades únicas
 */
export const getCities = async (req, res) => {
  try {
    const cities = await prisma.restaurant.findMany({
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' }
    });

    res.json({
      success: true,
      data: cities.map(c => c.city)
    });
  } catch (error) {
    console.error('Erro ao buscar cidades:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar cidades',
      error: error.message
    });
  }
};

/**
 * Lista todos os bairros únicos (opcionalmente filtrado por cidade)
 */
export const getNeighborhoods = async (req, res) => {
  try {
    const { city } = req.query;
    const where = {
      neighborhood: { not: null }
    };

    if (city) {
      where.city = city;
    }

    const neighborhoods = await prisma.restaurant.findMany({
      where,
      select: { neighborhood: true },
      distinct: ['neighborhood'],
      orderBy: { neighborhood: 'asc' }
    });

    res.json({
      success: true,
      data: neighborhoods.map(n => n.neighborhood).filter(Boolean)
    });
  } catch (error) {
    console.error('Erro ao buscar bairros:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar bairros',
      error: error.message
    });
  }
};

/**
 * Lista todas as regiões únicas
 */
export const getRegions = async (req, res) => {
  try {
    const regions = await prisma.restaurant.findMany({
      where: { region: { not: null } },
      select: { region: true },
      distinct: ['region'],
      orderBy: { region: 'asc' }
    });

    res.json({
      success: true,
      data: regions.map(r => r.region).filter(Boolean)
    });
  } catch (error) {
    console.error('Erro ao buscar regiões:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar regiões',
      error: error.message
    });
  }
};
