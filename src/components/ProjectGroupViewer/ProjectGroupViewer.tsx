import React, { useState } from 'react';
import { ProjectGroupViewerProps, GeoJSONFeature, ProjectStatistics } from '../../types';
import { calculateFeatureAreaHectares, isValidGeometry } from '../../utils';

const ProjectGroupViewer: React.FC<ProjectGroupViewerProps> = ({
  data,
  groupedFeatures,
  projectStats,
  filteredCount,
  totalCount
}) => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<GeoJSONFeature | null>(null);

  const formatCoordinates = (coordinates: number[][]): string => {
    return coordinates
      .map(coord => `[${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}]`)
      .join(', ');
  };

  const excludedCount = totalCount - filteredCount;

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Groups Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Total Projects</p>
            <p className="text-lg font-bold text-blue-700">{projectStats.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-green-900">Valid Features</p>
            <p className="text-lg font-bold text-green-700">{filteredCount}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-purple-900">Calculated Area</p>
            <p className="text-lg font-bold text-purple-700">
              {projectStats.reduce((sum, project) => sum + project.calculatedAreaHectares, 0).toFixed(2)} ha
            </p>
            <p className="text-xs text-purple-600 mt-1">From valid geometries</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-orange-900">Excluded Features</p>
            <p className="text-lg font-bold text-orange-700">{excludedCount}</p>
            <p className="text-xs text-orange-600 mt-1">No project or invalid geometry</p>
          </div>
        </div>
      </div>

      {/* Project List */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Projects</h3>
        <div className="space-y-3">
          {projectStats.map((project) => (
            <div
              key={project.projectName}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedProject === project.projectName
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedProject(
                selectedProject === project.projectName ? null : project.projectName
              )}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <h4 className="font-medium text-gray-900 text-lg">
                      {project.projectName}
                    </h4>
                    <span className="text-sm font-medium text-green-600">
                      {project.calculatedAreaHectares.toFixed(2)} ha
                    </span>
                    <span className="text-sm text-gray-500">
                      {project.validPaddockCount}/{project.featureCount} valid paddock{project.featureCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                    <span>
                      Owner{project.owners.length !== 1 ? 's' : ''}: {project.owners.join(', ')}
                    </span>
                  </div>
                </div>
                <div className="text-gray-400">
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      selectedProject === project.projectName ? 'rotate-180' : ''
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

              {/* Project Features */}
              {selectedProject === project.projectName && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm font-medium text-blue-900">Property Area</p>
                      <p className="text-lg font-bold text-blue-700">{project.totalAreaHectares.toFixed(2)} ha</p>
                      <p className="text-xs text-blue-600">From property data</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-sm font-medium text-green-900">Calculated Area</p>
                      <p className="text-lg font-bold text-green-700">{project.calculatedAreaHectares.toFixed(2)} ha</p>
                      <p className="text-xs text-green-600">From geometry analysis</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <p className="text-sm font-medium text-orange-900">Valid Paddocks</p>
                      <p className="text-lg font-bold text-orange-700">{project.validPaddockCount}/{project.featureCount}</p>
                      <p className="text-xs text-orange-600">With valid geometry</p>
                    </div>
                  </div>
                  <h5 className="font-medium text-gray-900 mb-3">Paddocks in {project.projectName}</h5>
                  <div className="space-y-2">
                    {project.features.map((feature) => (
                      <div
                        key={feature.properties.id}
                        className={`border rounded p-3 cursor-pointer transition-colors ${
                          selectedFeature?.properties.id === feature.properties.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFeature(
                            selectedFeature?.properties.id === feature.properties.id ? null : feature
                          );
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium text-gray-900">{feature.properties.name}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              ID: {feature.properties.id}
                            </span>
                            {isValidGeometry(feature) ? (
                              <span className="text-sm font-medium text-green-600 ml-2">
                                {calculateFeatureAreaHectares(feature).toFixed(2)} ha
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-red-600 ml-2">
                                Invalid geometry
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-600">{feature.properties.owner}</span>
                        </div>

                        {/* Feature Details */}
                        {selectedFeature?.properties.id === feature.properties.id && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h6 className="font-medium text-gray-900 mb-2">Properties</h6>
                                <div className="space-y-1 text-sm">
                                  <div><span className="font-medium">ID:</span> {feature.properties.id}</div>
                                  <div><span className="font-medium">Name:</span> {feature.properties.name}</div>
                                  <div><span className="font-medium">Owner:</span> {feature.properties.owner}</div>
                                  <div><span className="font-medium">Property Area:</span> {feature.properties.area_acres} acres ({(feature.properties.area_acres * 0.404686).toFixed(2)} ha)</div>
                                  {isValidGeometry(feature) && (
                                    <div><span className="font-medium">Calculated Area:</span> {calculateFeatureAreaHectares(feature).toFixed(2)} ha</div>
                                  )}
                                  <div><span className="font-medium">Project:</span> {feature.properties.Project__Name}</div>
                                  <div>
                                    <span className="font-medium">Geometry Status:</span>{' '}
                                    {isValidGeometry(feature) ? (
                                      <span className="text-green-600">Valid</span>
                                    ) : (
                                      <span className="text-red-600">Invalid</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h6 className="font-medium text-gray-900 mb-2">Geometry</h6>
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
              )}
            </div>
          ))}
        </div>

        {projectStats.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No valid projects found.</p>
            <p className="text-sm mt-1">
              Features must have a valid project name and geometry to be grouped.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectGroupViewer;
