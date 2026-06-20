import { FileText, X } from "lucide-react";

interface FilePreviewBarProps {
  uploadedFiles: File[];
  onRemoveFile: (index: number) => void;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FilePreviewBar = ({ uploadedFiles, onRemoveFile }: FilePreviewBarProps) => {
  if (uploadedFiles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {uploadedFiles.map((file, index) => {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";

        return (
          <div
            key={`${file.name}-${index}`}
            className="group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 pr-9 transition-colors duration-150"
            style={{
              background: "var(--onyx-soft)",
              border: "1px solid var(--onyx-muted)",
            }}
          >
            {/* File type icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--onyx-muted)" }}
            >
              <FileText className="w-5 h-5" style={{ color: "var(--sealing-wax)" }} />
            </div>

            {/* Name + size */}
            <div className="min-w-0">
              <p
                className="text-sm font-medium truncate max-w-[160px]"
                style={{ color: "var(--foreground)" }}
              >
                {file.name}
              </p>
              <p className="text-xs" style={{ color: "var(--parchment-muted)" }}>
                {formatSize(file.size)} &middot; {ext.toUpperCase()}
              </p>
            </div>

            {/* Remove button */}
            <button
              onClick={() => onRemoveFile(index)}
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center
                opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{
                background: "var(--onyx-muted)",
                color: "var(--parchment-muted)",
              }}
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
