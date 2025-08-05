import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoJSONFeatureCollection, GeoJSONFeature } from '../../types';
import { 
  groupFeaturesByProject, 
  generateProjectColors, 
  getProjectColor, 
  calculateFeatureBounds,
  isValidGeometry,
  calculateFeatureAreaHectares 
} from '../../utils';

interface PaddockMapProps {
  data: GeoJSONFeatureCollection;
  selectedProject?: string | null;
  onFeatureClick?: (feature: GeoJSONFeature) => void;
}

// Component to fit map bounds to features
const FitBounds: React.FC<{ bounds: [[number, number], [number, number]] | null }> = ({ bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      const leafletBounds = new LatLngBounds(bounds[0], bounds[1]);
      map.fitBounds(leafletBounds, { padding: [20, 20] });
    }
  }, [bounds, map]);
  
  return null;
};

const PaddockMap: React.FC<PaddockMapProps> = ({ data, selectedProject, onFeatureClick }) => {
  const [groupedFeatures, setGroupedFeatures] = useState<Record<string, GeoJSONFeature[]>>({});
  const [projectColors, setProjectColors] = useState<Record<string, string>>({});
  const [bounds, setBounds] = useState<[[number, number], [number, number]] | null>(null);

  useEffect(() => {
    const grouped = groupFeaturesByProject(data.features);
    const projectNames = Object.keys(grouped);
    const colors = generateProjectColors(projectNames);
    
    setGroupedFeatures(grouped);
    setProjectColors(colors);
    
    // Calculate bounds for all valid features
    const validFeatures = data.features.filter(isValidGeometry);
    const calculatedBounds = calculateFeatureBounds(validFeatures);
    setBounds(calculatedBounds);
  }, [data]);

  // Convert GeoJSON coordinates to Leaflet format
  const convertCoordinates = (coordinates: number[][]): [number, number][] => {
    return coordinates.map(coord => [coord[1], coord[0]] as [number, number]); // Swap lng,lat to lat,lng
  };

  // Filter features based on selected project
  const getVisibleFeatures = (): GeoJSONFeature[] => {
    if (selectedProject) {
      return groupedFeatures[selectedProject] || [];
    }
    return data.features;
  };

  const visibleFeatures = getVisibleFeatures().filter(isValidGeometry);

  if (visibleFeatures.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No valid paddocks to display</p>
          <p className="text-sm mt-1">
            {selectedProject 
              ? `No valid geometries found in project "${selectedProject}"`
              : 'No valid geometries found in the uploaded data'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={[47.0, -109.5]} // Default center for Montana area
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds bounds={bounds} />
        
        {visibleFeatures.map((feature) => {
          const projectName = feature.properties.Project__Name!;
          const color = getProjectColor(projectName, projectColors);
          const coordinates = convertCoordinates(feature.geometry.coordinates[0]);
          const calculatedArea = calculateFeatureAreaHectares(feature);
          
          return (
            <Polygon
              key={feature.properties.id}
              positions={coordinates}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.3,
                weight: 2,
                opacity: 0.8,
              }}
              eventHandlers={{
                click: () => {
                  if (onFeatureClick) {
                    onFeatureClick(feature);
                  }
                },
              }}
            >
              <Popup>
                <div className="p-2 min-w-64">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {feature.properties.name}
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <span className="font-medium text-gray-700">ID:</span>
                      <span className="text-gray-600">{feature.properties.id}</span>
                      
                      <span className="font-medium text-gray-700">Owner:</span>
                      <span className="text-gray-600">{feature.properties.owner}</span>
                      
                      <span className="font-medium text-gray-700">Project:</span>
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: color }}
                      >
                        {projectName}
                      </span>
                    </div>
                    
                    <div className="border-t pt-2 mt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="font-medium text-gray-700">Property Area:</span>
                        <span className="text-gray-600">
                          {feature.properties.area_acres} acres
                          <br />
                          <span className="text-xs text-gray-500">
                            ({(feature.properties.area_acres * 0.404686).toFixed(2)} ha)
                          </span>
                        </span>
                        
                        <span className="font-medium text-gray-700">Calculated Area:</span>
                        <span className="text-green-600 font-medium">
                          {calculatedArea.toFixed(2)} ha
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default PaddockMap;
