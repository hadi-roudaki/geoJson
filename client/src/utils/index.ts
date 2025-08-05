import { GeoJSONFeatureCollection, GeoJSONFeature } from '../types';
import * as turf from '@turf/turf';

// Utility functions
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

// GeoJSON validation utilities (RFC 7946 compliant)
export const validateGeoJSON = (data: any): any => {
  // Check if data is an object
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid GeoJSON: Data must be a non-null object');
  }

  // Check if it's a Feature or FeatureCollection
  if (data.type === 'Feature') {
    // Validate single Feature
    validateGeoJSONFeature(data, 0);

    // Convert single Feature to FeatureCollection for consistency
    return {
      type: 'FeatureCollection',
      features: [data]
    };
  } else if (data.type === 'FeatureCollection') {
    // Validate FeatureCollection
    return validateGeoJSONFeatureCollection(data);
  } else {
    throw new Error('Invalid GeoJSON: Type must be "Feature" or "FeatureCollection"');
  }
};

// Legacy function for FeatureCollection validation
export const validateGeoJSONFeatureCollection = (data: any): data is GeoJSONFeatureCollection => {
  // Check if data is an object
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid GeoJSON: Data must be a non-null object');
  }

  // Check required top-level properties
  if (data.type !== 'FeatureCollection') {
    throw new Error('Invalid GeoJSON: Type must be "FeatureCollection"');
  }

  // Name is optional but if present must be a string
  if (data.name !== undefined && typeof data.name !== 'string') {
    throw new Error('Invalid GeoJSON: Name must be a string if provided');
  }

  // CRS is optional in RFC 7946 (deprecated but still supported for backward compatibility)
  if (data.crs !== undefined) {
    if (!data.crs || typeof data.crs !== 'object') {
      throw new Error('Invalid GeoJSON: CRS must be an object if provided');
    }

    if (data.crs.type !== 'name') {
      throw new Error('Invalid GeoJSON: CRS type must be "name"');
    }

    if (!data.crs.properties || typeof data.crs.properties.name !== 'string') {
      throw new Error('Invalid GeoJSON: CRS properties.name must be a string');
    }
  }

  // Validate features array
  if (!Array.isArray(data.features)) {
    throw new Error('Invalid GeoJSON: Features must be an array');
  }

  if (data.features.length === 0) {
    throw new Error('Invalid GeoJSON: Features array cannot be empty');
  }

  // Check for reasonable feature count (prevent extremely large files)
  if (data.features.length > 10000) {
    throw new Error('Invalid GeoJSON: Too many features (maximum 10,000 allowed)');
  }

  // Validate each feature
  data.features.forEach((feature: any, index: number) => {
    validateGeoJSONFeature(feature, index);
  });

  return data;
};

const validateGeoJSONFeature = (feature: any, index: number): boolean => {
  const prefix = `Feature ${index + 1}:`;

  if (!feature || typeof feature !== 'object' || Array.isArray(feature)) {
    throw new Error(`${prefix} Must be a non-null object`);
  }

  if (feature.type !== 'Feature') {
    throw new Error(`${prefix} Type must be "Feature"`);
  }

  // Validate properties (can be null according to RFC 7946)
  if (feature.properties !== null && (typeof feature.properties !== 'object' || Array.isArray(feature.properties))) {
    throw new Error(`${prefix} Properties must be an object or null`);
  }

  // Properties validation is more flexible for RFC 7946
  // We only validate specific properties if they exist
  const props = feature.properties || {};

  // Optional validation for application-specific properties
  if (props.id !== undefined && typeof props.id !== 'number' && typeof props.id !== 'string') {
    throw new Error(`${prefix} Properties.id must be a number or string if provided`);
  }

  if (props.area_acres !== undefined && (typeof props.area_acres !== 'number' || props.area_acres < 0)) {
    throw new Error(`${prefix} Properties.area_acres must be a non-negative number if provided`);
  }

  // Optional validation for application-specific properties
  if (props.owner !== undefined && (typeof props.owner !== 'string' || props.owner.trim() === '')) {
    throw new Error(`${prefix} Properties.owner must be a non-empty string if provided`);
  }

  if (props.name !== undefined && (typeof props.name !== 'string' || props.name.trim() === '')) {
    throw new Error(`${prefix} Properties.name must be a non-empty string if provided`);
  }

  // Project__Name can be null but if present must be a non-empty string
  if (props.Project__Name !== undefined && props.Project__Name !== null && (typeof props.Project__Name !== 'string' || props.Project__Name.trim() === '')) {
    throw new Error(`${prefix} Properties.Project__Name must be a non-empty string or null if provided`);
  }

  // Validate geometry (can be null according to RFC 7946)
  if (feature.geometry !== null) {
    if (!feature.geometry || typeof feature.geometry !== 'object' || Array.isArray(feature.geometry)) {
      throw new Error(`${prefix} Geometry must be an object or null`);
    }

    // RFC 7946 supports these geometry types
    const validGeometryTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'];

    if (!validGeometryTypes.includes(feature.geometry.type)) {
      throw new Error(`${prefix} Geometry type must be one of: ${validGeometryTypes.join(', ')}`);
    }

    if (!Array.isArray(feature.geometry.coordinates) && feature.geometry.type !== 'GeometryCollection') {
      throw new Error(`${prefix} Geometry coordinates must be an array (except for GeometryCollection)`);
    }

    // Basic coordinate validation based on geometry type
    validateGeometryCoordinates(feature.geometry, prefix);
  }

  return true;
};

