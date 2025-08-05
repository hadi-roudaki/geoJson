const express = require('express');
const multer = require('multer');
const router = express.Router();
const Paddock = require('../models/Paddock');
const Project = require('../models/Project');
const { v4: uuidv4 } = require('uuid');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: parseInt(process.env.MAX_FILES_PER_REQUEST) || 1
  },
  fileFilter: (req, file, cb) => {
    // Accept only .json and .geojson files
    const fileName = file.originalname.toLowerCase();
    const validExtensions = fileName.endsWith('.json') || fileName.endsWith('.geojson');
    const validMimeTypes = [
      'application/json',
      'text/plain',
      'application/octet-stream' // Some browsers send this for .geojson files
    ].includes(file.mimetype);

    if (validExtensions && (validMimeTypes || file.mimetype === '')) {
      cb(null, true);
    } else {
      cb(new Error('Only .json and .geojson files are allowed. Please ensure your file has the correct extension and contains valid JSON.'), false);
    }
  }
});

// Utility function to validate GeoJSON (RFC 7946 compliant)
function validateGeoJSON(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid data: must be a non-null object');
  }

  // Support both Feature and FeatureCollection
  if (data.type === 'Feature') {
    // Convert single Feature to FeatureCollection for processing
    return {
      type: 'FeatureCollection',
      features: [data]
    };
  } else if (data.type === 'FeatureCollection') {
    if (!Array.isArray(data.features)) {
      throw new Error('Invalid GeoJSON: features must be an array');
    }

    if (data.features.length === 0) {
      throw new Error('Invalid GeoJSON: features array cannot be empty');
    }

    if (data.features.length > 10000) {
      throw new Error('Invalid GeoJSON: too many features (maximum 10,000 allowed)');
    }

    return data;
  } else {
    throw new Error('Invalid GeoJSON: type must be "Feature" or "FeatureCollection"');
  }
}

// Utility function to validate feature
function validateFeature(feature) {
  const errors = [];
  
  if (!feature.type || feature.type !== 'Feature') {
    errors.push('Feature must have type "Feature"');
  }
  
  if (!feature.properties) {
    errors.push('Feature must have properties');
  } else {
    const props = feature.properties;
    
    if (!props.id && !props.paddockId) {
      errors.push('Feature must have id or paddockId property');
    }
    
    if (!props.name && !props.paddock_name) {
      errors.push('Feature must have name or paddock_name property');
    }
    
    if (!props.owner) {
      errors.push('Feature must have owner property');
    }
    
    if (!props.Project__Name && !props.project_name) {
      errors.push('Feature must have Project__Name or project_name property');
    }
    
    if (!props.area_acres || isNaN(parseFloat(props.area_acres))) {
      errors.push('Feature must have valid area_acres property');
    }
  }
  
  if (!feature.geometry) {
    errors.push('Feature must have geometry');
  } else if (feature.geometry.type !== 'Polygon') {
    errors.push('Feature geometry must be a Polygon');
  } else if (!feature.geometry.coordinates || !Array.isArray(feature.geometry.coordinates)) {
    errors.push('Feature geometry must have coordinates array');
  }
  
  return errors;
}

// POST /api/v1/upload/geojson - Upload GeoJSON file
router.post('/geojson', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Parse JSON
    let geoJsonData;
    try {
      geoJsonData = JSON.parse(req.file.buffer.toString());
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON format',
        message: parseError.message
      });
    }

    // Validate GeoJSON structure and normalize to FeatureCollection
    let normalizedData;
    try {
      normalizedData = validateGeoJSON(geoJsonData);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GeoJSON format',
        message: validationError.message
      });
    }

    // Generate upload batch ID
    const uploadBatch = uuidv4();

    // Process features
    const results = {
      total: normalizedData.features.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    const savedPaddocks = [];

    for (let i = 0; i < normalizedData.features.length; i++) {
      const feature = normalizedData.features[i];
      
      try {
        // Validate feature
        const validationErrors = validateFeature(feature);
        
        if (validationErrors.length > 0) {
          results.failed++;
          results.errors.push({
            featureIndex: i,
            errors: validationErrors
          });
          continue;
        }

        // Create paddock from feature
        const paddock = Paddock.createFromGeoJSONFeature(feature, uploadBatch);
        
        // Additional validation and processing
        if (!paddock.paddockId) {
          paddock.paddockId = `paddock_${i}_${Date.now()}`;
        }
        
        // Calculate area using Turf.js if available (simplified calculation here)
        if (feature.geometry && feature.geometry.coordinates) {
          // This is a simplified area calculation - in production you'd use Turf.js
          paddock.calculatedAreaHectares = paddock.areaHectares; // Placeholder
        }
        
        // Save paddock
        const savedPaddock = await paddock.save();
        savedPaddocks.push(savedPaddock);
        results.successful++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          featureIndex: i,
          error: error.message,
          details: error.errors || []
        });
      }
    }

    // Update project statistics for all affected projects
    const projectNames = [...new Set(savedPaddocks.map(p => p.projectName))];
    const updatedProjects = [];
    
    for (const projectName of projectNames) {
      try {
        const project = await Project.updateProjectStats(projectName);
        if (project) {
          updatedProjects.push(project);
        }
      } catch (error) {
        console.error(`Error updating project stats for ${projectName}:`, error);
      }
    }

    // Assign colors to projects
    await Project.assignColors();

    res.json({
      success: true,
      data: {
        uploadBatch,
        results,
        projectsUpdated: updatedProjects.length,
        projects: updatedProjects.map(p => p.name)
      },
      message: `Successfully processed ${results.successful} of ${results.total} features`
    });

  } catch (error) {
    console.error('Error uploading GeoJSON:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload GeoJSON',
      message: error.message
    });
  }
});

