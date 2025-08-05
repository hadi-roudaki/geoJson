const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Aggregated statistics
  totalPaddocks: {
    type: Number,
    default: 0,
    min: 0
  },
  validPaddocks: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAreaAcres: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAreaHectares: {
    type: Number,
    default: 0,
    min: 0
  },
  calculatedAreaHectares: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Owners associated with this project
  owners: [{
    type: String,
    trim: true
  }],
  
  // Geographic bounds
  bounds: {
    north: Number,
    south: Number,
    east: Number,
    west: Number
  },
  
  // Color for visualization
  color: {
    type: String,
    default: '#3B82F6'
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastUploadBatch: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for project statistics
projectSchema.virtual('statistics').get(function() {
  return {
    name: this.name,
    totalPaddocks: this.totalPaddocks,
    validPaddocks: this.validPaddocks,
    invalidPaddocks: this.totalPaddocks - this.validPaddocks,
    totalAreaAcres: this.totalAreaAcres,
    totalAreaHectares: this.totalAreaHectares,
    calculatedAreaHectares: this.calculatedAreaHectares,
    owners: this.owners,
    averagePaddockSize: this.validPaddocks > 0 ? this.totalAreaHectares / this.validPaddocks : 0,
    color: this.color
  };
});

// Static method to update project statistics
projectSchema.statics.updateProjectStats = async function(projectName) {
  const Paddock = mongoose.model('Paddock');
  
  // Aggregate paddock data for this project
  const stats = await Paddock.aggregate([
    { $match: { projectName: projectName } },
    {
      $group: {
        _id: '$projectName',
        totalPaddocks: { $sum: 1 },
        validPaddocks: { $sum: { $cond: ['$isValid', 1, 0] } },
        totalAreaAcres: { $sum: '$areaAcres' },
        totalAreaHectares: { $sum: '$areaHectares' },
        calculatedAreaHectares: { $sum: '$calculatedAreaHectares' },
        owners: { $addToSet: '$owner' },
        coordinates: { $push: '$geometry.coordinates' }
      }
    }
  ]);
  
  if (stats.length === 0) {
    // No paddocks found, remove project if it exists
    await this.deleteOne({ name: projectName });
    return null;
  }
  
  const stat = stats[0];
  
  // Calculate bounds from all coordinates
  let bounds = { north: -90, south: 90, east: -180, west: 180 };
  stat.coordinates.forEach(coordSet => {
    if (coordSet && coordSet[0]) {
      coordSet[0].forEach(coord => {
        if (coord && coord.length >= 2) {
          const [lng, lat] = coord;
          bounds.north = Math.max(bounds.north, lat);
          bounds.south = Math.min(bounds.south, lat);
          bounds.east = Math.max(bounds.east, lng);
          bounds.west = Math.min(bounds.west, lng);
        }
      });
    }
  });
  
  // Update or create project
  const project = await this.findOneAndUpdate(
    { name: projectName },
    {
      name: projectName,
      totalPaddocks: stat.totalPaddocks,
      validPaddocks: stat.validPaddocks,
      totalAreaAcres: stat.totalAreaAcres,
      totalAreaHectares: stat.totalAreaHectares,
      calculatedAreaHectares: stat.calculatedAreaHectares,
      owners: stat.owners,
      bounds: bounds,
      lastUpdated: new Date()
    },
    { 
      upsert: true, 
      new: true,
      setDefaultsOnInsert: true
    }
  );
  
  return project;
};

// Static method to generate project colors
projectSchema.statics.assignColors = async function() {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#14B8A6', '#F43F5E'
  ];
  
  const projects = await this.find({}).sort({ createdAt: 1 });
  
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    if (!project.color || project.color === '#3B82F6') {
      project.color = colors[i % colors.length];
      await project.save();
    }
  }
};

module.exports = mongoose.model('Project', projectSchema);
