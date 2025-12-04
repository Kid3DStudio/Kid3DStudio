import React, { useEffect, useState } from 'react';
import { Trash2, Copy, ScanEye, Group, Ungroup, Settings2, Combine, Calculator, Minus, Move3d, RotateCcw } from 'lucide-react';
import { SceneObject, SnapSettings } from '../types';

interface PropertiesPanelProps {
  selectedObject: SceneObject | undefined;
  selectionCount: number;
  onUpdate: (id: string, updates: Partial<SceneObject>) => void;
  onDelete: (id: string) => void;
  onDeleteSelected: () => void;
  onDuplicate: (id: string) => void;
  onFocus: (id: string) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onBooleanOperation: (op: 'union' | 'intersect' | 'subtract') => void;
  snapSettings: SnapSettings;
  onUpdateSnapSettings: (settings: SnapSettings) => void;
  className?: string;
  canBoolean: boolean;
}

// Helper component for robust numeric input (Integer Only)
const PropertyInput: React.FC<{
  value: number;
  onChange: (val: number) => void;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  title?: string;
}> = ({ value, onChange, className, onFocus, onBlur, title }) => {
  // Format to integer
  const formatValue = (v: number) => Math.round(v);

  const [localVal, setLocalVal] = useState<string>(formatValue(value).toString());

  // Sync with external updates (e.g. dragging in scene)
  useEffect(() => {
    setLocalVal(formatValue(value).toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalVal(newVal);

    // Allow "-" or empty string temporarily without triggering update
    if (newVal === '-' || newVal === '') return;

    // Parse as integer
    const parsed = parseInt(newVal, 10);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(localVal, 10);
    if (isNaN(parsed)) {
      setLocalVal(formatValue(value).toString());
    } else {
      const formatted = formatValue(parsed);
      setLocalVal(formatted.toString()); 
      if (parsed !== value) onChange(parsed);
    }
    if (onBlur) onBlur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="number"
      step="1"
      value={localVal}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={(e) => {
        e.target.select();
        if (onFocus) onFocus();
      }}
      onBlur={handleBlur}
      className={className}
      title={title}
    />
  );
};

// Helper for Axis-Labeled Inputs (X, Y, Z)
const LabeledInput: React.FC<{
    label: string;
    description: string;
    value: number;
    onChange: (val: number) => void;
    colorClass: string;
    borderColorClass: string;
}> = ({ label, description, value, onChange, colorClass, borderColorClass }) => (
    <div className="relative flex-1 min-w-[60px] group" title={description}>
        <div className={`absolute top-px bottom-px left-px w-5 flex items-center justify-center rounded-l ${colorClass} ${borderColorClass} border-r text-[10px] font-bold select-none cursor-help`}>
            {label}
        </div>
        <PropertyInput
            value={value}
            onChange={onChange}
            className={`w-full pl-7 pr-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700`}
            title={description}
        />
    </div>
);

const AXIS_CONFIG = [
    { label: 'X', description: 'Length (X-Axis)', color: 'text-red-700 bg-red-100', border: 'border-red-200' },
    { label: 'Y', description: 'Width (Y-Axis)', color: 'text-green-700 bg-green-100', border: 'border-green-200' },
    { label: 'Z', description: 'Height (Z-Axis)', color: 'text-blue-700 bg-blue-100', border: 'border-blue-200' }
];

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedObject,
  selectionCount,
  onUpdate,
  onDelete,
  onDeleteSelected,
  onDuplicate,
  onFocus,
  onGroup,
  onUngroup,
  onBooleanOperation,
  snapSettings,
  onUpdateSnapSettings,
  className = "",
  canBoolean
}) => {
  const SnapSection = () => (
      <div className="pt-4 border-t border-slate-100 mt-2">
          <div className="flex items-center gap-2 mb-2">
              <Settings2 size={16} className="text-slate-400" />
              <label className="text-xs font-bold text-slate-500 uppercase">Snapping</label>
          </div>
          <div className="grid grid-cols-3 gap-2">
              <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Move (mm)</label>
                  <PropertyInput 
                      value={snapSettings.translation}
                      onChange={(val) => onUpdateSnapSettings({ ...snapSettings, translation: val })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
                  />
              </div>
              <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Rotate (°)</label>
                  <PropertyInput 
                      value={snapSettings.rotation}
                      onChange={(val) => onUpdateSnapSettings({ ...snapSettings, rotation: val })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
                  />
              </div>
               <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Scale (mm)</label>
                  <PropertyInput 
                      value={snapSettings.scale}
                      onChange={(val) => onUpdateSnapSettings({ ...snapSettings, scale: val })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
                  />
              </div>
          </div>
      </div>
  );

  // No Selection View - Show Global Settings
  if (selectionCount === 0) {
    return (
        <div className={`bg-white/90 backdrop-blur shadow-xl rounded-2xl p-4 border border-slate-200 flex flex-col gap-4 w-full ${className}`}>
             <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h2 className="font-bold text-slate-700">Scene Settings</h2>
             </div>
             <div className="text-sm text-slate-500 italic mb-2">
                 Select an object to edit its properties.
             </div>
             <SnapSection />
        </div>
    );
  }

  // Multi-selection View
  if (selectionCount > 1) {
      return (
        <div className={`bg-white/90 backdrop-blur shadow-xl rounded-2xl p-4 border border-slate-200 flex flex-col gap-4 w-full ${className}`}>
             <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h2 className="font-bold text-slate-700">Selection</h2>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">{selectionCount} Objects</span>
             </div>
             
             <div className="flex flex-col gap-2">
                <button
                    onClick={onGroup}
                    className="flex items-center justify-center gap-2 bg-purple-50 text-purple-600 py-3 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium border border-purple-200"
                >
                    <Group size={18} /> Group Objects
                </button>
                 <button
                    onClick={onDeleteSelected}
                    className="flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                >
                    <Trash2 size={16} /> Delete Selected
                </button>
             </div>

             {canBoolean && (
                <div className="pt-4 border-t border-slate-100">
                    <label className="text-xs font-semibold text-slate-500 mb-2 block uppercase">Boolean Operations</label>
                    <div className="grid grid-cols-3 gap-2">
                         <button onClick={() => onBooleanOperation('union')} className="flex flex-col items-center gap-1 p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Union">
                            <Combine size={18} />
                            <span className="text-[10px]">Union</span>
                         </button>
                         <button onClick={() => onBooleanOperation('subtract')} className="flex flex-col items-center gap-1 p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Subtract (First - Second)">
                            <Minus size={18} />
                            <span className="text-[10px]">Subtract</span>
                         </button>
                         <button onClick={() => onBooleanOperation('intersect')} className="flex flex-col items-center gap-1 p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Intersection">
                            <Calculator size={18} />
                            <span className="text-[10px]">Intersect</span>
                         </button>
                    </div>
                </div>
             )}

             <SnapSection />
        </div>
      );
  }

  if (!selectedObject) return null;

  const handleChange = (key: keyof SceneObject, value: any) => {
    onUpdate(selectedObject.id, { [key]: value });
  };

  const handleVectorChange = (
    vectorKey: 'position' | 'rotation' | 'scale' | 'pivot',
    axisIndex: number,
    value: number
  ) => {
    const newVector = [...(selectedObject[vectorKey] || [0,0,0])];
    if (vectorKey === 'rotation') {
      // Convert degrees to radians for storage
      newVector[axisIndex] = (value * Math.PI) / 180;
    } else {
      newVector[axisIndex] = value;
    }
    onUpdate(selectedObject.id, { [vectorKey]: newVector });
  };

  // Helper to convert radians to degrees (0-360) for display
  const toDegrees = (rad: number) => {
    let deg = (rad * 180) / Math.PI;
    deg = Math.round(deg * 100) / 100; // Keep decimals for rotation logic
    deg = deg % 360;
    if (deg < 0) deg += 360;
    return deg;
  };

  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981', 
    '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', 
    '#64748B', '#FFFFFF'
  ];

  return (
    <div className={`bg-white/90 backdrop-blur shadow-xl rounded-2xl p-4 border border-slate-200 flex flex-col gap-4 overflow-y-auto w-full ${className}`}>
      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
        <h2 className="font-bold text-slate-700">Properties</h2>
        <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase">{selectedObject.type}</span>
      </div>

      {/* Name and Focus */}
      <div>
        <label className="text-xs font-semibold text-slate-500 mb-1 block">Name</label>
        <div className="flex gap-2">
            <input 
                type="text"
                value={selectedObject.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm text-slate-700"
                onFocus={(e) => e.target.select()}
            />
            <button 
                onClick={() => onFocus(selectedObject.id)}
                className="bg-blue-100 text-blue-600 p-1.5 rounded hover:bg-blue-200 transition-colors"
                title="Focus Camera on Object"
            >
                <ScanEye size={18} />
            </button>
        </div>
      </div>

      {/* Group / Ungroup Action */}
      {selectedObject.type === 'group' && (
          <button
            onClick={onUngroup}
            className="flex items-center justify-center gap-2 bg-orange-50 text-orange-600 py-2 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium border border-orange-200"
          >
            <Ungroup size={16} /> Ungroup
          </button>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onDuplicate(selectedObject.id)}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
        >
          <Copy size={16} /> Duplicate
        </button>
        <button
          onClick={() => onDelete(selectedObject.id)}
          className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>

      {/* Color Picker (Only for shapes, not groups typically) */}
      {selectedObject.type !== 'group' && (
      <div>
        <label className="text-xs font-semibold text-slate-500 mb-2 block">Color</label>
        <div className="grid grid-cols-6 gap-2">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => handleChange('color', c)}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                selectedObject.color === c ? 'border-slate-600 shadow-md scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input 
            type="color" 
            value={selectedObject.color} 
            onChange={(e) => handleChange('color', e.target.value)}
            className="w-8 h-8 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
          />
        </div>
      </div>
      )}

      {/* Dimensions / Transform */}
      <div className="space-y-4">
        {/* Position */}
        <div>
          <div className="flex justify-between items-center mb-1">
             <label className="text-xs font-semibold text-slate-500 block">Position (mm)</label>
             <button 
                onClick={() => handleChange('position', [0, 0, 0])}
                className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded"
                title="Reset Position to Origin"
             >
                <Move3d size={10} /> Reset
             </button>
          </div>
          <div className="flex gap-2">
            {AXIS_CONFIG.map((axis, i) => (
              <LabeledInput
                key={`pos-${i}`}
                label={axis.label}
                description={axis.description}
                value={selectedObject.position[i]}
                onChange={(val) => handleVectorChange('position', i, val)}
                colorClass={axis.color}
                borderColorClass={axis.border}
              />
            ))}
          </div>
        </div>
        
        {/* Rotation */}
        <div>
          <div className="flex justify-between items-center mb-1">
             <label className="text-xs font-semibold text-slate-500 block">Rotation (°)</label>
             <button 
                onClick={() => handleChange('rotation', [0, 0, 0])}
                className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded"
                title="Reset Rotation to 0"
             >
                <RotateCcw size={10} /> Reset
             </button>
          </div>
          <div className="flex gap-2">
            {AXIS_CONFIG.map((axis, i) => (
              <LabeledInput
                key={`rot-${i}`}
                label={axis.label}
                description={axis.description}
                value={toDegrees(selectedObject.rotation[i])}
                onChange={(val) => handleVectorChange('rotation', i, val)}
                colorClass={axis.color}
                borderColorClass={axis.border}
              />
            ))}
          </div>
        </div>

        {/* Size / Scale */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Size (mm)</label>
          <div className="flex gap-2">
            {AXIS_CONFIG.map((axis, i) => {
              // Calculate actual size based on scale * baseDimension
              const base = selectedObject.baseDimensions?.[i] ?? 1;
              const displayValue = selectedObject.scale[i] * base;

              return (
                <LabeledInput
                  key={`scl-${i}`}
                  label={axis.label}
                  description={axis.description}
                  value={displayValue}
                  onChange={(val) => {
                      // Update scale based on new dimension input
                      const safeBase = base === 0 ? 1 : base;
                      handleVectorChange('scale', i, val / safeBase);
                  }}
                  colorClass={axis.color}
                  borderColorClass={axis.border}
                />
              );
            })}
          </div>
        </div>

        {/* Pivot / Origin Control */}
        {selectedObject.type !== 'group' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                 <label className="text-xs font-semibold text-slate-500 block">Pivot Offset (mm)</label>
                 <button 
                    onClick={() => handleChange('pivot', [0, 0, 0])}
                    className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded"
                    title="Reset Pivot to Geometric Center"
                 >
                    <Move3d size={10} /> Center
                 </button>
              </div>
              <div className="flex gap-2">
                {AXIS_CONFIG.map((axis, i) => (
                  <LabeledInput
                    key={`piv-${i}`}
                    label={axis.label}
                    description={axis.description}
                    value={selectedObject.pivot ? selectedObject.pivot[i] : 0}
                    onChange={(val) => handleVectorChange('pivot', i, val)}
                    colorClass={axis.color}
                    borderColorClass={axis.border}
                  />
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 italic">
                 Offsets the geometry from the object's origin point.
              </p>
            </div>
        )}
      </div>
      
      <SnapSection />
    </div>
  );
};

export default PropertiesPanel;