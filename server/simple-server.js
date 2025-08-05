const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Data storage paths
const DATA_DIR = path.join(__dirname, 'data');
const PADDOCKS_FILE = path.join(DATA_DIR, 'paddocks.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data files if they don't exist
if (!fs.existsSync(PADDOCKS_FILE)) {
  fs.writeFileSync(PADDOCKS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(PROJECTS_FILE)) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify([]));
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Utility functions
function readPaddocks() {
  try {
    const data = fs.readFileSync(PADDOCKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading paddocks:', error);
    return [];
  }
}

function writePaddocks(paddocks) {
  try {
    fs.writeFileSync(PADDOCKS_FILE, JSON.stringify(paddocks, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing paddocks:', error);
    return false;
  }
}

function readProjects() {
  try {
    const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading projects:', error);
    return [];
  }
}

function writeProjects(projects) {
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing projects:', error);
    return false;
  }
}

function calculateProjectStats() {
  const paddocks = readPaddocks();
  const projectMap = {};

  paddocks.forEach(paddock => {
    const projectName = paddock.projectName;
    if (!projectMap[projectName]) {
      projectMap[projectName] = {
        name: projectName,
        totalPaddocks: 0,
        validPaddocks: 0,
        totalAreaHectares: 0,
        calculatedAreaHectares: 0,
        owners: new Set(),
        color: '#3B82F6'
      };
    }

    const project = projectMap[projectName];
    project.totalPaddocks++;
    if (paddock.isValid) {
      project.validPaddocks++;
    }
    project.totalAreaHectares += paddock.areaHectares || 0;
    project.calculatedAreaHectares += paddock.calculatedAreaHectares || 0;
    project.owners.add(paddock.owner);
  });

  // Convert sets to arrays and assign colors
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#14B8A6', '#F43F5E'
  ];

  const projects = Object.values(projectMap).map((project, index) => ({
    ...project,
    owners: Array.from(project.owners),
    color: colors[index % colors.length],
    statistics: {
      totalPaddocks: project.totalPaddocks,
      validPaddocks: project.validPaddocks,
      invalidPaddocks: project.totalPaddocks - project.validPaddocks,
      totalAreaHectares: project.totalAreaHectares,
      calculatedAreaHectares: project.calculatedAreaHectares,
      owners: Array.from(project.owners),
      averagePaddockSize: project.validPaddocks > 0 ? project.totalAreaHectares / project.validPaddocks : 0
    }
  }));

  writeProjects(projects);
  return projects;
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get all paddocks
app.get('/api/v1/paddocks', (req, res) => {
  try {
    const paddocks = readPaddocks();
    const { project, limit = 100, offset = 0 } = req.query;

    let filteredPaddocks = paddocks;
    if (project) {
      filteredPaddocks = paddocks.filter(p => p.projectName === project);
    }

    const start = parseInt(offset);
    const end = start + parseInt(limit);
    const paginatedPaddocks = filteredPaddocks.slice(start, end);

    const featureCollection = {
      type: 'FeatureCollection',
      features: paginatedPaddocks.map(paddock => ({
        type: 'Feature',
        properties: {
          id: paddock.paddockId,
          name: paddock.name,
          owner: paddock.owner,
          Project__Name: paddock.projectName,
          area_acres: paddock.areaAcres,
          area_hectares: paddock.areaHectares,
          calculated_area_hectares: paddock.calculatedAreaHectares,
          uploaded_at: paddock.uploadedAt,
          is_valid: paddock.isValid
        },
        geometry: paddock.geometry
      }))
    };

    res.json({
      success: true,
      data: featureCollection,
      pagination: {
        total: filteredPaddocks.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: end < filteredPaddocks.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch paddocks',
      message: error.message
    });
  }
});

// Get paddock statistics
app.get('/api/v1/paddocks/stats/summary', (req, res) => {
  try {
    const paddocks = readPaddocks();
    
    const stats = {
      totalPaddocks: paddocks.length,
      validPaddocks: paddocks.filter(p => p.isValid).length,
      totalAreaHectares: paddocks.reduce((sum, p) => sum + (p.areaHectares || 0), 0),
      calculatedAreaHectares: paddocks.reduce((sum, p) => sum + (p.calculatedAreaHectares || 0), 0),
      projectCount: new Set(paddocks.map(p => p.projectName)).size,
      ownerCount: new Set(paddocks.map(p => p.owner)).size,
      projects: [...new Set(paddocks.map(p => p.projectName))],
      owners: [...new Set(paddocks.map(p => p.owner))]
    };

    stats.invalidPaddocks = stats.totalPaddocks - stats.validPaddocks;

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

// Get all projects
app.get('/api/v1/projects', (req, res) => {
  try {
    const projects = calculateProjectStats();
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      message: error.message
    });
  }
});

// Upload GeoJSON data
app.post('/api/v1/upload/json', (req, res) => {
  try {
    const geoJsonData = req.body;

    // Enhanced GeoJSON validation (RFC 7946 compliant)
    if (!geoJsonData || typeof geoJsonData !== 'object' || Array.isArray(geoJsonData)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data: must be a non-null object'
      });
    }

    // Normalize to FeatureCollection
    let normalizedData;
    if (geoJsonData.type === 'Feature') {
      // Convert single Feature to FeatureCollection
      normalizedData = {
        type: 'FeatureCollection',
        features: [geoJsonData]
      };
    } else if (geoJsonData.type === 'FeatureCollection') {
      if (!Array.isArray(geoJsonData.features)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid GeoJSON: features must be an array'
        });
      }

      if (geoJsonData.features.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid GeoJSON: features array cannot be empty'
        });
      }

      if (geoJsonData.features.length > 10000) {
        return res.status(400).json({
          success: false,
          error: 'Invalid GeoJSON: too many features (maximum 10,000 allowed)'
        });
      }

      normalizedData = geoJsonData;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid GeoJSON: type must be "Feature" or "FeatureCollection"'
      });
    }

    const uploadBatch = uuidv4();
    const paddocks = readPaddocks();
    const results = {
      total: normalizedData.features.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    normalizedData.features.forEach((feature, index) => {
      try {
        const props = feature.properties;
        
        if (!props || !props.Project__Name || !feature.geometry) {
          results.failed++;
          results.errors.push({
            featureIndex: index,
            error: 'Missing required properties or geometry'
          });
          return;
        }

        const paddock = {
          paddockId: (props.id && props.id.toString()) || `paddock_${index}_${Date.now()}`,
          name: props.name || 'Unnamed Paddock',
          owner: props.owner || 'Unknown Owner',
          projectName: props.Project__Name,
          areaAcres: parseFloat(props.area_acres) || 0,
          areaHectares: (parseFloat(props.area_acres) || 0) * 0.404686,
          calculatedAreaHectares: (parseFloat(props.area_acres) || 0) * 0.404686, // Simplified
          geometry: feature.geometry,
          uploadBatch: uploadBatch,
          uploadedAt: new Date().toISOString(),
          isValid: true
        };

        paddocks.push(paddock);
        results.successful++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          featureIndex: index,
          error: error.message
        });
      }
    });

    writePaddocks(paddocks);
    calculateProjectStats();

    res.json({
      success: true,
      data: {
        uploadBatch,
        results
      },
      message: `Successfully processed ${results.successful} of ${results.total} features`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to upload data',
      message: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Loam Backend API (Simple File Storage)',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      paddocks: '/api/v1/paddocks',
      projects: '/api/v1/projects',
      upload: '/api/v1/upload/json'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Loam Backend API running on port ${PORT}`);
  console.log(`📁 Data storage: ${DATA_DIR}`);
  console.log(`🌐 CORS enabled for: http://localhost:5173`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  process.exit(0);
});
