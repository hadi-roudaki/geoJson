const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Paddock = require('../models/Paddock');

// GET /api/v1/projects - Get all projects with statistics
router.get('/', async (req, res) => {
  try {
    const { sort = '-lastUpdated' } = req.query;

    const projects = await Project.find({})
      .sort(sort)
      .lean();

    // Ensure colors are assigned
    await Project.assignColors();

    res.json({
      success: true,
      data: projects.map(project => ({
        id: project._id,
        name: project.name,
        description: project.description,
        statistics: {
          totalPaddocks: project.totalPaddocks,
          validPaddocks: project.validPaddocks,
          invalidPaddocks: project.totalPaddocks - project.validPaddocks,
          totalAreaAcres: project.totalAreaAcres,
          totalAreaHectares: project.totalAreaHectares,
          calculatedAreaHectares: project.calculatedAreaHectares,
          owners: project.owners,
          averagePaddockSize: project.validPaddocks > 0 ? project.totalAreaHectares / project.validPaddocks : 0
        },
        bounds: project.bounds,
        color: project.color,
        createdAt: project.createdAt,
        lastUpdated: project.lastUpdated
      }))
    });

  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      message: error.message
    });
  }
});

// GET /api/v1/projects/:name - Get specific project with detailed statistics
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    const project = await Project.findOne({ name });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get detailed paddock information for this project
    const paddocks = await Paddock.find({ projectName: name })
      .select('paddockId name owner areaAcres areaHectares calculatedAreaHectares isValid uploadedAt')
      .sort('-uploadedAt')
      .lean();

    res.json({
      success: true,
      data: {
        id: project._id,
        name: project.name,
        description: project.description,
        statistics: project.statistics,
        bounds: project.bounds,
        color: project.color,
        paddocks: paddocks,
        createdAt: project.createdAt,
        lastUpdated: project.lastUpdated
      }
    });

  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
      message: error.message
    });
  }
});

// PUT /api/v1/projects/:name - Update project details
router.put('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { description, color } = req.body;

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    updateData.lastUpdated = new Date();

    const project = await Project.findOneAndUpdate(
      { name },
      updateData,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });

  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
      message: error.message
    });
  }
});

// DELETE /api/v1/projects/:name - Delete project and all its paddocks
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;

    // Delete all paddocks for this project
    const paddockDeleteResult = await Paddock.deleteMany({ projectName: name });

    // Delete the project
    const project = await Project.findOneAndDelete({ name });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: `Project '${name}' and ${paddockDeleteResult.deletedCount} paddocks deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
      message: error.message
    });
  }
});

// POST /api/v1/projects/refresh-stats - Refresh all project statistics
router.post('/refresh-stats', async (req, res) => {
  try {
    // Get all unique project names from paddocks
    const projectNames = await Paddock.distinct('projectName');

    const updatedProjects = [];
    for (const projectName of projectNames) {
      const project = await Project.updateProjectStats(projectName);
      if (project) {
        updatedProjects.push(project);
      }
    }

    // Assign colors to projects
    await Project.assignColors();

    res.json({
      success: true,
      data: updatedProjects,
      message: `Updated statistics for ${updatedProjects.length} projects`
    });

  } catch (error) {
    console.error('Error refreshing project statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh project statistics',
      message: error.message
    });
  }
});

// GET /api/v1/projects/stats/summary - Get project summary statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const projectCount = await Project.countDocuments();
    const projects = await Project.find({}).select('totalPaddocks validPaddocks totalAreaHectares calculatedAreaHectares').lean();

    const summary = projects.reduce((acc, project) => {
      acc.totalPaddocks += project.totalPaddocks;
      acc.validPaddocks += project.validPaddocks;
      acc.totalAreaHectares += project.totalAreaHectares;
      acc.calculatedAreaHectares += project.calculatedAreaHectares;
      return acc;
    }, {
      totalPaddocks: 0,
      validPaddocks: 0,
      totalAreaHectares: 0,
      calculatedAreaHectares: 0
    });

    res.json({
      success: true,
      data: {
        projectCount,
        totalPaddocks: summary.totalPaddocks,
        validPaddocks: summary.validPaddocks,
        invalidPaddocks: summary.totalPaddocks - summary.validPaddocks,
        totalAreaHectares: summary.totalAreaHectares,
        calculatedAreaHectares: summary.calculatedAreaHectares,
        averageProjectSize: projectCount > 0 ? summary.totalAreaHectares / projectCount : 0
      }
    });

  } catch (error) {
    console.error('Error fetching project summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project summary',
      message: error.message
    });
  }
});

module.exports = router;
