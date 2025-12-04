import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Box, Circle, Cylinder, Triangle, Group, Layers } from 'lucide-react';
import { SceneObject, ShapeType } from '../types';

interface HierarchyPanelProps {
  objects: SceneObject[];
  selectedIds: string[];
  onSelect: (id: string, multi: boolean) => void;
  className?: string;
}

const getIconForType = (type: ShapeType) => {
  switch (type) {
    case 'box': return <Box size={14} />;
    case 'sphere': return <Circle size={14} />;
    case 'cylinder': return <Cylinder size={14} />;
    case 'cone': return <Triangle size={14} />;
    case 'torus': return <Circle size={14} className="border-2 rounded-full" />;
    case 'group': return <Group size={14} />;
    default: return <Box size={14} />;
  }
};

const HierarchyItem: React.FC<{
  obj: SceneObject;
  level: number;
  selectedIds: string[];
  onSelect: (id: string, multi: boolean) => void;
}> = ({ obj, level, selectedIds, onSelect }) => {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedIds.includes(obj.id);
  const hasChildren = obj.children && obj.children.length > 0;

  return (
    <div>
      <div 
        className={`flex items-center py-1.5 px-2 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${
          isSelected ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={(e) => {
            e.stopPropagation();
            // Use Ctrl/Command/Shift for multi-select
            onSelect(obj.id, e.metaKey || e.ctrlKey || e.shiftKey);
        }}
      >
        <div 
            className={`mr-1 p-0.5 rounded hover:bg-black/5 cursor-pointer ${hasChildren ? 'visible' : 'invisible'}`}
            onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
            }}
        >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </div>
        
        <div className="mr-2 opacity-70">
            {getIconForType(obj.type)}
        </div>
        
        <span className="text-sm font-medium truncate select-none flex-1">{obj.name}</span>
      </div>
      
      {hasChildren && expanded && (
        <div>
          {obj.children!.map(child => (
            <HierarchyItem 
              key={child.id} 
              obj={child} 
              level={level + 1} 
              selectedIds={selectedIds} 
              onSelect={onSelect} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const HierarchyPanel: React.FC<HierarchyPanelProps> = ({ objects, selectedIds, onSelect, className = "" }) => {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
        <Layers size={16} className="text-slate-500" />
        <h2 className="font-bold text-slate-700 text-sm">Hierarchy</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-1 custom-scrollbar min-h-0">
         {objects.length === 0 ? (
             <div className="text-xs text-slate-400 text-center p-4 italic">No objects</div>
         ) : (
             objects.map(obj => (
                <HierarchyItem 
                    key={obj.id} 
                    obj={obj} 
                    level={0} 
                    selectedIds={selectedIds} 
                    onSelect={onSelect} 
                />
             ))
         )}
      </div>
    </div>
  );
};

export default HierarchyPanel;
