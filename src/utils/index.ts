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

// GeoJSON validation utilities
export const validateGeoJSONFeatureCollection = (data: any): data is GeoJSONFeatureCollection => {
  // Check if data is an object
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid GeoJSON: Data must be an object');
  }

  // Check required top-level properties
  if (data.type !== 'FeatureCollection') {
    throw new Error('Invalid GeoJSON: Type must be "FeatureCollection"');
  }

  if (typeof data.name !== 'string') {
    throw new Error('Invalid GeoJSON: Name must be a string');
  }

  // Validate CRS
  if (!data.crs || typeof data.crs !== 'object') {
    throw new Error('Invalid GeoJSON: CRS is required and must be an object');
  }

  if (data.crs.type !== 'name') {
    throw new Error('Invalid GeoJSON: CRS type must be "name"');
  }

  if (!data.crs.properties || typeof data.crs.properties.name !== 'string') {
    throw new Error('Invalid GeoJSON: CRS properties.name must be a string');
  }

  // Validate features array
  if (!Array.isArray(data.features)) {
    throw new Error('Invalid GeoJSON: Features must be an array');
  }

  if (data.features.length === 0) {
    throw new Error('Invalid GeoJSON: Features array cannot be empty');
  }

  // Validate each feature
  data.features.forEach((feature: any, index: number) => {
    validateGeoJSONFeature(feature, index);
  });

  return true;
};

const validateGeoJSONFeature = (feature: any, index: number): feature is GeoJSONFeature => {
  const prefix = `Feature ${index + 1}:`;

  if (!feature || typeof feature !== 'object') {
    throw new Error(`${prefix} Must be an object`);
  }

  if (feature.type !== 'Feature') {
    throw new Error(`${prefix} Type must be "Feature"`);
  }

  // Validate properties
  if (!feature.properties || typeof feature.properties !== 'object') {
    throw new Error(`${prefix} Properties must be an object`);
  }

  const props = feature.properties;
  if (typeof props.id !== 'number') {
    throw new Error(`${prefix} Properties.id must be a number`);
  }

  if (typeof props.area_acres !== 'number') {
    throw new Error(`${prefix} Properties.area_acres must be a number`);
  }

  if (typeof props.owner !== 'string') {
    throw new Error(`${prefix} Properties.owner must be a string`);
  }

  if (typeof props.name !== 'string') {
    throw new Error(`${prefix} Properties.name must be a string`);
  }

  if (props.Project__Name !== null && typeof props.Project__Name !== 'string') {
    throw new Error(`${prefix} Properties.Project__Name must be a string or null`);
  }

  // Validate geometry
  if (!feature.geometry || typeof feature.geometry !== 'object') {
    throw new Error(`${prefix} Geometry must be an object`);
  }

  if (feature.geometry.type !== 'Polygon') {
    throw new Error(`${prefix} Geometry type must be "Polygon"`);
  }

  if (!Array.isArray(feature.geometry.coordinates)) {
    throw new Error(`${prefix} Geometry coordinates must be an array`);
  }

  // Validate polygon coordinates structure
  feature.geometry.coordinates.forEach((ring: any, ringIndex: number) => {
    if (!Array.isArray(ring)) {
      throw new Error(`${prefix} Coordinate ring ${ringIndex + 1} must be an array`);
    }

    if (ring.length < 4) {
      throw new Error(`${prefix} Coordinate ring ${ringIndex + 1} must have at least 4 points`);
    }

    ring.forEach((coord: any, coordIndex: number) => {
      if (!Array.isArray(coord) || coord.length !== 2) {
        throw new Error(`${prefix} Coordinate ${coordIndex + 1} in ring ${ringIndex + 1} must be an array of 2 numbers`);
      }

      if (typeof coord[0] !== 'number' || typeof coord[1] !== 'number') {
        throw new Error(`${prefix} Coordinate ${coordIndex + 1} in ring ${ringIndex + 1} must contain numbers`);
      }
    });

    // Check if polygon is closed (first and last coordinates should be the same)
    const firstCoord = ring[0];
    const lastCoord = ring[ring.length - 1];
    if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
      throw new Error(`${prefix} Polygon ring ${ringIndex + 1} must be closed (first and last coordinates must be the same)`);
    }
  });

  return true;
};

export const parseGeoJSONFile = async (file: File): Promise<GeoJSONFeatureCollection> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        // Validate the parsed data
        validateGeoJSONFeatureCollection(data);

        resolve(data as GeoJSONFeatureCollection);
      } catch (error) {
        reject(error instanceof Error ? error.message : 'Failed to parse GeoJSON file');
      }
    };

    reader.onerror = () => {
      reject('Failed to read file');
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
