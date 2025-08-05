// Simple React app bundle for older Node.js compatibility
const { useState, useEffect, useMemo } = React;

// Utility functions
const validateGeoJSONFeatureCollection = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data: must be an object');
  }
  
  if (data.type !== 'FeatureCollection') {
    throw new Error('Invalid GeoJSON: must be a FeatureCollection');
  }
  
  if (!Array.isArray(data.features)) {
    throw new Error('Invalid GeoJSON: features must be an array');
  }
  
  return true;
};

const generateProjectColors = (projectNames) => {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#14B8A6', '#F43F5E'
  ];
  
  const colorMap = {};
  projectNames.forEach((name, index) => {
    colorMap[name] = colors[index % colors.length];
  });
  
  return colorMap;
};

const getProjectColor = (projectName, colorMap) => {
  return colorMap[projectName] || '#6B7280';
};

// Simple file upload component
const FileUpload = ({ onFileUpload, onError }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileRead = (file) => {
    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        validateGeoJSONFeatureCollection(data);
        onFileUpload(data);
      } catch (error) {
        onError(`Error parsing file: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      onError('Error reading file');
      setIsLoading(false);
    };
    
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const geoJsonFile = files.find(file => 
      file.name.toLowerCase().endsWith('.geojson') || 
      file.type === 'application/json'
    );
    
    if (geoJsonFile) {
      handleFileRead(geoJsonFile);
    } else {
      onError('Please upload a .geojson file');
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileRead(file);
    }
  };

  return React.createElement('div', { className: 'w-full' },
    React.createElement('input', {
      type: 'file',
      accept: '.geojson',
      onChange: handleFileInput,
      className: 'hidden',
      id: 'file-input'
    }),
    React.createElement('div', {
      onClick: () => document.getElementById('file-input').click(),
      onDragOver: (e) => { e.preventDefault(); setIsDragOver(true); },
      onDragLeave: () => setIsDragOver(false),
      onDrop: handleDrop,
      className: `border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
        isDragOver 
          ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg' 
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md'
      } ${isLoading ? 'pointer-events-none opacity-50' : ''}`
    },
      React.createElement('div', { className: 'flex flex-col items-center space-y-4' },
        React.createElement('div', { className: 'w-12 h-12 text-gray-400' },
          React.createElement('svg', {
            fill: 'none',
            stroke: 'currentColor',
            viewBox: '0 0 24 24'
          },
            React.createElement('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 2,
              d: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
            })
          )
        ),
        React.createElement('div', null,
          React.createElement('p', { className: 'text-lg font-medium text-gray-900' },
            isLoading ? 'Processing...' : 'Upload GeoJSON File'
          ),
          React.createElement('p', { className: 'text-sm text-gray-500 mt-1' },
            isLoading ? 'Please wait while we process your file' : 'Drag and drop your .geojson file here, or click to browse'
          )
        )
      )
    )
  );
};

// Simple map component for visualizing paddock shapes
const PaddockMap = ({ features, projectColors, selectedProject }) => {
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const layersRef = React.useRef([]);

  React.useEffect(() => {
    if (!mapRef.current || !window.L) return;

    // Initialize map if not already done
    if (!mapInstanceRef.current) {
      // Default center - will be adjusted based on data
      mapInstanceRef.current = L.map(mapRef.current).setView([39.8283, -98.5795], 4);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(mapInstanceRef.current);
    }

    // Clear existing layers
    layersRef.current.forEach(layer => {
      mapInstanceRef.current.removeLayer(layer);
    });
    layersRef.current = [];

    if (!features || features.length === 0) return;

    // Filter features by selected project if specified
    const filteredFeatures = selectedProject
      ? features.filter(f => f.properties.Project__Name === selectedProject)
      : features;

    // Add polygons to map
    const bounds = [];
    filteredFeatures.forEach(feature => {
      if (!feature.geometry || !feature.geometry.coordinates) return;

      try {
        const projectName = feature.properties.Project__Name || 'Unknown';
        const color = projectColors[projectName] || '#6B7280';

        // Convert coordinates from [lng, lat] to [lat, lng] for Leaflet
        const coordinates = feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);

        const polygon = L.polygon(coordinates, {
          color: color,
          fillColor: color,
          fillOpacity: 0.3,
          weight: 2
        });

        // Add popup with paddock information
        const popupContent = `
          <div style="font-family: sans-serif;">
            <h3 style="margin: 0 0 8px 0; color: ${color};">${feature.properties.name}</h3>
            <p style="margin: 4px 0;"><strong>Project:</strong> ${projectName}</p>
            <p style="margin: 4px 0;"><strong>Owner:</strong> ${feature.properties.owner}</p>
            <p style="margin: 4px 0;"><strong>Area:</strong> ${feature.properties.area_acres} acres</p>
            <p style="margin: 4px 0;"><strong>ID:</strong> ${feature.properties.id}</p>
          </div>
        `;

        polygon.bindPopup(popupContent);
        polygon.addTo(mapInstanceRef.current);
        layersRef.current.push(polygon);

        // Collect bounds
        coordinates.forEach(coord => bounds.push(coord));
      } catch (error) {
        console.warn('Error adding polygon to map:', error);
      }
    });

    // Fit map to show all polygons
    if (bounds.length > 0) {
      try {
        const group = new L.featureGroup(layersRef.current);
        mapInstanceRef.current.fitBounds(group.getBounds(), { padding: [20, 20] });
      } catch (error) {
        console.warn('Error fitting bounds:', error);
      }
    }

  }, [features, projectColors, selectedProject]);

  return React.createElement('div', {
    ref: mapRef,
    style: { height: '400px', width: '100%' },
    className: 'border border-gray-300 rounded-lg'
  });
};

// Dashboard component for displaying backend data
const Dashboard = ({ projects, stats, isLoading, onRefresh }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [allPaddocks, setAllPaddocks] = useState([]);
  const [loadingPaddocks, setLoadingPaddocks] = useState(false);

  // Load all paddocks for the map
  React.useEffect(() => {
    loadAllPaddocks();
  }, []);

  const loadAllPaddocks = async () => {
    setLoadingPaddocks(true);
    try {
      const response = await apiCall('/paddocks?limit=1000');
      setAllPaddocks(response.data.features);
    } catch (error) {
      console.error('Failed to load paddocks:', error);
    } finally {
      setLoadingPaddocks(false);
    }
  };

  if (isLoading) {
    return React.createElement('div', { className: 'flex items-center justify-center h-64' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4' }),
        React.createElement('p', { className: 'text-gray-600' }, 'Loading dashboard data...')
      )
    );
  }

  if (!stats) {
    return React.createElement('div', { className: 'text-center py-8' },
      React.createElement('p', { className: 'text-gray-600' }, 'No data available. Upload some GeoJSON files to get started.')
    );
  }

  const projectColors = generateProjectColors(projects.map(p => p.name));

  return React.createElement('div', { className: 'space-y-6' },
    // Dashboard Header
    React.createElement('div', { className: 'flex justify-between items-center' },
      React.createElement('h2', { className: 'text-2xl font-bold text-gray-900' }, 'Paddock Dashboard'),
      React.createElement('button', {
        onClick: onRefresh,
        className: 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
      }, 'Refresh Data')
    ),

    // Overall Statistics
    React.createElement('div', { className: 'bg-white p-6 rounded-lg shadow-sm border border-gray-200' },
      React.createElement('h3', { className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Overall Statistics'),
      React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4' },
        React.createElement('div', { className: 'bg-blue-50 p-4 rounded-lg text-center' },
          React.createElement('div', { className: 'text-3xl font-bold text-blue-700' }, stats.totalPaddocks),
          React.createElement('div', { className: 'text-sm font-medium text-blue-900' }, 'Total Paddocks')
        ),
        React.createElement('div', { className: 'bg-green-50 p-4 rounded-lg text-center' },
          React.createElement('div', { className: 'text-3xl font-bold text-green-700' }, stats.projectCount),
          React.createElement('div', { className: 'text-sm font-medium text-green-900' }, 'Projects')
        ),
        React.createElement('div', { className: 'bg-purple-50 p-4 rounded-lg text-center' },
          React.createElement('div', { className: 'text-3xl font-bold text-purple-700' }, stats.totalAreaHectares.toFixed(1)),
          React.createElement('div', { className: 'text-sm font-medium text-purple-900' }, 'Total Area (ha)')
        ),
        React.createElement('div', { className: 'bg-orange-50 p-4 rounded-lg text-center' },
          React.createElement('div', { className: 'text-3xl font-bold text-orange-700' }, stats.ownerCount),
          React.createElement('div', { className: 'text-sm font-medium text-orange-900' }, 'Unique Owners')
        )
      )
    ),

    // Map Section
    allPaddocks.length > 0 && React.createElement('div', {
      className: 'bg-white p-6 rounded-lg shadow-sm border border-gray-200',
      'data-map': 'paddock-map'
    },
      React.createElement('div', { className: 'flex justify-between items-center mb-4' },
        React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, 'Paddock Map'),
        React.createElement('div', { className: 'flex space-x-2' },
          React.createElement('button', {
            onClick: () => setSelectedProject(null),
            className: `px-3 py-1 text-sm rounded transition-colors ${
              !selectedProject
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`
          }, 'Show All'),
          projects.map(project =>
            React.createElement('button', {
              key: project.name,
              onClick: () => setSelectedProject(project.name),
              className: `px-3 py-1 text-sm rounded transition-colors ${
                selectedProject === project.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`,
              style: selectedProject === project.name ? {} : {
                borderLeft: `3px solid ${project.color}`
              }
            }, project.name)
          )
        )
      ),
      React.createElement(PaddockMap, {
        features: allPaddocks,
        projectColors: projectColors,
        selectedProject: selectedProject
      }),

      // Map Legend
      React.createElement('div', { className: 'mt-4 p-4 bg-gray-50 rounded-lg' },
        React.createElement('h4', { className: 'text-sm font-medium text-gray-900 mb-2' }, 'Project Legend'),
        React.createElement('div', { className: 'flex flex-wrap gap-2' },
          projects.map(project =>
            React.createElement('div', {
              key: project.name,
              className: `flex items-center space-x-2 px-2 py-1 rounded text-sm ${
                selectedProject === project.name
                  ? 'bg-blue-100 border border-blue-300'
                  : 'bg-white border border-gray-200'
              }`
            },
              React.createElement('div', {
                className: 'w-3 h-3 rounded border',
                style: { backgroundColor: project.color }
              }),
              React.createElement('span', { className: 'text-gray-700' }, project.name),
              React.createElement('span', { className: 'text-gray-500' }, `(${project.statistics.validPaddocks})`)
            )
          )
        )
      )
    ),

    // Projects List
    React.createElement('div', { className: 'bg-white p-6 rounded-lg shadow-sm border border-gray-200' },
      React.createElement('h3', { className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Projects'),
      projects.length === 0 ?
        React.createElement('p', { className: 'text-gray-600 text-center py-4' }, 'No projects found. Upload some GeoJSON data to get started.') :
        React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
          projects.map(project =>
            React.createElement('div', {
              key: project.name,
              className: 'border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow'
            },
              React.createElement('div', { className: 'flex items-center justify-between mb-3' },
                React.createElement('div', { className: 'flex items-center space-x-3' },
                  React.createElement('div', {
                    className: 'w-4 h-4 rounded border-2 border-gray-300',
                    style: { backgroundColor: project.color }
                  }),
                  React.createElement('h4', { className: 'font-semibold text-gray-900' }, project.name)
                ),
                React.createElement('button', {
                  onClick: () => {
                    setSelectedProject(project.name);
                    const mapElement = document.querySelector('[data-map="paddock-map"]');
                    if (mapElement) {
                      mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  },
                  className: 'px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
                }, 'View on Map')
              ),
              React.createElement('div', { className: 'grid grid-cols-3 gap-4 text-sm' },
                React.createElement('div', { className: 'text-center' },
                  React.createElement('div', { className: 'font-semibold text-green-600' }, project.statistics.calculatedAreaHectares.toFixed(1)),
                  React.createElement('div', { className: 'text-gray-500' }, 'Hectares')
                ),
                React.createElement('div', { className: 'text-center' },
                  React.createElement('div', { className: 'font-semibold text-blue-600' }, project.statistics.validPaddocks),
                  React.createElement('div', { className: 'text-gray-500' }, 'Paddocks')
                ),
                React.createElement('div', { className: 'text-center' },
                  React.createElement('div', { className: 'font-semibold text-purple-600' }, project.statistics.owners.length),
                  React.createElement('div', { className: 'text-gray-500' }, 'Owners')
                )
              )
            )
          )
        )
    )
  );
};

// Simple project overview component (keeping for compatibility)
const ProjectOverview = ({ projectStats, onViewProjectOnMap }) => {
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [selectedProject, setSelectedProject] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const projectColors = generateProjectColors(projectStats.map(p => p.projectName));

  const toggleExpanded = (projectName) => {
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

  // Get all features for the map
  const allFeatures = projectStats.flatMap(project => project.validFeatures);

  if (projectStats.length === 0) {
    return React.createElement('div', { 
      className: 'bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center' 
    },
      React.createElement('div', { className: 'text-gray-500' },
        React.createElement('h3', { className: 'text-lg font-medium text-gray-900 mb-2' }, 'No Projects Found'),
        React.createElement('p', { className: 'text-gray-600' }, 
          'No valid projects were found in the uploaded data. Features must have a valid project name and geometry to be displayed.'
        )
      )
    );
  }

  return React.createElement('div', { className: 'space-y-6' },
    // Overall Summary
    React.createElement('div', { className: 'bg-white p-6 rounded-lg shadow-sm border border-gray-200' },
      React.createElement('h2', { className: 'text-xl font-semibold text-gray-900 mb-4' }, 'Project Overview'),
      React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
        React.createElement('div', { className: 'bg-blue-50 p-4 rounded-lg text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-blue-700' }, projectStats.length),
          React.createElement('div', { className: 'text-sm font-medium text-blue-900' }, 'Total Projects')
        ),
        React.createElement('div', { className: 'bg-green-50 p-4 rounded-lg text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-green-700' }, totalArea.toFixed(1)),
          React.createElement('div', { className: 'text-sm font-medium text-green-900' }, 'Total Area (ha)')
        ),
        React.createElement('div', { className: 'bg-purple-50 p-4 rounded-lg text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-purple-700' }, totalValidPaddocks),
          React.createElement('div', { className: 'text-sm font-medium text-purple-900' }, 'Valid Paddocks')
        )
      )
    ),
    
    // Project Cards
    React.createElement('div', { className: 'space-y-4' },
      React.createElement('div', { className: 'flex justify-between items-center' },
        React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, 'Projects'),
        React.createElement('div', { className: 'flex space-x-2' },
          React.createElement('button', {
            onClick: () => setExpandedProjects(new Set(projectStats.map(p => p.projectName))),
            className: 'text-sm text-blue-600 hover:text-blue-800 transition-colors'
          }, 'Expand All'),
          React.createElement('button', {
            onClick: () => setExpandedProjects(new Set()),
            className: 'text-sm text-gray-600 hover:text-gray-800 transition-colors'
          }, 'Collapse All')
        )
      ),

      // Map Section
      React.createElement('div', {
        className: 'bg-white p-6 rounded-lg shadow-sm border border-gray-200',
        'data-map': 'paddock-map'
      },
        React.createElement('div', { className: 'flex justify-between items-center mb-4' },
          React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, 'Paddock Map'),
          React.createElement('div', { className: 'flex space-x-2' },
            React.createElement('button', {
              onClick: () => setSelectedProject(null),
              className: `px-3 py-1 text-sm rounded transition-colors ${
                !selectedProject
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`
            }, 'Show All'),
            projectStats.map(project =>
              React.createElement('button', {
                key: project.projectName,
                onClick: () => setSelectedProject(project.projectName),
                className: `px-3 py-1 text-sm rounded transition-colors ${
                  selectedProject === project.projectName
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`,
                style: selectedProject === project.projectName ? {} : {
                  borderLeft: `3px solid ${projectColors[project.projectName]}`
                }
              }, project.projectName)
            )
          )
        ),
        React.createElement(PaddockMap, {
          features: allFeatures,
          projectColors: projectColors,
          selectedProject: selectedProject
        }),

        // Map Legend
        React.createElement('div', { className: 'mt-4 p-4 bg-gray-50 rounded-lg' },
          React.createElement('h4', { className: 'text-sm font-medium text-gray-900 mb-2' }, 'Project Legend'),
          React.createElement('div', { className: 'flex flex-wrap gap-2' },
            projectStats.map(project =>
              React.createElement('div', {
                key: project.projectName,
                className: `flex items-center space-x-2 px-2 py-1 rounded text-sm ${
                  selectedProject === project.projectName
                    ? 'bg-blue-100 border border-blue-300'
                    : 'bg-white border border-gray-200'
                }`
              },
                React.createElement('div', {
                  className: 'w-3 h-3 rounded border',
                  style: { backgroundColor: projectColors[project.projectName] }
                }),
                React.createElement('span', { className: 'text-gray-700' }, project.projectName),
                React.createElement('span', { className: 'text-gray-500' }, `(${project.validPaddockCount})`)
              )
            )
          )
        )
      ),

      React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
        projectStats.map((project) => {
          const color = getProjectColor(project.projectName, projectColors);
          const isExpanded = expandedProjects.has(project.projectName);
          
          return React.createElement('div', { 
            key: project.projectName,
            className: 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden'
          },
            // Header
            React.createElement('div', { className: 'p-4 border-b border-gray-100' },
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('div', { className: 'flex items-center space-x-3' },
                  React.createElement('div', {
                    className: 'w-4 h-4 rounded border-2 border-gray-300',
                    style: { backgroundColor: color }
                  }),
                  React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, 
                    project.projectName
                  )
                ),
                React.createElement('div', { className: 'flex items-center space-x-2' },
                  React.createElement('button', {
                    onClick: () => {
                      setSelectedProject(project.projectName);
                      // Scroll to map
                      const mapElement = document.querySelector('[data-map="paddock-map"]');
                      if (mapElement) {
                        mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    },
                    className: 'px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
                  }, 'View on Map'),
                  React.createElement('button', {
                    onClick: () => toggleExpanded(project.projectName),
                    className: 'p-1 text-gray-400 hover:text-gray-600 transition-colors'
                  },
                    React.createElement('svg', {
                      className: `w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`,
                      fill: 'none',
                      stroke: 'currentColor',
                      viewBox: '0 0 24 24'
                    },
                      React.createElement('path', {
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                        strokeWidth: 2,
                        d: 'M19 9l-7 7-7-7'
                      })
                    )
                  )
                )
              )
            ),
            
            // Summary Stats
            React.createElement('div', { className: 'p-4' },
              React.createElement('div', { className: 'grid grid-cols-3 gap-4' },
                React.createElement('div', { className: 'text-center' },
                  React.createElement('div', { className: 'text-2xl font-bold text-green-600' },
                    project.calculatedAreaHectares.toFixed(1)
                  ),
                  React.createElement('div', { className: 'text-sm text-gray-500' }, 'Hectares')
                ),
                React.createElement('div', { className: 'text-center' },
                  React.createElement('div', { className: 'text-2xl font-bold text-blue-600' },
                    project.validPaddockCount
                  ),
                  React.createElement('div', { className: 'text-sm text-gray-500' }, 'Valid Paddocks')
                ),
                React.createElement('div', { className: 'text-center' },
                  React.createElement('div', { className: 'text-2xl font-bold text-purple-600' },
                    project.owners.length
                  ),
                  React.createElement('div', { className: 'text-sm text-gray-500' }, 
                    `Owner${project.owners.length !== 1 ? 's' : ''}`
                  )
                )
              )
            )
          );
        })
      )
    )
  );
};

// API Configuration
const API_BASE_URL = 'http://localhost:3001/api/v1';

// API utility functions
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Main App component
const App = () => {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [viewMode, setViewMode] = useState('dashboard');
  const [showSampleDropdown, setShowSampleDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  // Load dashboard data on component mount
  React.useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load projects and stats in parallel
      const [projectsResponse, statsResponse] = await Promise.all([
        apiCall('/projects'),
        apiCall('/paddocks/stats/summary')
      ]);

      setProjects(projectsResponse.data);
      setDashboardStats(statsResponse.data);
      setUploadError(null);
    } catch (error) {
      setUploadError(`Failed to load dashboard data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (data) => {
    setIsLoading(true);
    try {
      // Upload to backend API
      const response = await apiCall('/upload/json', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      console.log('Upload successful:', response);

      // Reload dashboard data
      await loadDashboardData();

      setGeoJsonData(data); // Keep for compatibility
      setUploadError(null);
    } catch (error) {
      setUploadError(`Upload failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadError = (error) => {
    setUploadError(error);
    setGeoJsonData(null);
  };

  const clearGeoJsonData = () => {
    setGeoJsonData(null);
    setUploadError(null);
  };

  const sampleFiles = [
    { name: 'Montana Paddocks', file: 'sample_paddocks.geojson', description: 'Large agricultural paddocks from Montana' },
    { name: 'Farm Fields', file: 'sample_farm_fields.geojson', description: 'Midwest farm fields with various crops' },
    { name: 'Vineyard Blocks', file: 'sample_vineyard_blocks.geojson', description: 'California vineyard blocks with different varietals' },
    { name: 'Urban Gardens', file: 'sample_urban_plots.geojson', description: 'Small urban garden plots and community spaces' }
  ];

  const loadSampleData = async (filename = 'sample_paddocks.geojson') => {
    try {
      console.log('Loading sample data:', filename);
      const response = await fetch(`/${filename}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      console.log('Response text length:', text.length);

      if (!text.trim()) {
        throw new Error('Empty response from server');
      }

      const data = JSON.parse(text);
      console.log('Parsed data:', data);

      validateGeoJSONFeatureCollection(data);
      setGeoJsonData(data);
      setUploadError(null);
      console.log('Sample data loaded successfully');
    } catch (error) {
      console.error('Error loading sample data:', error);
      setUploadError(`Failed to load sample data: ${error.message}`);
    }
  };

  // Process project data
  const projectData = useMemo(() => {
    if (!geoJsonData) return { projectStats: [], groupedFeatures: {}, filteredCount: 0, totalCount: 0 };

    const validFeatures = geoJsonData.features.filter(feature => {
      try {
        // Check if feature has valid geometry
        if (!feature.geometry || !feature.geometry.coordinates) return false;
        
        // Check if feature has required properties
        const props = feature.properties;
        if (!props || !props.Project__Name || typeof props.Project__Name !== 'string') return false;
        
        // Try to create a Turf polygon to validate geometry
        if (window.turf) {
          turf.polygon(feature.geometry.coordinates);
        }
        
        return true;
      } catch (error) {
        return false;
      }
    });

    const groupedFeatures = {};
    validFeatures.forEach(feature => {
      const projectName = feature.properties.Project__Name;
      if (!groupedFeatures[projectName]) {
        groupedFeatures[projectName] = [];
      }
      groupedFeatures[projectName].push(feature);
    });

    const projectStats = Object.entries(groupedFeatures).map(([projectName, features]) => {
      const totalAreaHectares = features.reduce((sum, feature) => {
        const areaAcres = parseFloat(feature.properties.area_acres) || 0;
        return sum + (areaAcres * 0.404686); // Convert acres to hectares
      }, 0);

      const calculatedAreaHectares = features.reduce((sum, feature) => {
        try {
          if (window.turf) {
            const area = turf.area(feature); // Returns area in square meters
            return sum + (area / 10000); // Convert to hectares
          }
          return sum;
        } catch (error) {
          return sum;
        }
      }, 0);

      const owners = [...new Set(features.map(f => f.properties.owner).filter(Boolean))];

      return {
        projectName,
        featureCount: features.length,
        validPaddockCount: features.length,
        totalAreaHectares,
        calculatedAreaHectares,
        owners,
        validFeatures: features
      };
    });

    return {
      projectStats: projectStats.sort((a, b) => b.calculatedAreaHectares - a.calculatedAreaHectares),
      groupedFeatures,
      filteredCount: validFeatures.length,
      totalCount: geoJsonData.features.length
    };
  }, [geoJsonData]);

  return React.createElement('div', { className: 'min-h-screen bg-gray-50' },
    React.createElement('div', { className: 'container mx-auto px-4 py-8' },
      React.createElement('div', { className: 'max-w-4xl mx-auto' },
        React.createElement('h1', { 
          className: 'text-3xl font-bold text-gray-900 mb-8 text-center' 
        }, 'Loam - GeoJSON Paddock Management System'),
        
        React.createElement('div', { className: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8' },
          React.createElement('div', { className: 'flex justify-between items-center mb-4' },
            React.createElement('h2', { className: 'text-xl font-semibold text-gray-900' }, 'GeoJSON File Upload'),
            React.createElement('div', { className: 'flex space-x-2' },
              !geoJsonData && React.createElement('div', { className: 'relative' },
                React.createElement('button', {
                  onClick: () => setShowSampleDropdown(!showSampleDropdown),
                  className: 'px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-1'
                },
                  React.createElement('span', null, 'Load Sample Data'),
                  React.createElement('svg', {
                    className: `w-4 h-4 transition-transform ${showSampleDropdown ? 'rotate-180' : ''}`,
                    fill: 'none',
                    stroke: 'currentColor',
                    viewBox: '0 0 24 24'
                  },
                    React.createElement('path', {
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                      strokeWidth: 2,
                      d: 'M19 9l-7 7-7-7'
                    })
                  )
                ),
                showSampleDropdown && React.createElement('div', {
                  className: 'absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10'
                },
                  React.createElement('div', { className: 'p-2' },
                    sampleFiles.map((sample, index) =>
                      React.createElement('button', {
                        key: index,
                        onClick: () => {
                          loadSampleData(sample.file);
                          setShowSampleDropdown(false);
                        },
                        className: 'w-full text-left p-3 hover:bg-gray-50 rounded border-b border-gray-100 last:border-b-0'
                      },
                        React.createElement('div', { className: 'font-medium text-gray-900' }, sample.name),
                        React.createElement('div', { className: 'text-sm text-gray-500 mt-1' }, sample.description)
                      )
                    )
                  )
                )
              ),
              geoJsonData && React.createElement('button', {
                onClick: clearGeoJsonData,
                className: 'px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors'
              }, 'Clear Data')
            )
          ),
          
          !geoJsonData ? React.createElement('div', null,
            React.createElement(FileUpload, { 
              onFileUpload: handleFileUpload, 
              onError: handleUploadError 
            }),
            React.createElement('div', { className: 'mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg' },
              React.createElement('div', { className: 'flex items-start' },
                React.createElement('div', { className: 'w-5 h-5 text-blue-500 mt-0.5 mr-3' },
                  React.createElement('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', {
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                      strokeWidth: 2,
                      d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    })
                  )
                ),
                React.createElement('div', null,
                  React.createElement('h3', { className: 'text-sm font-medium text-blue-800' }, 'Try the Sample Data'),
                  React.createElement('p', { className: 'text-sm text-blue-700 mt-1' },
                    'Click "Load Sample Data" to choose from multiple sample datasets including Montana paddocks, farm fields, vineyard blocks, and urban gardens. Each demonstrates different project types and scales.'
                  )
                )
              )
            )
          ) : React.createElement('div', { className: 'text-center py-4' },
            React.createElement('p', { className: 'text-green-600 font-medium' }, 
              `✅ Successfully loaded ${projectData.filteredCount} valid features from ${projectData.totalCount} total features`
            ),
            projectData.totalCount > projectData.filteredCount && React.createElement('p', { 
              className: 'text-amber-600 text-sm mt-1' 
            }, 
              `⚠️ ${projectData.totalCount - projectData.filteredCount} features were excluded due to invalid geometry or missing project names`
            )
          ),
          
          uploadError && React.createElement('div', { 
            className: 'mt-4 p-4 bg-red-50 border border-red-200 rounded-lg' 
          },
            React.createElement('p', { className: 'text-red-700 text-sm' }, uploadError)
          )
        ),
        
        // Dashboard View
        React.createElement('div', { className: 'space-y-6' },
          // View Mode Selector
          React.createElement('div', { className: 'bg-white p-4 rounded-lg shadow-sm border border-gray-200' },
            React.createElement('div', { className: 'flex justify-center' },
              React.createElement('div', { className: 'flex bg-gray-100 rounded-lg p-1' },
                React.createElement('button', {
                  onClick: () => setViewMode('dashboard'),
                  className: `px-4 py-2 rounded text-sm font-medium transition-colors ${
                    viewMode === 'dashboard'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`
                }, 'Dashboard'),
                geoJsonData && React.createElement('button', {
                  onClick: () => setViewMode('legacy'),
                  className: `px-4 py-2 rounded text-sm font-medium transition-colors ${
                    viewMode === 'legacy'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`
                }, 'Legacy View')
              )
            )
          ),

          // Dashboard or Legacy View
          viewMode === 'dashboard' ?
            React.createElement(Dashboard, {
              projects: projects,
              stats: dashboardStats,
              isLoading: isLoading,
              onRefresh: loadDashboardData
            }) :
            geoJsonData && React.createElement(ProjectOverview, {
              projectStats: projectData.projectStats,
              onViewProjectOnMap: (projectName) => {
                setViewMode('dashboard');
              }
            })
        )
      )
    )
  );
};

// Render the app
ReactDOM.render(React.createElement(App), document.getElementById('root'));
