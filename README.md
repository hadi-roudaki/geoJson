# Loam - GeoJSON Paddock Management System

A full-stack application for uploading, validating, visualizing, and managing GeoJSON paddock data with RFC 7946 compliance, project-based grouping, interactive mapping, and comprehensive data management features.

## 🏗️ Architecture

This project consists of two main components:

### **Frontend (Client)**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS with Lucide React icons
- **Mapping**: Leaflet with React-Leaflet
- **Geospatial**: Turf.js for geometric calculations
- **UI Components**: Custom components with tab navigation
- **Port**: 5173 (development)

### **Backend (Server)**
- **Framework**: Express.js with Node.js
- **Storage**: MongoDB with Mongoose ODM
- **API**: RESTful API with CORS enabled and comprehensive validation
- **GeoJSON Support**: RFC 7946 compliant (Feature and FeatureCollection)
- **Security**: Helmet, rate limiting, input validation
- **Port**: 3001

## 🚀 Quick Start

### Prerequisites
- Node.js v11+ (tested with v11.13.0)
- npm or yarn
- MongoDB (required)

### 1. Clone and Install
```bash
git clone https://github.com/hadi-roudaki/geoJson
cd geoJson

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### 2. Setup MongoDB
**Option A: Local MongoDB**
```bash
# macOS (using Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb

# Verify MongoDB is running
mongosh --eval "db.runCommand('ping')"
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at https://www.mongodb.com/atlas
2. Create a new cluster
3. Get connection string
4. Create `.env` file in server directory with your MongoDB URI

### 3. Start the Application

**Start both services separately**
```bash
# Terminal 1 - Start the backend server
cd server
npm run dev

# Terminal 2 - Start the frontend client
cd client
npm run dev
```



### 4. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### 5. Application Features
Navigate through three main sections:
- **Upload & View**: Upload and visualize GeoJSON files
- **Uploaded Data**: Browse all uploaded data in organized batches
- **Demo Features**: Development utilities and examples

## 📁 Project Structure

```
geoJson/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── UploadedDataList/  # Data list view component
│   │   │   ├── FileUpload/        # File upload component
│   │   │   ├── GeoJSONViewer/     # Data visualization
│   │   │   └── ...               # Other UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript definitions
│   │   └── utils/         # Utility functions & validation
│   ├── public/            # Static assets & sample data
│   ├── server.js          # Development server
│   └── package.json       # Client dependencies
├── server/                # Express backend API
│   ├── models/            # MongoDB models
│   ├── routes/            # API route handlers
│   ├── server.js          # MongoDB-based server
│   ├── .env.example       # Environment variables template
│   └── package.json       # Server dependencies
└── README.md              # This file
```

## 🛠️ Available Scripts

