import { File, X } from "lucide-react";

interface FileUploadAreaProps {
  uploadedFiles: File[];
  onRemoveFile: (index: number) => void;
}

export const FileUploadArea = ({ uploadedFiles, onRemoveFile }: FileUploadAreaProps) => {
  if (uploadedFiles.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {uploadedFiles.map((file, index) => (
        <div key={index} className="flex items-center space-x-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-1 text-xs">
          <File className="w-3 h-3 text-orange-500" />
          <span className="text-slate-700 max-w-24 truncate">{file.name}</span>
          <button
            onClick={() => onRemoveFile(index)}
            className="text-slate-500 hover:text-red-500 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};