// Geometry coordinate validation function
const validateGeometryCoordinates = (geometry: any, prefix: string): void => {
  const { type, coordinates } = geometry;

  switch (type) {
    case 'Point':
      validatePosition(coordinates, `${prefix} Point coordinates`);
      break;

    case 'LineString':
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        throw new Error(`${prefix} LineString must have at least 2 positions`);
      }
      coordinates.forEach((pos: any, i: number) =>
        validatePosition(pos, `${prefix} LineString position ${i + 1}`)
      );
      break;

    case 'Polygon':
      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        throw new Error(`${prefix} Polygon coordinates must be a non-empty array`);
      }
      coordinates.forEach((ring: any, ringIndex: number) => {
        if (!Array.isArray(ring) || ring.length < 4) {
          throw new Error(`${prefix} Polygon ring ${ringIndex + 1} must have at least 4 positions`);
        }
        ring.forEach((pos: any, i: number) =>
          validatePosition(pos, `${prefix} Polygon ring ${ringIndex + 1} position ${i + 1}`)
        );
        // Check if ring is closed
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          throw new Error(`${prefix} Polygon ring ${ringIndex + 1} must be closed (first and last positions must be the same)`);
        }
      });
      break;

    case 'MultiPoint':
    case 'MultiLineString':
    case 'MultiPolygon':
      // Basic validation for Multi* geometries
      if (!Array.isArray(coordinates)) {
        throw new Error(`${prefix} ${type} coordinates must be an array`);
      }
      break;

    case 'GeometryCollection':
      if (!Array.isArray(geometry.geometries)) {
        throw new Error(`${prefix} GeometryCollection must have a geometries array`);
      }
      geometry.geometries.forEach((geom: any, i: number) =>
        validateGeometryCoordinates(geom, `${prefix} GeometryCollection geometry ${i + 1}`)
      );
      break;
  }
};

// Position validation helper
const validatePosition = (position: any, context: string): void => {
  if (!Array.isArray(position) || position.length < 2) {
    throw new Error(`${context} must be an array of at least 2 numbers [longitude, latitude]`);
  }

  const [lng, lat] = position;

  if (typeof lng !== 'number' || typeof lat !== 'number') {
    throw new Error(`${context} must contain valid numbers`);
  }

  // Validate coordinate ranges (longitude: -180 to 180, latitude: -90 to 90)
  if (lng < -180 || lng > 180) {
    throw new Error(`${context} longitude ${lng} is out of range (-180 to 180)`);
  }

  if (lat < -90 || lat > 90) {
    throw new Error(`${context} latitude ${lat} is out of range (-90 to 90)`);
  }

  // Check for NaN or Infinity
  if (!isFinite(lng) || !isFinite(lat)) {
    throw new Error(`${context} contains invalid numbers (NaN or Infinity)`);
  }

  return true;
};

export const parseGeoJSONFile = async (file: File): Promise<GeoJSONFeatureCollection> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;

        // Check if file is empty
        if (!text || text.trim().length === 0) {
          reject('File is empty');
          return;
        }

        // Parse JSON with better error handling
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          reject(`Invalid JSON format: ${parseError instanceof Error ? parseError.message : 'Unable to parse JSON'}`);
          return;
        }

        // Validate that it's a valid GeoJSON (Feature or FeatureCollection)
        try {
          const validatedData = validateGeoJSON(data);
          resolve(validatedData as GeoJSONFeatureCollection);
          return;
        } catch (validationError) {
          reject(`Invalid GeoJSON: ${validationError instanceof Error ? validationError.message : 'Validation failed'}`);
          return;
        }
      } catch (error) {
        reject(error instanceof Error ? error.message : 'Failed to process file');
      }
    };

    reader.onerror = () => {
      reject('Failed to read file. Please check if the file is corrupted.');
    };

    reader.readAsText(file);
  });
};

