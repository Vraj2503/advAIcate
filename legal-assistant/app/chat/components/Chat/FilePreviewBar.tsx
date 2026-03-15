import { FileText, X } from "lucide-react";
import { useTheme } from "../../../contexts/ThemeContext";

interface FilePreviewBarProps {
  uploadedFiles: File[];
  onRemoveFile: (index: number) => void;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const extColor: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  pdf:  { bg: "bg-red-50",    text: "text-red-600",    darkBg: "bg-red-900/30",    darkText: "text-red-400" },
  doc:  { bg: "bg-blue-50",   text: "text-blue-600",   darkBg: "bg-blue-900/30",   darkText: "text-blue-400" },
  docx: { bg: "bg-blue-50",   text: "text-blue-600",   darkBg: "bg-blue-900/30",   darkText: "text-blue-400" },
  txt:  { bg: "bg-slate-50",  text: "text-slate-600",  darkBg: "bg-slate-700/40",  darkText: "text-slate-400" },
};

export const FilePreviewBar = ({ uploadedFiles, onRemoveFile }: FilePreviewBarProps) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  if (uploadedFiles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {uploadedFiles.map((file, index) => {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const colors = extColor[ext] || extColor.txt;

        return (
          <div
            key={`${file.name}-${index}`}
            className={`
              group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 pr-9
              transition-colors duration-150
              ${isLight
                ? "bg-white border border-slate-200 shadow-sm hover:border-slate-300"
                : "bg-slate-800/80 border border-slate-700 hover:border-slate-600"
              }
            `}
          >
            {/* File type icon */}
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
              ${isLight ? colors.bg : colors.darkBg}
            `}>
              <FileText className={`w-5 h-5 ${isLight ? colors.text : colors.darkText}`} />
            </div>

            {/* Name + size */}
            <div className="min-w-0">
              <p className={`text-sm font-medium truncate max-w-[160px] ${
                isLight ? "text-slate-800" : "text-slate-200"
              }`}>
                {file.name}
              </p>
              <p className={`text-xs ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                {formatSize(file.size)} &middot; {ext.toUpperCase()}
              </p>
            </div>

            {/* Remove button */}
            <button
              onClick={() => onRemoveFile(index)}
              className={`
                absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center
                opacity-0 group-hover:opacity-100 transition-opacity duration-150
                ${isLight
                  ? "bg-slate-200 hover:bg-red-100 text-slate-500 hover:text-red-600"
                  : "bg-slate-700 hover:bg-red-900/40 text-slate-400 hover:text-red-400"
                }
              `}
              title="Remove file"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