### Client Scripts
```bash
npm run dev          # Start development server
npm run dev:vite     # Start Vite development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Server Scripts
```bash
npm start            # Start MongoDB server
npm run dev          # Start MongoDB server with nodemon
```

## 🌟 Key Features

### **RFC 7946 GeoJSON Support**
- **Dual Format Support**: Individual Feature objects and FeatureCollection
- **Comprehensive Validation**: Structure, geometry, and coordinate validation
- **All Geometry Types**: Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection
- **Flexible Properties**: Optional properties with application-specific validation
- **Coordinate Validation**: Longitude (-180 to 180), Latitude (-90 to 90)

### **File Upload & Management**
- **Drag & Drop Interface**: Modern file upload with visual feedback
- **File Type Validation**: Accepts .json and .geojson files only (max 10MB)
- **Server Integration**: Automatic upload to backend after validation
- **Batch Organization**: Groups uploaded data by upload sessions
- **Error Handling**: Detailed validation errors with specific guidance

### **Interactive Mapping**
- **Leaflet Integration**: Interactive maps with pan, zoom, and click interactions
- **Color-coded Visualization**: Polygons colored by project for easy identification
- **Detailed Popups**: Click features to see properties and metadata
- **Project Filtering**: Filter by project with dynamic legend
- **Automatic Bounds**: Smart map centering and zoom fitting

### **Data Management Interface**
- **Tab Navigation**: Upload & View, Uploaded Data, Demo Features
- **Upload & View Tab**: File upload, validation, and immediate visualization
- **Uploaded Data Tab**: Browse all uploaded data organized by upload batches
- **Batch Management**: Collapsible sections showing upload metadata
- **Rich Metadata**: Display upload dates, item counts, total areas, owners, projects

### **Data Visualization**
- **Multiple View Modes**: Cards, lists, interactive maps
- **Dual Area Calculations**: Property-based and geometric calculations
- **Project Statistics**: Automatic aggregation and summaries
- **Geometry Type Support**: Visual indicators for Points, Polygons, etc.
- **Sample Datasets**: Pre-loaded diverse data for testing

### **RESTful API**
- `GET /health` - Health check with uptime and status
- `GET /api/v1/paddocks` - List all paddocks as GeoJSON FeatureCollection
- `GET /api/v1/projects` - List all projects with statistics
- `POST /api/v1/upload/json` - Upload GeoJSON data (Feature or FeatureCollection)
- `GET /api/v1/paddocks/:id` - Get specific paddock
- `DELETE /api/v1/paddocks/:id` - Delete paddock

## 🔧 Configuration Options

### Storage

**MongoDB Storage**
- Requires MongoDB installation
- Scalable for all deployments
- Geospatial indexing support
- Use: `npm start` or `npm run dev`

### Environment Variables

Create `.env` files in both client and server directories:

**Server (.env)**
```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/loam-paddocks
API_BASE_URL=/api/v1
```

**Client (.env)**
```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

## 🧪 Testing

### Sample Data
The application includes diverse sample datasets:
- **Agricultural Paddocks**: Large-scale farming operations (Montana)
- **Urban Gardens**: Small community and rooftop gardens (San Francisco)
- **Vineyard Blocks**: Wine production areas (Napa Valley)
- **Organic Farms**: Sustainable farming operations (California)
- **Research Plots**: University agricultural research (Minnesota)

### Data Diversity
- **Geometry Types**: Points (gardens, research plots) and Polygons (farms, vineyards)
- **Scale Variety**: From 0.15 acres (rooftop gardens) to 441 acres (crop fields)
- **Project Types**: Community gardens, commercial agriculture, research, wine production
- **Geographic Spread**: Multiple states and use cases

### Manual Testing
1. Start both client and server
2. Open http://localhost:5173
3. **Upload & View Tab**:
   - Use "Load Sample Data" or upload your own GeoJSON files
   - Test both .json and .geojson file formats
   - Try individual Feature objects and FeatureCollection formats
4. **Uploaded Data Tab**:
   - Browse uploaded data organized by batches
   - Expand/collapse batch sections
   - View individual item details
5. **Test different view modes and map interactions**

## 🚀 Deployment

### Production Build
```bash
# Build client for production
cd client
npm run build

# Start production server
cd ../server
NODE_ENV=production npm start
```

### Docker Support (Future Enhancement)
Consider adding Docker containers for easier deployment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Common Issues

**Node.js Version Compatibility**
- Minimum Node.js v11+ required (tested with v11.13.0)
- Compatible with older Node.js versions for broader compatibility

**Port Conflicts**
- Client default: 5173
- Server default: 3001
- Change ports in package.json scripts if needed

**File Upload Issues**
- Only .json and .geojson files accepted
- Maximum file size: 10MB
- Ensure valid JSON syntax and GeoJSON structure

**CORS Issues**
- Ensure server CORS_ORIGIN matches client URL
- Default: http://localhost:5173

**Data Storage**
- MongoDB storage: Required for all deployments
- Data persists in MongoDB database

**API Connectivity**
- Frontend automatically uploads valid files to backend
- Backend validation ensures data integrity
- Graceful fallback if server upload fails

For more detailed information, see the individual README files in the `client/` and `server/` directories.
