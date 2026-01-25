import React, { useState } from 'react';
import './App.css';
import XmlUploadForm from './components/XmlUploadForm';

function App() {
  const [dataImported, setDataImported] = useState(false);

  const handleUploadSuccess = () => {
    setDataImported(true);
    // Optionally, navigate to a dashboard view or show a success message
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>WordPress Export Analyzer</h1>
      </header>
      <main>
        {!dataImported ? (
          <XmlUploadForm onUploadSuccess={handleUploadSuccess} />
        ) : (
          <div>
            <h2>Data Imported Successfully!</h2>
            <p>You can now navigate to different sections to view your data.</p>
            {/* Future navigation to data views */}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
