# Loam - GeoJSON Paddock Management System

A modern React application for uploading, validating, and visualizing GeoJSON paddock data with project-based grouping and interactive mapping.

## 🚀 How to Run the App

### Prerequisites
- Node.js v18+ (recommended)
- npm or yarn

### Development Mode
1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/hadi-roudaki/geoJson
   cd geoJson
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:5173` (or the URL shown in terminal)

### Other Commands
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🛠️ Tech Stack

- **Frontend Framework:** React 18 with TypeScript
- **Build Tool:** Vite for fast development and building
- **Styling:** Tailwind CSS for utility-first styling
- **Mapping:** Leaflet with React-Leaflet for interactive maps
- **Geospatial:** Turf.js for geometric calculations and area analysis
- **Code Quality:** ESLint for code linting
- **File Handling:** Native File API with drag-and-drop support

## 📋 My Approach to Grouping and Calculating Paddock Info

### 1. **Data Validation Strategy**
- **Strict GeoJSON Validation:** Comprehensive validation of FeatureCollection structure using custom validators
- **Geometry Validation:** Uses Turf.js to validate polygon geometry before processing
- **Property Validation:** Ensures required fields (id, area_acres, owner, name, Project__Name) are present and correctly typed

### 2. **Project Grouping Logic**
```typescript
// Only include features that meet both criteria:
1. Valid geometry (validated by Turf.js polygon creation)
2. Valid project name (non-null, non-empty string)

// Group by exact Project__Name match
const grouped = features
  .filter(isValidFeature)
  .reduce((groups, feature) => {
    const projectName = feature.properties.Project__Name;
    groups[projectName] = groups[projectName] || [];
    groups[projectName].push(feature);
    return groups;
  }, {});
```

### 3. **Area Calculation Approach**
- **Dual Area System:** Shows both property-declared area and calculated geometric area
- **Property Area:** Converts acres to hectares (1 acre = 0.404686 hectares)
- **Calculated Area:** Uses Turf.js `area()` function for precise geometric calculation
  - Calculates in square meters using spherical geometry
  - Converts to hectares (÷ 10,000)
  - Accounts for Earth's curvature and coordinate system projections

### 4. **Error Handling Philosophy**
- **Graceful Degradation:** Invalid geometries are excluded but counted
- **Transparent Reporting:** Shows both valid and invalid feature counts
- **User Feedback:** Clear error messages for validation failures
- **Data Integrity:** Never crashes on malformed data

## 🏗️ Project Structure

```
src/
├── components/
│   ├── FileUpload/         # Drag & drop file upload
│   ├── GeoJSONViewer/      # Main data viewer with view modes
│   ├── PaddockMap/         # Leaflet map components
│   ├── ProjectCard/        # Project overview cards
│   ├── ProjectGroupViewer/ # Detailed project grouping
│   └── index.ts           # Component exports
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript definitions
├── utils/                 # Utility functions & validation
├── app-bundle.js          # Compiled React app for browser
├── App.tsx               # Main application
└── main.tsx              # Entry point

