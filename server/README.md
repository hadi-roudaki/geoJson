# Loam Backend API

Express.js backend server for the Loam GeoJSON Paddock Management System with dual storage options.

## 🏗️ Architecture

The server provides two storage implementations:

### **File-Based Storage (Default)**
- **File**: `simple-server.js`
- **Storage**: JSON files in `data/` directory
- **Benefits**: No database required, easy setup, perfect for development
- **Use Case**: Development, small deployments, quick testing

### **MongoDB Storage (Production)**
- **File**: `server.js`
- **Storage**: MongoDB with Mongoose ODM
- **Benefits**: Scalable, geospatial indexing, production-ready
- **Use Case**: Production deployments, large datasets

## 🚀 Quick Start

### Prerequisites
- Node.js v11+ (v14+ recommended for MongoDB features)
- npm or yarn
- MongoDB (optional, only for MongoDB storage mode)

### Installation
```bash
cd server
npm install
```

### Running the Server

**File-Based Storage (Recommended for Development)**
```bash
npm start          # Production mode
npm run dev        # Development with nodemon
```

**MongoDB Storage (Production)**
```bash
npm run start:mongodb    # Production mode
npm run dev:mongodb      # Development with nodemon
```

## 📡 API Endpoints

### Health & Info
- `GET /` - API information and available endpoints
- `GET /health` - Health check with uptime and status

### Paddocks
- `GET /api/v1/paddocks` - List all paddocks
- `GET /api/v1/paddocks/:id` - Get specific paddock
- `PUT /api/v1/paddocks/:id` - Update paddock
- `DELETE /api/v1/paddocks/:id` - Delete paddock

### Projects
- `GET /api/v1/projects` - List all projects with statistics
- `GET /api/v1/projects/:name` - Get specific project
- `DELETE /api/v1/projects/:name` - Delete project and all paddocks

### Upload
- `POST /api/v1/upload/json` - Upload GeoJSON FeatureCollection

## 📋 API Documentation

### Upload GeoJSON Data

**Endpoint**: `POST /api/v1/upload/json`

**Request Body**:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": 1,
        "name": "Paddock Name",
        "owner": "Owner Name",
        "Project__Name": "Project Name",
        "area_acres": 100.5
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lng, lat], [lng, lat], ...]]
      }
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "uploadBatch": "uuid-string",
    "results": {
      "total": 10,
      "successful": 9,
      "failed": 1,
      "errors": [...]
    }
  },
  "message": "Successfully processed 9 of 10 features"
}
```

### Get Projects

**Endpoint**: `GET /api/v1/projects`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "name": "Project Name",
      "paddockCount": 5,
      "totalAreaHectares": 250.5,
      "owners": ["Owner 1", "Owner 2"],
      "lastUpdated": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the server directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# API Configuration
API_BASE_URL=/api/v1

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# MongoDB Configuration (only for MongoDB mode)
MONGODB_URI=mongodb://localhost:27017/loam-paddocks
```

### File Storage Configuration

**Data Directory**: `./data/`
- `paddocks.json` - All paddock data
- `projects.json` - Project statistics

The server automatically creates these files if they don't exist.

### MongoDB Configuration

**Database**: `loam-paddocks`
**Collections**:
- `paddocks` - Paddock documents with geospatial indexing
- `projects` - Project metadata and statistics

## 🔒 Security Features

### Middleware Stack
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Compression**: Response compression
- **Morgan**: Request logging

### Input Validation
- Strict file type validation (.json and .geojson only)
- Comprehensive GeoJSON schema validation
- Geometry validation using Turf.js with coordinate range checks
- Required field validation with non-empty string checks
- File size limits (10MB)
- Feature count limits (max 10,000 features)
- Coordinate validation (longitude: -180 to 180, latitude: -90 to 90)

### Error Handling
- Graceful error responses
- Detailed validation errors
- Development vs production error messages
- Automatic error logging

## 📊 Data Processing

### GeoJSON Validation
1. **Structure Validation**: Ensures valid FeatureCollection format
2. **Geometry Validation**: Uses Turf.js to validate polygon geometry
3. **Property Validation**: Checks required fields and data types
4. **Project Filtering**: Excludes features without valid project names

### Area Calculations
- **Property Area**: Converts acres to hectares (1 acre = 0.404686 hectares)
- **Calculated Area**: Uses Turf.js for precise geometric calculation
- **Dual Display**: Shows both property-based and calculated areas

### Project Statistics
- Automatic calculation of project totals
- Owner aggregation
- Valid vs invalid feature counts
- Last updated timestamps

## 🚀 Deployment

### Production Checklist
1. Set `NODE_ENV=production`
2. Configure proper CORS origins
3. Set up MongoDB (if using MongoDB mode)
4. Configure rate limiting
5. Set up process manager (PM2, systemd)
6. Configure reverse proxy (nginx)
7. Set up SSL/TLS certificates

### Docker Deployment (Future)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Process Management
```bash
# Using PM2
npm install -g pm2
pm2 start simple-server.js --name loam-api
pm2 startup
pm2 save
```

## 🧪 Testing

### Manual API Testing
```bash
# Health check
curl http://localhost:3001/health

# Get projects
curl http://localhost:3001/api/v1/projects

# Upload sample data
curl -X POST http://localhost:3001/api/v1/upload/json \
  -H "Content-Type: application/json" \
  -d @sample-data.geojson
```

### Load Testing
Consider using tools like:
- Apache Bench (ab)
- Artillery
- k6

## 🔧 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Find process using port 3001
lsof -i :3001
# Kill process
kill -9 <PID>
```

**MongoDB Connection Issues**
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`
- Verify network connectivity

**CORS Errors**
- Check `CORS_ORIGIN` environment variable
- Ensure client URL matches exactly
- Include protocol (http/https)

**File Permission Issues**
- Ensure write permissions for `data/` directory
- Check file ownership and permissions

### Logs and Debugging
- Server logs include request details via Morgan
- Error logs show stack traces in development
- Health endpoint provides uptime and status

## 📈 Performance Considerations

### File-Based Storage
- **Pros**: Simple, no database overhead, fast for small datasets
- **Cons**: Not suitable for concurrent writes, limited scalability
- **Recommendation**: Use for development and small deployments

### MongoDB Storage
- **Pros**: Scalable, concurrent access, geospatial indexing
- **Cons**: Additional infrastructure, more complex setup
- **Recommendation**: Use for production and large datasets

### Optimization Tips
- Enable compression middleware
- Use appropriate rate limiting
- Implement caching for frequently accessed data
- Consider pagination for large datasets

## 🤝 Contributing

1. Follow existing code style
2. Add tests for new features
3. Update API documentation
4. Test both storage modes
5. Submit pull request with clear description

## 📄 License

MIT License - see LICENSE file for details
