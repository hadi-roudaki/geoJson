import React, { useState, useMemo } from 'react';
import { GeoJSONFeatureCollection, GeoJSONFeature } from '../../types';
import { groupFeaturesByProject, getProjectStatistics, filterValidFeatures, calculateFeatureAreaHectares } from '../../utils';
import ProjectGroupViewer from '../ProjectGroupViewer/ProjectGroupViewer';
import PaddockMap from '../PaddockMap/PaddockMap';
import MapLegend from '../PaddockMap/MapLegend';
import ProjectOverview from '../ProjectCard/ProjectOverview';

interface GeoJSONViewerProps {
  data: GeoJSONFeatureCollection;
}

const GeoJSONViewer: React.FC<GeoJSONViewerProps> = ({ data }) => {
  const [selectedFeature, setSelectedFeature] = useState<GeoJSONFeature | null>(null);
  const [showRawData, setShowRawData] = useState(false);
  const [viewMode, setViewMode] = useState<'features' | 'projects' | 'overview' | 'map'>('overview');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Compute project groupings
  const projectData = useMemo(() => {
    const groupedFeatures = groupFeaturesByProject(data.features);
    const projectStats = getProjectStatistics(groupedFeatures);
    const validFeatures = filterValidFeatures(data.features);

    return {
      groupedFeatures,
      projectStats,
      filteredCount: validFeatures.length,
      totalCount: data.features.length
    };
  }, [data.features]);

  const formatCoordinates = (coordinates: number[][]): string => {
    return coordinates
      .map(coord => `[${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}]`)
      .join(', ');
  };

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">GeoJSON Data</h2>
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('overview')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'overview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Project Overview
              </button>
              <button
                onClick={() => setViewMode('features')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'features'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Features
              </button>
              <button
                onClick={() => setViewMode('projects')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'projects'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Detailed View
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'map'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Map View
              </button>
            </div>
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
            </button>
          </div>
        </div>
      </div>

      {showRawData ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Raw GeoJSON Data</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
            <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      ) : viewMode === 'overview' ? (
        <ProjectOverview
          projectStats={projectData.projectStats}
          onViewProjectOnMap={(projectName) => {
            setSelectedProject(projectName);
            setViewMode('map');
          }}
        />
      ) : viewMode === 'projects' ? (
        <ProjectGroupViewer
          data={data}
          groupedFeatures={projectData.groupedFeatures}
          projectStats={projectData.projectStats}
          filteredCount={projectData.filteredCount}
          totalCount={projectData.totalCount}
        />
      ) : viewMode === 'map' ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Paddock Map</h2>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <PaddockMap
                  data={data}
                  selectedProject={selectedProject}
                  onFeatureClick={(feature) => setSelectedFeature(feature)}
                />
              </div>
              <div className="lg:col-span-1">
                <MapLegend
                  projects={Object.keys(projectData.groupedFeatures)}
                  selectedProject={selectedProject}
                  onProjectSelect={setSelectedProject}
                />
              </div>
            </div>
          </div>

          {selectedFeature && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Selected Paddock</h3>
                <button
                  onClick={() => setSelectedFeature(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Properties</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Name:</span> {selectedFeature.properties.name}</div>
                    <div><span className="font-medium">ID:</span> {selectedFeature.properties.id}</div>
                    <div><span className="font-medium">Owner:</span> {selectedFeature.properties.owner}</div>
                    <div><span className="font-medium">Project:</span> {selectedFeature.properties.Project__Name}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Area Information</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Property Area:</span> {selectedFeature.properties.area_acres} acres</div>
                    <div><span className="font-medium">Property Area (ha):</span> {(selectedFeature.properties.area_acres * 0.404686).toFixed(2)} ha</div>
                    <div><span className="font-medium">Calculated Area:</span> {calculateFeatureAreaHectares(selectedFeature).toFixed(2)} ha</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">GeoJSON Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Collection Name</p>
            <p className="text-lg font-bold text-blue-700">{data.name}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-green-900">Total Features</p>
            <p className="text-lg font-bold text-green-700">{data.features.length}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-purple-900">Total Area</p>
            <p className="text-lg font-bold text-purple-700">
              {data.features.reduce((sum, feature) => sum + feature.properties.area_acres, 0).toFixed(2)} acres
            </p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <p className="text-sm font-medium text-gray-700">Coordinate Reference System</p>
          <p className="text-sm text-gray-600">{data.crs.properties.name}</p>
        </div>
      </div>

          {/* Features List */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">All Features</h3>
            <div className="space-y-3">
              {data.features.map((feature, index) => (
              <div
                key={feature.properties.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedFeature?.properties.id === feature.properties.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedFeature(
                  selectedFeature?.properties.id === feature.properties.id ? null : feature
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <h4 className="font-medium text-gray-900">
                        {feature.properties.name}
                      </h4>
                      <span className="text-sm text-gray-500">
                        ID: {feature.properties.id}
                      </span>
                      <span className="text-sm font-medium text-green-600">
                        {feature.properties.area_acres} acres
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                      <span>Owner: {feature.properties.owner}</span>
                      {feature.properties.Project__Name && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {feature.properties.Project__Name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-gray-400">
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        selectedFeature?.properties.id === feature.properties.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                {selectedFeature?.properties.id === feature.properties.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Properties</h5>
                        <div className="space-y-1 text-sm">
                          <div><span className="font-medium">ID:</span> {feature.properties.id}</div>
                          <div><span className="font-medium">Name:</span> {feature.properties.name}</div>
                          <div><span className="font-medium">Owner:</span> {feature.properties.owner}</div>
                          <div><span className="font-medium">Area:</span> {feature.properties.area_acres} acres</div>
                          <div>
                            <span className="font-medium">Project:</span>{' '}
                            {feature.properties.Project__Name || 'None'}
                          </div>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Geometry</h5>
                        <div className="text-sm">
                          <div><span className="font-medium">Type:</span> {feature.geometry.type}</div>
                          <div><span className="font-medium">Rings:</span> {feature.geometry.coordinates.length}</div>
                          <div>
                            <span className="font-medium">Points:</span>{' '}
                            {feature.geometry.coordinates[0].length}
                          </div>
                          <div className="mt-2">
                            <span className="font-medium">First few coordinates:</span>
                            <div className="bg-gray-100 p-2 rounded text-xs font-mono mt-1 max-h-20 overflow-auto">
                              {formatCoordinates(feature.geometry.coordinates[0].slice(0, 3))}
                              {feature.geometry.coordinates[0].length > 3 && '...'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GeoJSONViewer;
