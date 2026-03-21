import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { geocodeAddress } from '../services/geocoder.js';

/** Haversine distance in km (PostgreSQL) — lat/lng in degrees */
function sqlDistanceKm(lat, lng) {
  return Prisma.sql`(6371 * 2 * asin(sqrt(
    least(1.0, greatest(0.0,
      pow(sin((radians(latitude::float8) - radians(${lat})) / 2), 2) +
      cos(radians(${lat})) * cos(radians(latitude::float8)) *
      pow(sin((radians(longitude::float8) - radians(${lng})) / 2), 2)
    ))
  )))`;
}

function mapRawRestaurantRow(row) {
  const toStr = (v) => (v == null ? null : String(v));
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    neighborhood: row.neighborhood,
    region: row.region,
    state: row.state,
    phone: row.phone,
    email: row.email,
    website: row.website,
    latitude: toStr(row.latitude),
    longitude: toStr(row.longitude),
    verified: row.verified,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    distanceKm: row.distance_km != null ? Number(row.distance_km) : undefined,
  };
}

/**
 * Lista todos os restaurantes com filtros opcionais.
 * Com lat, lng e radiusKm válidos, filtra por distância (km) no servidor (haversine).
 */
export const getAllRestaurants = async (req, res) => {
  try {
    const { city, neighborhood, region, search, verified, limit, offset, lat, lng, radiusKm } = req.query;

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = parseFloat(radiusKm);
    const geoActive =
      Number.isFinite(latNum) &&
      Number.isFinite(lngNum) &&
      Number.isFinite(radiusNum) &&
      radiusNum > 0 &&
      latNum >= -90 &&
      latNum <= 90 &&
      lngNum >= -180 &&
      lngNum <= 180;

    if (geoActive) {
      const conditions = [
        Prisma.sql`latitude IS NOT NULL AND longitude IS NOT NULL`,
        Prisma.sql`${sqlDistanceKm(latNum, lngNum)} <= ${radiusNum}`,
      ];

      if (city) {
        conditions.push(Prisma.sql`city ILIKE ${'%' + city + '%'}`);
      }
      if (neighborhood) {
        conditions.push(Prisma.sql`COALESCE(neighborhood, '') ILIKE ${'%' + neighborhood + '%'}`);
      }
      if (region) {
        conditions.push(Prisma.sql`COALESCE(region, '') ILIKE ${'%' + region + '%'}`);
      }
      if (search) {
        const pattern = '%' + search + '%';
        conditions.push(Prisma.sql`(name ILIKE ${pattern} OR address ILIKE ${pattern})`);
      }
      if (verified !== undefined) {
        conditions.push(Prisma.sql`verified = ${verified === 'true'}`);
      }

      const whereSql = Prisma.join(conditions, ' AND ');
      const take = limit ? parseInt(limit, 10) : undefined;
      const skip = offset ? parseInt(offset, 10) : 0;

      const limitClause =
        Number.isFinite(take) && take > 0 ? Prisma.sql`LIMIT ${take}` : Prisma.empty;
      const offsetClause =
        Number.isFinite(skip) && skip > 0 ? Prisma.sql`OFFSET ${skip}` : Prisma.empty;

      const dist = sqlDistanceKm(latNum, lngNum);
      const rows = await prisma.$queryRaw`
        SELECT
          id, name, address, city, neighborhood, region, state, phone, email, website,
          latitude, longitude, verified, created_by, created_at, updated_at,
          ${dist} AS distance_km
        FROM restaurants
        WHERE ${whereSql}
        ORDER BY distance_km ASC
        ${limitClause}
        ${offsetClause}
      `;

      const restaurants = rows.map(mapRawRestaurantRow);

      return res.json({
        success: true,
        count: restaurants.length,
        data: restaurants,
      });
    }

    const where = {};

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (neighborhood) {
      where.neighborhood = { contains: neighborhood, mode: 'insensitive' };
    }

    if (region) {
      where.region = { contains: region, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (verified !== undefined) {
      where.verified = verified === 'true';
    }

    const restaurants = await prisma.restaurant.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
    });

    res.json({
      success: true,
      count: restaurants.length,
      data: restaurants,
    });
  } catch (error) {
    console.error('Erro ao buscar restaurantes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar restaurantes',
      error: error.message,
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
    // Usa groupBy ao invés de distinct para melhor compatibilidade
    const cities = await prisma.restaurant.groupBy({
      by: ['city'],
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

    // Usa groupBy ao invés de distinct
    const neighborhoods = await prisma.restaurant.groupBy({
      where,
      by: ['neighborhood'],
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
    // Usa groupBy ao invés de distinct
    const regions = await prisma.restaurant.groupBy({
      where: { region: { not: null } },
      by: ['region'],
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
