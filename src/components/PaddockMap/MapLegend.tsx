import React from 'react';
import { generateProjectColors, getProjectColor } from '../../utils';

interface MapLegendProps {
  projects: string[];
  selectedProject?: string | null;
  onProjectSelect?: (project: string | null) => void;
}

const MapLegend: React.FC<MapLegendProps> = ({ 
  projects, 
  selectedProject, 
  onProjectSelect 
}) => {
  const projectColors = generateProjectColors(projects);

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900">Project Legend</h3>
        {selectedProject && onProjectSelect && (
          <button
            onClick={() => onProjectSelect(null)}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Show All
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {projects.map((project) => {
          const color = getProjectColor(project, projectColors);
          const isSelected = selectedProject === project;
          const isFiltered = selectedProject && selectedProject !== project;
          
          return (
            <div
              key={project}
              className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
                isSelected 
                  ? 'bg-blue-50 border border-blue-200' 
                  : isFiltered
                  ? 'opacity-50 hover:opacity-75'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onProjectSelect && onProjectSelect(isSelected ? null : project)}
            >
              <div
                className="w-4 h-4 rounded border-2 border-gray-300"
                style={{ backgroundColor: color }}
              />
              <span className={`text-sm ${isSelected ? 'font-medium text-blue-900' : 'text-gray-700'}`}>
                {project}
              </span>
              {isSelected && (
                <span className="text-xs text-blue-600 ml-auto">
                  (filtered)
                </span>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Click on a project to filter the map view
        </p>
      </div>
    </div>
  );
};

export default MapLegend;
