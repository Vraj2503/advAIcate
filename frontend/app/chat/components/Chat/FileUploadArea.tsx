import { File, X } from "lucide-react";
import { useTheme } from "../../../contexts/ThemeContext";

interface FileUploadAreaProps {
  uploadedFiles: File[];
  onRemoveFile: (index: number) => void;
}

export const FileUploadArea = ({ uploadedFiles, onRemoveFile }: FileUploadAreaProps) => {
  const { theme } = useTheme();
  if (uploadedFiles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {uploadedFiles.map((file, index) => (
        <div key={index} className={`flex items-center space-x-2 rounded-lg px-3 py-1.5 text-xs ${
          theme === 'light'
            ? "bg-orange-50 border border-orange-100 text-slate-700"
            : "bg-slate-700/60 border border-slate-600 text-slate-300"
        }`}>
          <File className={`w-3 h-3 ${theme === 'light' ? "text-orange-500" : "text-orange-400"}`} />
          <span className="max-w-24 truncate">{file.name}</span>
          <button
            onClick={() => onRemoveFile(index)}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};