// Feature filtering and grouping utilities
export const isValidFeature = (feature: GeoJSONFeature): boolean => {
  // Check if feature has valid geometry
  if (!feature.geometry ||
      !feature.geometry.coordinates ||
      !Array.isArray(feature.geometry.coordinates) ||
      feature.geometry.coordinates.length === 0) {
    return false;
  }

  // Check if feature has a valid project property (not null or empty string)
  if (!feature.properties.Project__Name ||
      feature.properties.Project__Name.trim() === '') {
    return false;
  }

  return true;
};

export const isValidGeometry = (feature: GeoJSONFeature): boolean => {
  try {
    // Check basic structure
    if (!feature.geometry ||
        !feature.geometry.coordinates ||
        !Array.isArray(feature.geometry.coordinates) ||
        feature.geometry.coordinates.length === 0) {
      return false;
    }

    // Try to create a turf polygon to validate geometry
    const turfPolygon = turf.polygon(feature.geometry.coordinates);

    // Check if the polygon is valid (turf will throw if invalid)
    const area = turf.area(turfPolygon);

    // Area should be a positive number
    return typeof area === 'number' && area > 0 && !isNaN(area);
  } catch (error) {
    // If turf throws an error, the geometry is invalid
    return false;
  }
};

export const calculateFeatureAreaHectares = (feature: GeoJSONFeature): number => {
  try {
    if (!isValidGeometry(feature)) {
      return 0;
    }

    const turfPolygon = turf.polygon(feature.geometry.coordinates);
    const areaSquareMeters = turf.area(turfPolygon);

    // Convert square meters to hectares (1 hectare = 10,000 square meters)
    return areaSquareMeters / 10000;
  } catch (error) {
    console.warn(`Failed to calculate area for feature ${feature.properties.id}:`, error);
    return 0;
  }
};

export const filterValidFeatures = (features: GeoJSONFeature[]): GeoJSONFeature[] => {
  return features.filter(isValidFeature);
};

export const groupFeaturesByProject = (features: GeoJSONFeature[]): Record<string, GeoJSONFeature[]> => {
  const validFeatures = filterValidFeatures(features);

  return validFeatures.reduce((groups, feature) => {
    const projectName = feature.properties.Project__Name!; // We know it's valid from filtering

    if (!groups[projectName]) {
      groups[projectName] = [];
    }

    groups[projectName].push(feature);

    return groups;
  }, {} as Record<string, GeoJSONFeature[]>);
};

export const getProjectStatistics = (groupedFeatures: Record<string, GeoJSONFeature[]>) => {
  const projects = Object.keys(groupedFeatures);

  return projects.map(projectName => {
    const features = groupedFeatures[projectName];

    // Separate valid geometries from all features
    const validFeatures = features.filter(isValidGeometry);
    const validPaddockCount = validFeatures.length;

    // Calculate areas using both property values and turf.js
    const totalAreaAcres = features.reduce((sum, feature) => sum + feature.properties.area_acres, 0);
    const totalAreaHectares = totalAreaAcres * 0.404686; // Convert acres to hectares

    // Calculate area using turf.js for valid geometries only
    const calculatedAreaHectares = validFeatures.reduce((sum, feature) => {
      return sum + calculateFeatureAreaHectares(feature);
    }, 0);

    const featureCount = features.length;
    const owners = [...new Set(features.map(f => f.properties.owner))];

    return {
      projectName,
      featureCount,
      validPaddockCount,
      totalAreaAcres,
      totalAreaHectares,
      calculatedAreaHectares,
      owners,
      features,
      validFeatures
    };
  }).sort((a, b) => b.calculatedAreaHectares - a.calculatedAreaHectares); // Sort by calculated area descending
};

// Color generation utilities for map visualization
export const generateProjectColors = (projectNames: string[]): Record<string, string> => {
  // Predefined color palette for projects
  const colors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#F43F5E', // Rose
  ];

  const projectColors: Record<string, string> = {};

  projectNames.forEach((projectName, index) => {
    // Use predefined colors, cycling through if more projects than colors
    projectColors[projectName] = colors[index % colors.length];
  });

  return projectColors;
};

export const getProjectColor = (projectName: string, projectColors: Record<string, string>): string => {
  return projectColors[projectName] || '#6B7280'; // Default gray for unknown projects
};

// Calculate bounds for all features to center the map
export const calculateFeatureBounds = (features: GeoJSONFeature[]): [[number, number], [number, number]] | null => {
  if (features.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  features.forEach(feature => {
    if (isValidGeometry(feature)) {
      feature.geometry.coordinates[0].forEach(coord => {
        const [lng, lat] = coord;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });
    }
  });

  if (minLat === Infinity) return null;

  return [[minLat, minLng], [maxLat, maxLng]];
};
