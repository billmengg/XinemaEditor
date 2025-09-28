import React, { useState } from 'react';
import ClipList from './components/ClipList';

function App() {
  const [activeTab, setActiveTab] = useState('file-nav');

  const tabs = [
    { id: 'file-nav', label: 'File Navigator', component: ClipList },
    { id: 'timeline', label: 'Timeline', component: () => <div>Timeline - Coming Soon</div> },
    { id: 'script', label: 'Script Input', component: () => <div>Script Input - Coming Soon</div> },
    { id: 'export', label: 'Export', component: () => <div>Export - Coming Soon</div> }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ClipList;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #ddd', 
        background: '#f8f9fa',
        padding: '0 16px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === tab.id ? 'white' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? '600' : '400',
              color: activeTab === tab.id ? '#007bff' : '#666',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ActiveComponent />
      </div>
    </div>
  );
}

export default App;