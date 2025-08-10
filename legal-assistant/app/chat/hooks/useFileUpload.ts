import { useState } from "react";

interface UseFileUploadProps {
  onSuccess: (title: string, message: string) => void;
  onError: (title: string, message: string) => void;
}

export const useFileUpload = ({ onSuccess, onError }: UseFileUploadProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const acceptedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  const acceptedExtensions = ['.pdf', '.doc', '.docx', '.txt'];

  const validateFile = (file: File): boolean => {
    if (!acceptedTypes.includes(file.type) && !acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      onError('Unsupported File Type', `Please upload: ${acceptedExtensions.join(', ')}`);
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      onError('File Too Large', 'File size exceeds 10MB limit.');
      return false;
    }
    return true;
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    const validFiles: File[] = [];
    
    Array.from(files).forEach(file => {
      if (validateFile(file)) {
        const isDuplicate = uploadedFiles.some(existingFile => 
          existingFile.name === file.name && existingFile.size === file.size
        );
        if (!isDuplicate) validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      onSuccess('Files Uploaded', `Successfully uploaded ${validFiles.length} file(s).`);
    }
  };

  const removeFile = (index: number) => {
    const fileName = uploadedFiles[index].name;
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    onSuccess('File Removed', `"${fileName}" has been removed.`);
  };

  return {
    uploadedFiles,
    handleFileUpload,
    removeFile
  };
};