import React, { useState } from 'react';
import { Layout, Header, Button, FileUpload, GeoJSONViewer, UploadedDataList } from './components';
import { useCounter, useLocalStorage } from './hooks';
import { formatDate } from './utils';
import { GeoJSONFeatureCollection } from './types';
import { Upload, List, BarChart3 } from 'lucide-react';

type TabType = 'upload' | 'list' | 'demo';

function App() {
  const { count, increment, decrement, reset } = useCounter(0);
  const [name, setName] = useLocalStorage<string>('userName', '');
  const [geoJsonData, setGeoJsonData] = useState<GeoJSONFeatureCollection | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('upload');

  const handleFileUpload = (data: GeoJSONFeatureCollection) => {
    setGeoJsonData(data);
    setUploadError(null);
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
    setGeoJsonData(null);
  };

  const clearGeoJsonData = () => {
    setGeoJsonData(null);
    setUploadError(null);
  };

  const loadSampleData = async () => {
    try {
      const response = await fetch('/sample_paddocks.geojson');
      if (!response.ok) {
        throw new Error('Failed to load sample data');
      }
      const text = await response.text();
      const data = JSON.parse(text);

      // Validate the sample data
      const { validateGeoJSONFeatureCollection } = await import('./utils');
      validateGeoJSONFeatureCollection(data);

      setGeoJsonData(data);
      setUploadError(null);
    } catch (error) {
      setUploadError(`Failed to load sample data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const tabs = [
    { id: 'upload' as TabType, name: 'Upload & View', icon: Upload },
    { id: 'list' as TabType, name: 'Uploaded Data', icon: List },
    { id: 'demo' as TabType, name: 'Demo Features', icon: BarChart3 },
  ];

  return (
    <Layout>
      <Header
        title="Loam - GeoJSON Paddock Management"
        subtitle="Upload, validate, and visualize GeoJSON paddock data"
      />

      <div className="mt-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'upload' && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">GeoJSON File Upload</h2>
                <div className="flex space-x-2">
                  {!geoJsonData && (
                    <Button onClick={loadSampleData} variant="secondary" className="text-sm">
                      Load Sample Data
                    </Button>
                  )}
                  {geoJsonData && (
                    <Button onClick={clearGeoJsonData} variant="secondary" className="text-sm">
                      Clear Data
                    </Button>
                  )}
                </div>
              </div>

              {!geoJsonData ? (
                <div>
                  <FileUpload onFileUpload={handleFileUpload} onError={handleUploadError} />
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start">
                      <div className="w-5 h-5 text-blue-500 mt-0.5 mr-3">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-blue-800">Try the Sample Data</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          Click "Load Sample Data" to explore the app with sample paddock data from Montana,
                          including multiple projects like Soybean2024, Corn2024, and more.
                        </p>
                      </div>
                    </div>
                  </div>
                  {uploadError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-5 h-5 text-red-500 mr-2">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
                          <p className="text-sm text-red-700 mt-1">{uploadError}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <GeoJSONViewer data={geoJsonData} />
              )}
            </div>
          )}

          {activeTab === 'list' && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <UploadedDataList />
            </div>
          )}

          {activeTab === 'demo' && (
            <div className="space-y-8">
              {/* Counter Demo */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Counter Hook Demo</h2>
                <div className="flex items-center space-x-4">
                  <span className="text-2xl font-bold text-blue-600">{count}</span>
                  <div className="space-x-2">
                    <Button onClick={increment} variant="primary">
                      Increment
                    </Button>
                    <Button onClick={decrement} variant="secondary">
                      Decrement
                    </Button>
                    <Button onClick={reset} variant="danger">
                      Reset
                    </Button>
                  </div>
                </div>
              </div>

              {/* Local Storage Demo */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Local Storage Hook Demo</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name (saved to localStorage):
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {name && (
                    <p className="text-green-600">
                      Hello, {name}! Your name is saved in localStorage.
                    </p>
                  )}
                </div>
              </div>

              {/* Utility Demo */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Utility Functions Demo</h2>
                <p className="text-gray-600">
                  Today's date: <span className="font-medium">{formatDate(new Date())}</span>
                </p>
              </div>

              {/* Project Structure Info */}
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h2 className="text-xl font-semibold text-blue-900 mb-4">Project Structure</h2>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>📁 <strong>src/components/</strong> - Reusable UI components</p>
                  <p>📁 <strong>src/hooks/</strong> - Custom React hooks</p>
                  <p>📁 <strong>src/types/</strong> - TypeScript type definitions</p>
                  <p>📁 <strong>src/utils/</strong> - Utility functions</p>
                  <p>🎨 <strong>Tailwind CSS</strong> - For styling</p>
                  <p>⚡ <strong>Vite</strong> - For fast development and building</p>
                  <p>📘 <strong>TypeScript</strong> - For type safety</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default App;
