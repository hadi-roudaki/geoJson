// Simple test file to verify GeoJSON validation and grouping
// Note: This is a basic test file - in a real project you'd use Jest or similar

import { validateGeoJSONFeatureCollection, groupFeaturesByProject, isValidFeature, getProjectStatistics, calculateFeatureAreaHectares, isValidGeometry } from './index';
import { GeoJSONFeature } from '../types';

// Valid GeoJSON sample
const validGeoJSON = {
  "type": "FeatureCollection",
  "name": "test_collection",
  "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": 1,
        "area_acres": 100.5,
        "owner": "Test Owner",
        "name": "Test Feature",
        "Project__Name": "Test Project"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-109.5, 47.0],
            [-109.4, 47.0],
            [-109.4, 47.1],
            [-109.5, 47.1],
            [-109.5, 47.0]
          ]
        ]
      }
    }
  ]
};

// Test cases
export const runGeoJSONTests = () => {
  console.log('Running GeoJSON validation tests...');

  // Test 1: Valid GeoJSON
  try {
    validateGeoJSONFeatureCollection(validGeoJSON);
    console.log('✅ Test 1 passed: Valid GeoJSON accepted');
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }

  // Test 2: Invalid type
  try {
    validateGeoJSONFeatureCollection({ ...validGeoJSON, type: 'Invalid' });
    console.error('❌ Test 2 failed: Should have rejected invalid type');
  } catch (error) {
    console.log('✅ Test 2 passed: Invalid type rejected');
  }

  // Test 3: Missing features
  try {
    const { features, ...invalidGeoJSON } = validGeoJSON;
    validateGeoJSONFeatureCollection(invalidGeoJSON);
    console.error('❌ Test 3 failed: Should have rejected missing features');
  } catch (error) {
    console.log('✅ Test 3 passed: Missing features rejected');
  }

  // Test 4: Invalid feature properties
  try {
    const invalidFeature = {
      ...validGeoJSON,
      features: [{
        ...validGeoJSON.features[0],
        properties: {
          ...validGeoJSON.features[0].properties,
          id: "invalid" // Should be number
        }
      }]
    };
    validateGeoJSONFeatureCollection(invalidFeature);
    console.error('❌ Test 4 failed: Should have rejected invalid property type');
  } catch (error) {
    console.log('✅ Test 4 passed: Invalid property type rejected');
  }

  // Test 5: Invalid geometry
  try {
    const invalidGeometry = {
      ...validGeoJSON,
      features: [{
        ...validGeoJSON.features[0],
        geometry: {
          type: "Point", // Should be Polygon
          coordinates: [-109.5, 47.0]
        }
      }]
    };
    validateGeoJSONFeatureCollection(invalidGeometry);
    console.error('❌ Test 5 failed: Should have rejected invalid geometry type');
  } catch (error) {
    console.log('✅ Test 5 passed: Invalid geometry type rejected');
  }

  console.log('GeoJSON validation tests completed!');
};

