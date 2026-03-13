import axios from 'axios';

/**
 * Geocodifica um endereço usando Google Maps Geocoding API
 * Prioriza Places API quando tiver nome do estabelecimento (igual ao Google Maps)
 * @param {string} address - Endereço completo para geocodificar
 * @param {string} placeName - Nome do estabelecimento (opcional, usado para melhorar precisão)
 * @param {string} region - Região/estado (padrão: 'BR' para Brasil)
 * @returns {Promise<{latitude: number, longitude: number, formattedAddress: string, locationType?: string} | null>}
 */
export async function geocodeAddress(address, placeName = null, region = 'BR') {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('GOOGLE_MAPS_API_KEY não configurada. Geocodificação desabilitada.');
      return null;
    }

    // PRIORIDADE 1: Se tiver nome do estabelecimento, tentar Places API PRIMEIRO
    // (igual ao Google Maps faz quando você busca pelo nome)
    if (placeName) {
      const placesResult = await searchPlaceByName(placeName, address, region);
      if (placesResult) {
        return placesResult;
      }
    }

    // PRIORIDADE 2: Se Places API não encontrou, tentar geocodificar o endereço
    let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=${region}&key=${apiKey}`;
    
    const response = await axios.get(url);
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      const location = result.geometry.location;
      const locationType = result.geometry.location_type;
      
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
        locationType: locationType
      };
    }
    
    if (response.data.status === 'ZERO_RESULTS') {
      console.warn(`Nenhum resultado encontrado para: ${address}`);
      return null;
    }
    
    console.warn(`Erro na geocodificação: ${response.data.status} - ${address}`);
    return null;
  } catch (error) {
    console.error('Erro na geocodificação:', error.message);
    return null;
  }
}

/**
 * Busca um estabelecimento usando Places API (Text Search)
 * Tenta múltiplas variações da query para melhorar resultados (como o Google Maps faz)
 * @param {string} placeName - Nome do estabelecimento
 * @param {string} address - Endereço para contexto
 * @param {string} region - Região/estado
 * @returns {Promise<{latitude: number, longitude: number, formattedAddress: string, locationType: string} | null>}
 */
async function searchPlaceByName(placeName, address, region = 'BR') {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    // Tentar múltiplas variações da query (como o Google Maps faz)
    
    // 1. Nome + endereço completo
    let query = `${placeName}, ${address}`;
    let result = await tryPlaceSearch(query, region);
    if (result) return result;

    // 2. Nome + cidade (extrair cidade do endereço)
    const cityMatch = address.match(/([^,]+),\s*RS/i);
    if (cityMatch) {
      const city = cityMatch[1].trim();
      
      // Nome + cidade + RS + Brasil
      query = `${placeName}, ${city}, RS, Brasil`;
      result = await tryPlaceSearch(query, region);
      if (result) return result;
      
      // Apenas nome + cidade
      query = `${placeName}, ${city}`;
      result = await tryPlaceSearch(query, region);
      if (result) return result;
    }

    return null;
  } catch (error) {
    console.warn('Places API não disponível ou erro ao buscar estabelecimento:', error.message);
    return null;
  }
}

/**
 * Tenta fazer uma busca na Places API
 * @param {string} query - Query de busca
 * @param {string} region - Região/estado
 * @returns {Promise<{latitude: number, longitude: number, formattedAddress: string, locationType: string} | null>}
 */
async function tryPlaceSearch(query, region) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=${region}&key=${apiKey}`;
    
    const response = await axios.get(url);
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const place = response.data.results[0];
      const location = place.geometry.location;
      
      // Se tiver place_id, obter detalhes mais precisos via Place Details API
      if (place.place_id) {
        const details = await getPlaceDetails(place.place_id);
        if (details) return details;
      }
      
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: place.formatted_address || query,
        locationType: 'PLACE'
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Obtém detalhes precisos de um lugar usando Place Details API
 * @param {string} placeId - ID do lugar na Places API
 * @returns {Promise<{latitude: number, longitude: number, formattedAddress: string, locationType: string} | null>}
 */
async function getPlaceDetails(placeId) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${apiKey}`;
    
    const response = await axios.get(url);
    
    if (response.data.status === 'OK' && response.data.result) {
      const place = response.data.result;
      const location = place.geometry.location;
      
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: place.formatted_address || '',
        locationType: 'PLACE_DETAILS'
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}
