import React, { useState } from 'react';
import { ProjectStatistics } from '../../types';
import { getProjectColor, generateProjectColors } from '../../utils';

interface ProjectCardProps {
  project: ProjectStatistics;
  projectColors: Record<string, string>;
  onViewOnMap: (projectName: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  projectColors,
  onViewOnMap,
  isExpanded = false,
  onToggleExpand
}) => {
  const color = getProjectColor(project.projectName, projectColors);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="w-4 h-4 rounded border-2 border-gray-300"
              style={{ backgroundColor: color }}
            />
            <h3 className="text-lg font-semibold text-gray-900">
              {project.projectName}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onViewOnMap(project.projectName)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              View on Map
            </button>
            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {project.calculatedAreaHectares.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500">Hectares</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {project.validPaddockCount}
            </div>
            <div className="text-sm text-gray-500">Valid Paddocks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {project.owners.length}
            </div>
            <div className="text-sm text-gray-500">Owner{project.owners.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="space-y-4">
            {/* Area Comparison */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Area Breakdown</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-3 rounded">
                  <div className="font-medium text-gray-700">Property Area</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {project.totalAreaHectares.toFixed(2)} ha
                  </div>
                  <div className="text-xs text-gray-500">From property data</div>
                </div>
                <div className="bg-white p-3 rounded">
                  <div className="font-medium text-gray-700">Calculated Area</div>
                  <div className="text-lg font-semibold text-green-600">
                    {project.calculatedAreaHectares.toFixed(2)} ha
                  </div>
                  <div className="text-xs text-gray-500">From geometry analysis</div>
                </div>
              </div>
            </div>

            {/* Owners */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Owners</h4>
              <div className="flex flex-wrap gap-2">
                {project.owners.map((owner, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-white text-gray-700 text-sm rounded border"
                  >
                    {owner}
                  </span>
                ))}
              </div>
            </div>

            {/* Paddock Summary */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Paddock Summary</h4>
              <div className="bg-white p-3 rounded">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Total Paddocks:</span>
                    <span className="ml-2 text-gray-600">{project.featureCount}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Valid Geometries:</span>
                    <span className="ml-2 text-green-600">{project.validPaddockCount}</span>
                  </div>
                  {project.featureCount > project.validPaddockCount && (
                    <div className="col-span-2">
                      <span className="font-medium text-gray-700">Invalid Geometries:</span>
                      <span className="ml-2 text-red-600">
                        {project.featureCount - project.validPaddockCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Individual Paddocks */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Paddocks</h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {project.validFeatures.map((feature) => (
                  <div
                    key={feature.properties.id}
                    className="bg-white p-2 rounded border text-sm"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">
                        {feature.properties.name}
                      </span>
                      <span className="text-green-600 font-medium">
                        {(feature.properties.area_acres * 0.404686).toFixed(1)} ha
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: {feature.properties.id} • Owner: {feature.properties.owner}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCard;
