const express = require('express');
const router = express.Router();
const Paddock = require('../models/Paddock');
const Project = require('../models/Project');

// GET /api/v1/paddocks - Get all paddocks with optional filtering
router.get('/', async (req, res) => {
  try {
    const {
      project,
      owner,
      valid,
      limit = 100,
      offset = 0,
      sort = '-uploadedAt'
    } = req.query;

    // Build filter object
    const filter = {};
    if (project) filter.projectName = project;
    if (owner) filter.owner = owner;
    if (valid !== undefined) filter.isValid = valid === 'true';

    // Execute query with pagination
    const paddocks = await Paddock.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    // Get total count for pagination
    const total = await Paddock.countDocuments(filter);

    // Convert to GeoJSON FeatureCollection
    const featureCollection = {
      type: 'FeatureCollection',
      features: paddocks.map(paddock => ({
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
          is_valid: paddock.isValid,
          _id: paddock._id
        },
        geometry: paddock.geometry
      }))
    };

    res.json({
      success: true,
      data: featureCollection,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('Error fetching paddocks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch paddocks',
      message: error.message
    });
  }
});

// GET /api/v1/paddocks/:id - Get specific paddock
router.get('/:id', async (req, res) => {
  try {
    const paddock = await Paddock.findById(req.params.id);
    
    if (!paddock) {
      return res.status(404).json({
        success: false,
        error: 'Paddock not found'
      });
    }

    res.json({
      success: true,
      data: paddock.geoJsonFeature
    });

  } catch (error) {
    console.error('Error fetching paddock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch paddock',
      message: error.message
    });
  }
});

// GET /api/v1/paddocks/project/:projectName - Get paddocks by project
router.get('/project/:projectName', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const paddocks = await Paddock.find({ projectName })
      .sort('-uploadedAt')
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const total = await Paddock.countDocuments({ projectName });

    const featureCollection = {
      type: 'FeatureCollection',
      features: paddocks.map(paddock => ({
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
          is_valid: paddock.isValid,
          _id: paddock._id
        },
        geometry: paddock.geometry
      }))
    };

    res.json({
      success: true,
      data: featureCollection,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('Error fetching paddocks by project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch paddocks by project',
      message: error.message
    });
  }
});

// DELETE /api/v1/paddocks/:id - Delete specific paddock
router.delete('/:id', async (req, res) => {
  try {
    const paddock = await Paddock.findById(req.params.id);
    
    if (!paddock) {
      return res.status(404).json({
        success: false,
        error: 'Paddock not found'
      });
    }

    const projectName = paddock.projectName;
    await paddock.deleteOne();

    // Update project statistics
    await Project.updateProjectStats(projectName);

    res.json({
      success: true,
      message: 'Paddock deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting paddock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete paddock',
      message: error.message
    });
  }
});

// GET /api/v1/paddocks/stats/summary - Get overall statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Paddock.aggregate([
      {
        $group: {
          _id: null,
          totalPaddocks: { $sum: 1 },
          validPaddocks: { $sum: { $cond: ['$isValid', 1, 0] } },
          totalAreaAcres: { $sum: '$areaAcres' },
          totalAreaHectares: { $sum: '$areaHectares' },
          calculatedAreaHectares: { $sum: '$calculatedAreaHectares' },
          uniqueProjects: { $addToSet: '$projectName' },
          uniqueOwners: { $addToSet: '$owner' }
        }
      }
    ]);

    const summary = stats[0] || {
      totalPaddocks: 0,
      validPaddocks: 0,
      totalAreaAcres: 0,
      totalAreaHectares: 0,
      calculatedAreaHectares: 0,
      uniqueProjects: [],
      uniqueOwners: []
    };

    res.json({
      success: true,
      data: {
        totalPaddocks: summary.totalPaddocks,
        validPaddocks: summary.validPaddocks,
        invalidPaddocks: summary.totalPaddocks - summary.validPaddocks,
        totalAreaAcres: summary.totalAreaAcres,
        totalAreaHectares: summary.totalAreaHectares,
        calculatedAreaHectares: summary.calculatedAreaHectares,
        projectCount: summary.uniqueProjects.length,
        ownerCount: summary.uniqueOwners.length,
        projects: summary.uniqueProjects,
        owners: summary.uniqueOwners
      }
    });

  } catch (error) {
    console.error('Error fetching paddock statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

module.exports = router;