// Test grouping functionality
export const runGroupingTests = () => {
  console.log('Running GeoJSON grouping tests...');

  // Create test features
  const validFeature1: GeoJSONFeature = {
    type: "Feature",
    properties: {
      id: 1,
      area_acres: 100,
      owner: "Owner 1",
      name: "Feature 1",
      Project__Name: "Project A"
    },
    geometry: {
      type: "Polygon",
      coordinates: [[[-109.5, 47.0], [-109.4, 47.0], [-109.4, 47.1], [-109.5, 47.1], [-109.5, 47.0]]]
    }
  };

  const validFeature2: GeoJSONFeature = {
    type: "Feature",
    properties: {
      id: 2,
      area_acres: 200,
      owner: "Owner 2",
      name: "Feature 2",
      Project__Name: "Project A"
    },
    geometry: {
      type: "Polygon",
      coordinates: [[[-109.6, 47.0], [-109.5, 47.0], [-109.5, 47.1], [-109.6, 47.1], [-109.6, 47.0]]]
    }
  };

  const validFeature3: GeoJSONFeature = {
    type: "Feature",
    properties: {
      id: 3,
      area_acres: 150,
      owner: "Owner 1",
      name: "Feature 3",
      Project__Name: "Project B"
    },
    geometry: {
      type: "Polygon",
      coordinates: [[[-109.7, 47.0], [-109.6, 47.0], [-109.6, 47.1], [-109.7, 47.1], [-109.7, 47.0]]]
    }
  };

  const invalidFeature: GeoJSONFeature = {
    type: "Feature",
    properties: {
      id: 4,
      area_acres: 50,
      owner: "Owner 3",
      name: "Feature 4",
      Project__Name: null // Invalid project name
    },
    geometry: {
      type: "Polygon",
      coordinates: [[[-109.8, 47.0], [-109.7, 47.0], [-109.7, 47.1], [-109.8, 47.1], [-109.8, 47.0]]]
    }
  };

  const features = [validFeature1, validFeature2, validFeature3, invalidFeature];

  // Test feature validation
  try {
    const valid1 = isValidFeature(validFeature1);
    const valid2 = isValidFeature(invalidFeature);

    if (valid1 && !valid2) {
      console.log('✅ Feature validation test passed');
    } else {
      console.error('❌ Feature validation test failed');
    }
  } catch (error) {
    console.error('❌ Feature validation test error:', error);
  }

  // Test grouping
  try {
    const grouped = groupFeaturesByProject(features);
    const projectNames = Object.keys(grouped);

    if (projectNames.length === 2 &&
        projectNames.includes('Project A') &&
        projectNames.includes('Project B') &&
        grouped['Project A'].length === 2 &&
        grouped['Project B'].length === 1) {
      console.log('✅ Grouping test passed');
    } else {
      console.error('❌ Grouping test failed');
    }
  } catch (error) {
    console.error('❌ Grouping test error:', error);
  }

  // Test statistics
  try {
    const grouped = groupFeaturesByProject(features);
    const stats = getProjectStatistics(grouped);

    if (stats.length === 2) {
      const projectA = stats.find(s => s.projectName === 'Project A');
      const projectB = stats.find(s => s.projectName === 'Project B');

      if (projectA && projectA.totalArea === 300 && projectA.featureCount === 2 &&
          projectB && projectB.totalArea === 150 && projectB.featureCount === 1) {
        console.log('✅ Statistics test passed');
      } else {
        console.error('❌ Statistics test failed');
      }
    } else {
      console.error('❌ Statistics test failed - wrong number of projects');
    }
  } catch (error) {
    console.error('❌ Statistics test error:', error);
  }

  console.log('GeoJSON grouping tests completed!');
};

// Test area calculation functionality
export const runAreaCalculationTests = () => {
  console.log('Running area calculation tests...');

  // Create a simple square polygon (approximately 1km x 1km)
  const squareFeature: GeoJSONFeature = {
    type: "Feature",
    properties: {
      id: 1,
      area_acres: 247.1, // Approximately 100 hectares
      owner: "Test Owner",
      name: "Square Test",
      Project__Name: "Test Project"
    },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-109.0, 47.0],
        [-109.0, 47.009], // Approximately 1km north
        [-108.991, 47.009], // Approximately 1km east
        [-108.991, 47.0],
        [-109.0, 47.0] // Close the polygon
      ]]
    }
  };

  // Test geometry validation
  try {
    const isValid = isValidGeometry(squareFeature);
    if (isValid) {
      console.log('✅ Geometry validation test passed');
    } else {
      console.error('❌ Geometry validation test failed');
    }
  } catch (error) {
    console.error('❌ Geometry validation test error:', error);
  }

  // Test area calculation
  try {
    const calculatedArea = calculateFeatureAreaHectares(squareFeature);

    // The calculated area should be approximately 100 hectares (allowing for some variance due to projection)
    if (calculatedArea > 90 && calculatedArea < 110) {
      console.log(`✅ Area calculation test passed: ${calculatedArea.toFixed(2)} hectares`);
    } else {
      console.error(`❌ Area calculation test failed: Expected ~100 ha, got ${calculatedArea.toFixed(2)} ha`);
    }
  } catch (error) {
    console.error('❌ Area calculation test error:', error);
  }

  // Test invalid geometry
  const invalidFeature: GeoJSONFeature = {
    ...squareFeature,
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-109.0, 47.0],
        [-109.0, 47.009],
        // Missing coordinates to make it invalid
      ]]
    }
  };

  try {
    const isValid = isValidGeometry(invalidFeature);
    const area = calculateFeatureAreaHectares(invalidFeature);

    if (!isValid && area === 0) {
      console.log('✅ Invalid geometry handling test passed');
    } else {
      console.error('❌ Invalid geometry handling test failed');
    }
  } catch (error) {
    console.error('❌ Invalid geometry handling test error:', error);
  }

  console.log('Area calculation tests completed!');
};

// Export for potential use in development
export { validGeoJSON };
