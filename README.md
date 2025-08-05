# Loam - GeoJSON Paddock Management System

A full-stack application for uploading, validating, and visualizing GeoJSON paddock data with project-based grouping and interactive mapping.

## 🏗️ Architecture

This project consists of two main components:

### **Frontend (Client)**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS
- **Mapping**: Leaflet with React-Leaflet
- **Geospatial**: Turf.js for geometric calculations
- **Port**: 5173 (development)

### **Backend (Server)**
- **Framework**: Express.js with Node.js
- **Storage Options**: 
  - File-based storage (default, no database required)
  - MongoDB support (optional, for production)
- **API**: RESTful API with CORS enabled
- **Port**: 3001

## 🚀 Quick Start

### Prerequisites
- Node.js v11+ (tested with v11.13.0)
- npm or yarn

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

### 2. Start the Application

**Option A: Start both services separately (recommended)**
```bash
# Terminal 1 - Start the backend server
cd server
npm run dev

# Terminal 2 - Start the frontend client
cd client
npm run dev
```

**Option B: Start with file-based storage only**
```bash
# Start backend (file storage)
cd server
npm start

# In another terminal, start frontend
cd client
npm start
```

### 3. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📁 Project Structure

```
geoJson/
├── client/                 # React frontend application
│   ├── src/               # Source code
│   ├── public/            # Static assets & sample data
│   ├── server.js          # Development server
│   └── package.json       # Client dependencies
├── server/                # Express backend API
│   ├── data/              # File-based storage
│   ├── models/            # MongoDB models (optional)
│   ├── routes/            # API route handlers
│   ├── server.js          # MongoDB-based server
│   ├── simple-server.js   # File-based server (default)
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
npm start            # Start file-based server
npm run dev          # Start file-based server with nodemon
npm run start:mongodb # Start MongoDB-based server
npm run dev:mongodb   # Start MongoDB server with nodemon
```

## 🌟 Key Features

### **GeoJSON Data Management**
- Drag & drop file upload with strict validation
- Accepts only .json and .geojson files (max 10MB)
- Comprehensive GeoJSON FeatureCollection validation
- Automatic geometry validation using Turf.js
- Coordinate range validation (longitude: -180 to 180, latitude: -90 to 90)
- Project-based grouping and filtering

### **Interactive Mapping**
- Leaflet-based interactive maps
- Color-coded polygons by project
- Clickable paddocks with detailed popups
- Project filtering and legend
- Automatic bounds fitting

### **Data Visualization**
- Multiple view modes (cards, lists, map)
- Dual area calculations (property vs. calculated)
- Project statistics and summaries
- Sample datasets for testing

### **API Endpoints**
- `GET /health` - Health check
- `GET /api/v1/paddocks` - List all paddocks
- `GET /api/v1/projects` - List all projects
- `POST /api/v1/upload/json` - Upload GeoJSON data

## 🔧 Configuration Options

### Storage Modes

**File-Based Storage (Default)**
- No database required
- Data stored in `server/data/` directory
- Perfect for development and small deployments
- Use: `npm start` or `npm run dev`

**MongoDB Storage (Optional)**
- Requires MongoDB installation
- Scalable for production use
- Geospatial indexing support
- Use: `npm run start:mongodb` or `npm run dev:mongodb`

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
The application includes 4 sample datasets:
- **Montana Paddocks**: Large agricultural paddocks
- **Farm Fields**: Midwest farm fields
- **Vineyard Blocks**: California vineyard blocks  
- **Urban Gardens**: Small urban plots

### Manual Testing
1. Start both client and server
2. Open http://localhost:5173
3. Use "Load Sample Data" dropdown or upload your own GeoJSON files
4. Test different view modes and map interactions

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
- Minimum Node.js v11+ required
- MongoDB features require Node.js v14+ for optimal performance

**Port Conflicts**
- Client default: 5173
- Server default: 3001
- Change ports in package.json scripts if needed

**CORS Issues**
- Ensure server CORS_ORIGIN matches client URL
- Default: http://localhost:5173

**MongoDB Connection**
- Only required for `npm run start:mongodb`
- File-based storage works without MongoDB

For more detailed information, see the individual README files in the `client/` and `server/` directories.