// POST /api/v1/upload/json - Upload raw JSON data (for frontend compatibility)
router.post('/json', async (req, res) => {
  try {
    const geoJsonData = req.body;

    if (!geoJsonData) {
      return res.status(400).json({
        success: false,
        error: 'No data provided'
      });
    }

    // Validate GeoJSON structure
    try {
      validateGeoJSON(geoJsonData);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GeoJSON format',
        message: validationError.message
      });
    }

    // Generate upload batch ID
    const uploadBatch = uuidv4();
    
    // Process features (same logic as file upload)
    const results = {
      total: geoJsonData.features.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    const savedPaddocks = [];

    for (let i = 0; i < geoJsonData.features.length; i++) {
      const feature = geoJsonData.features[i];
      
      try {
        // Validate feature
        const validationErrors = validateFeature(feature);
        
        if (validationErrors.length > 0) {
          results.failed++;
          results.errors.push({
            featureIndex: i,
            errors: validationErrors
          });
          continue;
        }

        // Create paddock from feature
        const paddock = Paddock.createFromGeoJSONFeature(feature, uploadBatch);
        
        if (!paddock.paddockId) {
          paddock.paddockId = `paddock_${i}_${Date.now()}`;
        }
        
        paddock.calculatedAreaHectares = paddock.areaHectares; // Simplified
        
        const savedPaddock = await paddock.save();
        savedPaddocks.push(savedPaddock);
        results.successful++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          featureIndex: i,
          error: error.message,
          details: error.errors || []
        });
      }
    }

    // Update project statistics
    const projectNames = [...new Set(savedPaddocks.map(p => p.projectName))];
    const updatedProjects = [];
    
    for (const projectName of projectNames) {
      try {
        const project = await Project.updateProjectStats(projectName);
        if (project) {
          updatedProjects.push(project);
        }
      } catch (error) {
        console.error(`Error updating project stats for ${projectName}:`, error);
      }
    }

    await Project.assignColors();

    res.json({
      success: true,
      data: {
        uploadBatch,
        results,
        projectsUpdated: updatedProjects.length,
        projects: updatedProjects.map(p => p.name)
      },
      message: `Successfully processed ${results.successful} of ${results.total} features`
    });

  } catch (error) {
    console.error('Error uploading JSON data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload JSON data',
      message: error.message
    });
  }
});

// GET /api/v1/upload/batches - Get upload batch history
router.get('/batches', async (req, res) => {
  try {
    const batches = await Paddock.aggregate([
      {
        $group: {
          _id: '$uploadBatch',
          uploadedAt: { $first: '$uploadedAt' },
          totalFeatures: { $sum: 1 },
          validFeatures: { $sum: { $cond: ['$isValid', 1, 0] } },
          projects: { $addToSet: '$projectName' },
          owners: { $addToSet: '$owner' }
        }
      },
      {
        $sort: { uploadedAt: -1 }
      },
      {
        $limit: 50
      }
    ]);

    res.json({
      success: true,
      data: batches.map(batch => ({
        batchId: batch._id,
        uploadedAt: batch.uploadedAt,
        totalFeatures: batch.totalFeatures,
        validFeatures: batch.validFeatures,
        invalidFeatures: batch.totalFeatures - batch.validFeatures,
        projectCount: batch.projects.length,
        ownerCount: batch.owners.length,
        projects: batch.projects,
        owners: batch.owners
      }))
    });

  } catch (error) {
    console.error('Error fetching upload batches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upload batches',
      message: error.message
    });
  }
});

module.exports = router;