public/
├── sample_paddocks.geojson      # Montana agricultural paddocks
├── sample_farm_fields.geojson   # Midwest farm fields
├── sample_vineyard_blocks.geojson # California vineyard blocks
└── sample_urban_plots.geojson   # Urban garden plots
```

## 🎯 Key Features

### **Project Overview Cards**
- Collapsible cards showing project name, total area (hectares), and valid paddock count
- "View on Map" button for direct map navigation with project highlighting
- Expandable details with area breakdowns and paddock lists

### **Interactive Paddock Map**
- **Visual representation** of all paddock shapes using Leaflet mapping
- **Color-coded polygons** by project with consistent color scheme
- **Interactive popups** showing paddock details (name, project, owner, area, ID)
- **Project filtering** buttons to show/hide specific projects
- **Auto-zoom** to fit all visible paddocks in view
- **Smooth navigation** from project cards to map with highlighting

### **Interactive Map Visualization**
- Leaflet-based map with color-coded project polygons
- Clickable paddocks with detailed popup information
- Project filtering via interactive legend
- Automatic bounds fitting and responsive design

### **Multiple View Modes**
- **Project Overview:** Card-based project summary view
- **All Features:** Traditional list of all paddocks
- **Detailed View:** Grouped project view with statistics
- **Map View:** Interactive geographic visualization

### **Multiple Sample Datasets**
- **Montana Paddocks:** Large agricultural paddocks with 5 different projects
- **Farm Fields:** Midwest farm fields with corn, wheat, soybean, and grazing projects
- **Vineyard Blocks:** California vineyard blocks with premium, organic, and boutique wine projects
- **Urban Gardens:** Small urban plots including community gardens, rooftop gardens, and educational spaces
- One-click loading with dropdown selection - no upload required for testing

### **Enhanced UX**
- ✅ Drag and drop file upload with visual feedback
- ✅ Interactive map with paddock shape visualization
- ✅ Detailed tooltips and popups on map features
- ✅ Color legend for different projects with filtering
- ✅ Smooth navigation between project cards and map
- ✅ Responsive design for mobile and desktop

## 📊 Data Processing Pipeline

1. **File Upload/Loading** → Drag & drop or sample data loading
2. **JSON Parsing** → Parse and validate JSON structure
3. **GeoJSON Validation** → Validate FeatureCollection schema
4. **Geometry Validation** → Use Turf.js to validate polygon geometry
5. **Project Filtering** → Filter features with valid project names
6. **Area Calculation** → Calculate areas using both property data and geometric analysis
7. **Project Grouping** → Group valid features by Project__Name
8. **Visualization** → Display in cards, lists, or interactive map

## Hooks

### useCounter
A custom hook for managing counter state with increment, decrement, and reset functionality.

### useLocalStorage
A custom hook for persisting state to localStorage with automatic serialization.

## GeoJSON File Upload Feature

The application includes a comprehensive GeoJSON file upload and validation system:

### Features:
- **Drag & Drop Upload**: Intuitive file upload with drag-and-drop support
- **File Validation**: Strict validation of .geojson file format
- **GeoJSON Validation**: Comprehensive validation of GeoJSON FeatureCollection structure
- **Interactive Viewer**: Browse and inspect uploaded GeoJSON features
- **Data Summary**: Overview of collection statistics and properties
- **Project Grouping**: Automatically groups features by their `Project__Name` property
- **Smart Filtering**: Excludes features without valid geometry or project names
- **Dual View Modes**: Toggle between viewing all features or grouped by projects
- **Project Statistics**: Detailed statistics for each project including total area and feature count
- **Accurate Area Calculation**: Uses Turf.js for precise polygon area calculation in hectares
- **Geometry Validation**: Validates polygon geometry before area calculations
- **Dual Area Display**: Shows both property-based area and calculated geometric area
- **Interactive Map Visualization**: Leaflet-based map showing paddock polygons with project-based color coding
- **Map Filtering**: Filter map view by project with interactive legend
- **Clickable Polygons**: Click on paddocks for detailed information popups

### Supported GeoJSON Structure:
```json
{
  "type": "FeatureCollection",
  "name": "collection_name",
  "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": 1,
        "area_acres": 100.5,
        "owner": "Owner Name",
        "name": "Feature Name",
        "Project__Name": "Project Name or null"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lng, lat], [lng, lat], ...]]
      }
    }
  ]
}
```

### Project Grouping Logic:
The application automatically groups features (paddocks) by their `Project__Name` property with the following rules:

1. **Valid Features**: Only features with both valid geometry and a non-null, non-empty `Project__Name` are included
2. **Automatic Grouping**: Features are grouped by their exact `Project__Name` value
3. **Statistics Calculation**: For each project group, the system calculates:
   - Total number of paddocks (all features)
   - Total number of valid paddocks (with valid geometry)
   - Combined area from property data (acres → hectares)
   - Calculated area using Turf.js geometric analysis (hectares)
   - List of unique owners
   - Individual feature details with geometry validation status
4. **Exclusion Handling**: Features without valid projects or geometry are counted but excluded from grouping

### View Modes:
- **All Features**: Traditional view showing every feature in the collection
- **By Projects**: Grouped view organizing features by their project assignments
- **Map View**: Interactive Leaflet map with color-coded project polygons
- **Raw Data**: JSON view for technical inspection

## ⚠️ Assumptions and Limitations

### **Assumptions Made**
1. **GeoJSON Structure:** Assumes specific property schema with `Project__Name`, `area_acres`, `owner`, `name`, and `id` fields
2. **Coordinate System:** Expects WGS84/CRS84 coordinate system (longitude, latitude)
3. **Polygon Geometry:** Only supports Polygon geometry type (not MultiPolygon or other types)
4. **Project Names:** Treats project names as case-sensitive exact matches
5. **Area Units:** Property areas assumed to be in acres, calculated areas in hectares

### **Current Limitations**
1. **File Size:** No explicit file size limits, but large files may impact performance
2. **Geometry Types:** Only Polygon geometries supported (no Points, Lines, MultiPolygons)
3. **Coordinate Systems:** Limited to WGS84, no projection transformations
4. **Browser Compatibility:** Requires modern browsers with File API support
5. **Offline Usage:** Requires internet connection for map tiles

### **Performance Considerations**
- **Large Datasets:** Performance may degrade with 1000+ features
- **Map Rendering:** Complex polygons may slow map interactions
- **Memory Usage:** All data loaded into memory (no pagination)

## 🧪 Testing

### **Sample Data**
- Click "Load Sample Data" dropdown to choose from 4 different datasets:
  - **Montana Paddocks:** 11 large agricultural paddocks (245-445 acres each)
  - **Farm Fields:** 10 midwest farm fields (89-445 acres each)
  - **Vineyard Blocks:** 12 California vineyard blocks (4-22 acres each)
  - **Urban Gardens:** 10 small urban plots (0.15-1.2 acres each)
- Each dataset demonstrates different project types, scales, and use cases
- Includes examples of invalid geometries and null projects for testing edge cases

### **Manual Testing**
- Upload your own .geojson files with the expected schema
- Test drag-and-drop functionality
- Verify area calculations and project grouping

### Area Calculation:
The application uses **Turf.js** for accurate geometric area calculations:

1. **Geometry Validation**: Each polygon is validated using Turf.js before area calculation
2. **Precise Calculation**: Areas are calculated in square meters and converted to hectares
3. **Error Handling**: Invalid geometries are gracefully handled and excluded from calculations
4. **Dual Display**: Shows both property-based area (from GeoJSON properties) and calculated geometric area
5. **Unit Conversion**:
   - Property areas: acres → hectares (1 acre = 0.404686 hectares)
   - Calculated areas: square meters → hectares (1 hectare = 10,000 m²)

### Map Visualization:
The application includes an interactive **Leaflet** map for visualizing paddock polygons:

1. **Project Color Coding**: Each project is assigned a unique color from a predefined palette
2. **Interactive Polygons**: Click on any paddock to view detailed information
3. **Project Filtering**: Use the legend to filter the map view by specific projects
4. **Automatic Bounds**: Map automatically fits to show all valid paddocks
5. **Detailed Popups**: Each polygon shows:
   - Paddock name, ID, and owner
   - Project assignment with color indicator
   - Both property-based and calculated areas
   - Geometry validation status

## Technologies Used

- React 18
- TypeScript
- Vite
- Tailwind CSS
- ESLint
- GeoJSON validation and parsing
- **Turf.js** for geometric calculations and area analysis
- **Leaflet** for interactive map visualization
- **React-Leaflet** for React integration with Leaflet maps
