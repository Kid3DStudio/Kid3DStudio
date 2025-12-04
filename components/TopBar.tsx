import React, { useRef } from 'react';
import { FolderOpen, Save, FilePlus, Download, Cuboid, Undo2, Redo2, Upload } from 'lucide-react';

interface TopBarProps {
  projectName: string;
  onRenameProject: (name: string) => void;
  onNewProject: () => void;
  onOpenProject: (file: File) => void;
  onImportModel: (file: File) => void;
  onSaveJSON: () => void;
  onExportSTL: () => void;
  onExport3MF: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const TopBar: React.FC<TopBarProps> = ({
  projectName,
  onRenameProject,
  onNewProject,
  onOpenProject,
  onImportModel,
  onSaveJSON,
  onExportSTL,
  onExport3MF,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onOpenProject(e.target.files[0]);
    }
    // Reset value so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportModel(e.target.files[0]);
    }
    // Reset value so same file can be selected again
    if (importInputRef.current) importInputRef.current.value = '';
  };

  return (
    <div className="absolute top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          <Cuboid size={24} />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          Kid3DStudio
        </h1>
        <div className="h-6 w-px bg-slate-300 mx-2"></div>
        <input 
          type="text" 
          value={projectName}
          onChange={(e) => onRenameProject(e.target.value)}
          className="bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded px-2 py-1 text-slate-700 font-medium w-48 transition-all outline-none placeholder:text-slate-400"
          placeholder="Project Name"
          title="Rename Project"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex gap-1 mr-2">
          <button 
            onClick={onUndo} 
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-colors ${canUndo ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={20} />
          </button>
          <button 
            onClick={onRedo} 
            disabled={!canRedo}
            className={`p-2 rounded-lg transition-colors ${canRedo ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={20} />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-300 mx-2"></div>

        <button onClick={onNewProject} className="btn-secondary" title="New Project">
          <FilePlus size={18} /> <span className="hidden sm:inline">New</span>
        </button>
        
        <div className="relative">
           <button onClick={() => fileInputRef.current?.click()} className="btn-secondary" title="Open Project">
            <FolderOpen size={18} /> <span className="hidden sm:inline">Open</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
        </div>

        <div className="relative">
           <button onClick={() => importInputRef.current?.click()} className="btn-secondary" title="Import 3D Model (STL/OBJ)">
            <Upload size={18} /> <span className="hidden sm:inline">Import</span>
          </button>
          <input 
            type="file" 
            ref={importInputRef} 
            onChange={handleImportChange} 
            accept=".stl,.obj" 
            className="hidden" 
          />
        </div>

        <button onClick={onSaveJSON} className="btn-secondary" title="Save Project">
          <Save size={18} /> <span className="hidden sm:inline">Save</span>
        </button>

        <div className="h-6 w-px bg-slate-300 mx-2"></div>

        <div className="flex gap-1">
             <button onClick={onExportSTL} className="btn-primary" title="Export to 3D Printer (STL)">
              <Download size={18} /> <span className="hidden sm:inline">STL</span>
            </button>
             <button onClick={onExport3MF} className="btn-primary bg-purple-600 hover:bg-purple-700" title="Export 3MF">
              <Download size={18} /> <span className="hidden sm:inline">3MF</span>
            </button>
        </div>
      </div>
      
      {/* Inline Styles for Tailwind components */}
      <style>{`
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: #2563eb;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-weight: 600;
          transition: background-color 0.2s;
        }
        .btn-primary:hover {
          background-color: #1d4ed8;
        }
        .btn-primary:disabled {
          background-color: #94a3b8;
          cursor: not-allowed;
        }
        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: white;
          color: #475569;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-weight: 500;
          border: 1px solid #cbd5e1;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background-color: #f1f5f9;
          color: #1e293b;
        }
      `}</style>
    </div>
  );
};

export default TopBar;
