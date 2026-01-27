import React from 'react';

interface XmlUploadFormProps {
  onFileUpload: (file: File) => void;
}

export const XmlUploadForm: React.FC<XmlUploadFormProps> = ({ onFileUpload }) => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };

  return (
    <div className="upload-form">
      <label className="file-input">
        <input type="file" accept=".xml" onChange={handleFileChange} />
        <span>{selectedFile ? selectedFile.name : 'Choose XML file'}</span>
      </label>
      <button className="btn-primary" onClick={handleUploadClick} disabled={!selectedFile}>
        Start import
      </button>
    </div>
  );
};
