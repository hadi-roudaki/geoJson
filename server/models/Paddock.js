const mongoose = require('mongoose');

// GeoJSON Point Schema
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: function(coords) {
        return coords.length === 2 && 
               coords[0] >= -180 && coords[0] <= 180 && // longitude
               coords[1] >= -90 && coords[1] <= 90;     // latitude
      },
      message: 'Coordinates must be [longitude, latitude] with valid ranges'
    }
  }
});

// GeoJSON Polygon Schema
const polygonSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Polygon'],
    required: true
  },
  coordinates: {
    type: [[[Number]]],
    required: true,
    validate: {
      validator: function(coords) {
        // Basic validation - at least one ring with at least 4 points
        return coords.length >= 1 && 
               coords[0].length >= 4 &&
               coords[0][0][0] === coords[0][coords[0].length - 1][0] &&
               coords[0][0][1] === coords[0][coords[0].length - 1][1];
      },
      message: 'Polygon must have at least one ring with minimum 4 points, and first/last points must be identical'
    }
  }
});

// Main Paddock Schema
const paddockSchema = new mongoose.Schema({
  // Original GeoJSON properties
  paddockId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  projectName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  areaAcres: {
    type: Number,
    required: true,
    min: 0
  },
  
  // GeoJSON geometry
  geometry: {
    type: polygonSchema,
    required: true,
    index: '2dsphere' // Enable geospatial queries
  },
  
  // Calculated fields
  areaHectares: {
    type: Number,
    min: 0
  },
  calculatedAreaHectares: {
    type: Number,
    min: 0
  },
  centroid: {
    type: pointSchema,
    index: '2dsphere'
  },
  
  // Metadata
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  uploadBatch: {
    type: String,
    index: true
  },
  isValid: {
    type: Boolean,
    default: true,
    index: true
  },
  validationErrors: [{
    field: String,
    message: String
  }],
  
  // Additional properties from original GeoJSON
  originalProperties: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
paddockSchema.index({ projectName: 1, owner: 1 });
paddockSchema.index({ uploadBatch: 1, uploadedAt: -1 });
paddockSchema.index({ isValid: 1, projectName: 1 });

// Virtual for GeoJSON Feature format
paddockSchema.virtual('geoJsonFeature').get(function() {
  return {
    type: 'Feature',
    properties: {
      id: this.paddockId,
      name: this.name,
      owner: this.owner,
      Project__Name: this.projectName,
      area_acres: this.areaAcres,
      area_hectares: this.areaHectares,
      calculated_area_hectares: this.calculatedAreaHectares,
      uploaded_at: this.uploadedAt,
      is_valid: this.isValid
    },
    geometry: this.geometry
  };
});

// Static method to create from GeoJSON feature
paddockSchema.statics.createFromGeoJSONFeature = function(feature, uploadBatch) {
  const props = feature.properties;
  
  return new this({
    paddockId: (props.id && props.id.toString()) || (props.paddockId && props.paddockId.toString()),
    name: props.name || props.paddock_name || 'Unnamed Paddock',
    owner: props.owner || 'Unknown Owner',
    projectName: props.Project__Name || props.project_name || 'Unknown Project',
    areaAcres: parseFloat(props.area_acres) || 0,
    geometry: feature.geometry,
    uploadBatch: uploadBatch,
    originalProperties: props
  });
};

// Pre-save middleware to calculate derived fields
paddockSchema.pre('save', function(next) {
  // Convert acres to hectares
  if (this.areaAcres && !this.areaHectares) {
    this.areaHectares = this.areaAcres * 0.404686;
  }
  
  // Calculate centroid (simplified - using first coordinate of first ring)
  if (this.geometry && this.geometry.coordinates && this.geometry.coordinates[0] && this.geometry.coordinates[0][0]) {
    const coords = this.geometry.coordinates[0];
    let sumLng = 0, sumLat = 0;
    coords.forEach(coord => {
      sumLng += coord[0];
      sumLat += coord[1];
    });
    this.centroid = {
      type: 'Point',
      coordinates: [sumLng / coords.length, sumLat / coords.length]
    };
  }
  
  next();
});

module.exports = mongoose.model('Paddock', paddockSchema);
