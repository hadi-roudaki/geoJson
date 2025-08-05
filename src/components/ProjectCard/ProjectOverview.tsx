import React, { useState } from 'react';
import { ProjectStatistics } from '../../types';
import { generateProjectColors } from '../../utils';
import ProjectCard from './ProjectCard';

interface ProjectOverviewProps {
  projectStats: ProjectStatistics[];
  onViewProjectOnMap: (projectName: string) => void;
}

const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  projectStats,
  onViewProjectOnMap
}) => {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  const projectColors = generateProjectColors(projectStats.map(p => p.projectName));

  const toggleExpanded = (projectName: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectName)) {
      newExpanded.delete(projectName);
    } else {
      newExpanded.add(projectName);
    }
    setExpandedProjects(newExpanded);
  };

  const totalArea = projectStats.reduce((sum, project) => sum + project.calculatedAreaHectares, 0);
  const totalValidPaddocks = projectStats.reduce((sum, project) => sum + project.validPaddockCount, 0);
  const allOwners = [...new Set(projectStats.flatMap(p => p.owners))];

  if (projectStats.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
        <div className="text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
          <p className="text-gray-600">
            No valid projects were found in the uploaded data. 
            Features must have a valid project name and geometry to be displayed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{projectStats.length}</div>
            <div className="text-sm font-medium text-blue-900">Total Projects</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{totalArea.toFixed(1)}</div>
            <div className="text-sm font-medium text-green-900">Total Area (ha)</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">{totalValidPaddocks}</div>
            <div className="text-sm font-medium text-purple-900">Valid Paddocks</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">{allOwners.length}</div>
            <div className="text-sm font-medium text-orange-900">Unique Owners</div>
          </div>
        </div>
      </div>

      {/* Project Cards */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Projects</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setExpandedProjects(new Set(projectStats.map(p => p.projectName)))}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={() => setExpandedProjects(new Set())}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projectStats.map((project) => (
            <ProjectCard
              key={project.projectName}
              project={project}
              projectColors={projectColors}
              onViewOnMap={onViewProjectOnMap}
              isExpanded={expandedProjects.has(project.projectName)}
              onToggleExpand={() => toggleExpanded(project.projectName)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectOverview;
