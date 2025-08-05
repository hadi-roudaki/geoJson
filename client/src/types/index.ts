// Common type definitions
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
}

// GeoJSON type definitions
export interface GeoJSONCoordinate extends Array<number> {
  0: number; // longitude
  1: number; // latitude
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: GeoJSONCoordinate[][];
}

export interface GeoJSONFeatureProperties {
  id: number;
  area_acres: number;
  owner: string;
  name: string;
  Project__Name: string | null;
  [key: string]: any; // Allow additional properties
}

export interface GeoJSONFeature {
  type: 'Feature';
  properties: GeoJSONFeatureProperties;
  geometry: GeoJSONPolygon;
}

export interface GeoJSONCRS {
  type: 'name';
  properties: {
    name: string;
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  name: string;
  crs: GeoJSONCRS;
  features: GeoJSONFeature[];
}

export interface FileUploadProps {
  onFileUpload: (data: GeoJSONFeatureCollection) => void;
  onError: (error: string) => void;
}

// Project grouping types
export interface ProjectStatistics {
  projectName: string;
  featureCount: number;
  validPaddockCount: number;
  totalAreaAcres: number;
  totalAreaHectares: number;
  calculatedAreaHectares: number; // From turf.js calculation
  owners: string[];
  features: GeoJSONFeature[];
  validFeatures: GeoJSONFeature[];
}

export interface ProjectGroupViewerProps {
  data: GeoJSONFeatureCollection;
  groupedFeatures: Record<string, GeoJSONFeature[]>;
  projectStats: ProjectStatistics[];
  filteredCount: number;
  totalCount: number;
}

// Map component types
export interface PaddockMapProps {
  data: GeoJSONFeatureCollection;
  selectedProject?: string | null;
  onFeatureClick?: (feature: GeoJSONFeature) => void;
}

export interface MapLegendProps {
  projects: string[];
  selectedProject?: string | null;
  onProjectSelect?: (project: string | null) => void;
}
