import React from 'react';
import { Box, Circle, Cylinder, Triangle, Move, Rotate3D, Scaling, Frame } from 'lucide-react';
import { ShapeType, TransformMode } from '../types';

interface ToolbarProps {
  onAddShape: (type: ShapeType) => void;
  currentMode: TransformMode;
  onSetMode: (mode: TransformMode) => void;
  isWireframe: boolean;
  onToggleWireframe: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onAddShape, 
  currentMode, 
  onSetMode,
  isWireframe,
  onToggleWireframe 
}) => {
  const shapes: { type: ShapeType; icon: React.ReactNode; label: string }[] = [
    { type: 'box', icon: <Box size={24} />, label: 'Box' },
    { type: 'sphere', icon: <Circle size={24} />, label: 'Sphere' },
    { type: 'cylinder', icon: <Cylinder size={24} />, label: 'Cylinder' },
    { type: 'cone', icon: <Triangle size={24} />, label: 'Cone' },
    { type: 'torus', icon: <Circle size={24} className="border-2 rounded-full border-current" />, label: 'Ring' },
  ];

  const modes: { mode: TransformMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'translate', icon: <Move size={20} />, label: 'Move' },
    { mode: 'rotate', icon: <Rotate3D size={20} />, label: 'Rotate' },
    { mode: 'scale', icon: <Scaling size={20} />, label: 'Scale' },
  ];

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-6">
      <div className="bg-white/90 backdrop-blur shadow-xl rounded-2xl p-3 flex flex-col gap-3 border border-slate-200">
        <h3 className="text-xs font-bold text-slate-400 uppercase text-center mb-1">Add</h3>
        {shapes.map((shape) => (
          <button
            key={shape.type}
            onClick={() => onAddShape(shape.type)}
            className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-500 hover:text-white transition-all transform hover:scale-105 group relative flex justify-center"
            title={shape.label}
          >
            {shape.icon}
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {shape.label}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white/90 backdrop-blur shadow-xl rounded-2xl p-3 flex flex-col gap-3 border border-slate-200">
        <h3 className="text-xs font-bold text-slate-400 uppercase text-center mb-1">Tools</h3>
        {modes.map((m) => (
          <button
            key={m.mode}
            onClick={() => onSetMode(m.mode)}
            className={`p-3 rounded-xl transition-all flex justify-center relative group ${
              currentMode === m.mode
                ? 'bg-purple-500 text-white shadow-lg'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {m.icon}
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {m.label}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white/90 backdrop-blur shadow-xl rounded-2xl p-3 flex flex-col gap-3 border border-slate-200">
        <h3 className="text-xs font-bold text-slate-400 uppercase text-center mb-1">View</h3>
        <button
          onClick={onToggleWireframe}
          className={`p-3 rounded-xl transition-all flex justify-center relative group ${
            isWireframe
              ? 'bg-purple-500 text-white shadow-lg'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Frame size={20} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Wireframe
          </span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;