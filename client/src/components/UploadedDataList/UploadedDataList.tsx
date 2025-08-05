import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, User, Layers, ChevronDown, ChevronUp, Trash2, Eye } from 'lucide-react';

interface UploadedItem {
  type: 'Feature';
  properties: {
    id: string;
    name: string;
    owner: string;
    Project__Name: string;
    area_acres: number;
    area_hectares: number;
    calculated_area_hectares: number;
    uploaded_at: string;
    is_valid: boolean;
  };
  geometry: {
    type: string;
    coordinates: any;
  };
}

interface UploadBatch {
  batchId: string;
  uploadedAt: string;
  itemCount: number;
  items: UploadedItem[];
  totalArea: number;
  projects: string[];
  owners: string[];
}

const UploadedDataList: React.FC = () => {
  const [uploadBatches, setUploadBatches] = useState<UploadBatch[]>([]);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUploadedData();
  }, []);

  const fetchUploadedData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/v1/paddocks');
      
      if (!response.ok) {
        throw new Error('Failed to fetch uploaded data');
      }

      const data = await response.json();

      if (data.success && data.data && data.data.features) {
        // Group features by upload batch (we'll use uploaded_at as a proxy for batches)
        const batchMap = new Map<string, UploadedItem[]>();

        data.data.features.forEach((feature: UploadedItem) => {
          const uploadDate = feature.properties.uploaded_at;
          const batchKey = uploadDate; // Use upload date as batch identifier

          if (!batchMap.has(batchKey)) {
            batchMap.set(batchKey, []);
          }
          batchMap.get(batchKey)!.push(feature);
        });

        // Convert to batch objects
        const batches: UploadBatch[] = Array.from(batchMap.entries()).map(([batchId, items]) => {
          const totalArea = items.reduce((sum, item) => sum + item.properties.area_hectares, 0);
          const projects = [...new Set(items.map(item => item.properties.Project__Name).filter(Boolean))];
          const owners = [...new Set(items.map(item => item.properties.owner))];

          return {
            batchId,
            uploadedAt: items[0].properties.uploaded_at,
            itemCount: items.length,
            items: items.sort((a, b) => a.properties.name.localeCompare(b.properties.name)),
            totalArea,
            projects,
            owners
          };
        });

        // Sort batches by upload date (newest first)
        batches.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        
        setUploadBatches(batches);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleBatchExpansion = (batchId: string) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(batchId)) {
      newExpanded.delete(batchId);
    } else {
      newExpanded.add(batchId);
    }
    setExpandedBatches(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatArea = (hectares: number) => {
    return `${hectares.toFixed(2)} ha`;
  };

  const getGeometryIcon = (geometryType: string) => {
    switch (geometryType) {
      case 'Point':
        return <MapPin className="w-4 h-4" />;
      case 'Polygon':
        return <Layers className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading uploaded data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button 
          onClick={fetchUploadedData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (uploadBatches.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No uploaded data</h3>
        <p className="text-gray-600">Upload some GeoJSON files to see them listed here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Uploaded Data</h2>
        <span className="text-sm text-gray-500">
          {uploadBatches.length} upload batch{uploadBatches.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {uploadBatches.map((batch) => (
        <div key={batch.batchId} className="bg-white border border-gray-200 rounded-lg shadow-sm">
          {/* Batch Header */}
          <div 
            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleBatchExpansion(batch.batchId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {expandedBatches.has(batch.batchId) ? 
                  <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                }
                <div>
                  <h3 className="font-medium text-gray-900">
                    Upload Batch ({batch.itemCount} item{batch.itemCount !== 1 ? 's' : ''})
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(batch.uploadedAt)}
                    </span>
                    <span className="flex items-center">
                      <Layers className="w-4 h-4 mr-1" />
                      {formatArea(batch.totalArea)}
                    </span>
                    <span className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {batch.owners.length} owner{batch.owners.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">
                  {batch.projects.length} project{batch.projects.length !== 1 ? 's' : ''}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  ID: {batch.batchId.substring(0, 8)}...
                </div>
              </div>
            </div>
          </div>

          {/* Batch Items */}
          {expandedBatches.has(batch.batchId) && (
            <div className="border-t border-gray-200">
              {batch.items.map((item, index) => (
                <div key={`${item.properties.id}-${index}`} className="p-4 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getGeometryIcon(item.geometry.type)}
                      <div>
                        <h4 className="font-medium text-gray-900">{item.properties.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Owner: {item.properties.owner}</span>
                          <span>Project: {item.properties.Project__Name || 'No Project'}</span>
                          <span>Type: {item.geometry.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatArea(item.properties.area_hectares)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.properties.area_acres.toFixed(2)} acres
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default UploadedDataList;
