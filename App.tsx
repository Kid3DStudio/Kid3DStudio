import React, { useState, useRef, useCallback, useEffect } from 'react';
import { STLExporter, STLLoader, OBJLoader } from 'three-stdlib';
import * as THREE from 'three';
import { CSG } from 'three-csg-ts';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import EditorScene from './components/EditorScene';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import HierarchyPanel from './components/HierarchyPanel';
import TopBar from './components/TopBar';
import { SceneObject, ShapeType, TransformMode, ProjectData, SnapSettings } from './types';
import { generateId } from './utils/idGenerator';
import { BooleanOperationSystem } from './utils/booleanOperations';

const DEFAULT_PROJECT_NAME = 'My Awesome Project';

// Notification Component
const NotificationToast: React.FC<{ 
  message: string; 
  type: 'error' | 'info' | 'success'; 
  onClose: () => void; 
}> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-600' : 'bg-slate-700';
  const icon = type === 'error' ? <AlertCircle size={18} /> : type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />;

  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-white text-sm font-medium z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 ${bg}`}>
      {icon}
      <span>{message}</span>
    </div>
  );
};

const App: React.FC = () => {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [past, setPast] = useState<SceneObject[][]>([]);
  const [future, setFuture] = useState<SceneObject[][]>([]);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [projectName, setProjectName] = useState(DEFAULT_PROJECT_NAME);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [isWireframe, setIsWireframe] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'error' | 'info' | 'success'} | null>(null);

  // Default snap settings: whole numbers. Scale 1 = 1mm step.
  const [snapSettings, setSnapSettings] = useState<SnapSettings>({
    translation: 1,
    rotation: 15,
    scale: 1
  });
  
  // Ref to the THREE.Group containing user objects for export
  const sceneRef = useRef<THREE.Group | null>(null);

  // --- Notification Helper ---
  const showNotification = useCallback((message: string, type: 'error' | 'info' | 'success' = 'info') => {
    setNotification({ message, type });
  }, []);

  // --- History Management ---

  const saveToHistory = useCallback(() => {
    setPast(prev => [...prev, objects]);
    setFuture([]);
  }, [objects]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    
    const previousState = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setFuture(prev => [objects, ...prev]);
    setObjects(previousState);
    setPast(newPast);
  }, [past, objects]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    
    const nextState = future[0];
    const newFuture = future.slice(1);
    
    setPast(prev => [...prev, objects]);
    setObjects(nextState);
    setFuture(newFuture);
  }, [future, objects]);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // --- Object Management ---

  const handleAddShape = useCallback((type: ShapeType) => {
    saveToHistory();
    
    const newObject: SceneObject = {
      id: generateId(),
      type,
      // Spawn at Z=10 (above grid in Z-up system)
      position: [0, 0, 10], 
      rotation: [0, 0, 0],
      // Initialize with reasonable size (20mm) since base geometry is 1 unit
      scale: [20, 20, 20],
      pivot: [0, 0, 0],
      color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${objects.length + 1}`
    };
    setObjects(prev => [...prev, newObject]);
    setSelectedIds([newObject.id]);
  }, [objects, saveToHistory]);

  const updateObjectRecursive = (list: SceneObject[], id: string, updates: Partial<SceneObject>): SceneObject[] => {
    return list.map(obj => {
      if (obj.id === id) {
        return { ...obj, ...updates };
      }
      if (obj.children) {
        return { ...obj, children: updateObjectRecursive(obj.children, id, updates) };
      }
      return obj;
    });
  };

  const handleUpdateObject = useCallback((id: string, updates: Partial<SceneObject>) => {
    saveToHistory();
    setObjects(prev => updateObjectRecursive(prev, id, updates));
  }, [saveToHistory]);

  const deleteObjectRecursive = (list: SceneObject[], ids: string[]): SceneObject[] => {
    return list.filter(obj => !ids.includes(obj.id)).map(obj => {
        if (obj.children) {
            return { ...obj, children: deleteObjectRecursive(obj.children, ids) };
        }
        return obj;
    });
  };

  const handleDeleteObject = useCallback((id: string) => {
    saveToHistory();
    setObjects(prev => deleteObjectRecursive(prev, [id]));
    setSelectedIds(prev => prev.filter(sid => sid !== id));
  }, [saveToHistory]);

  const findObjectRecursive = (list: SceneObject[], id: string): SceneObject | undefined => {
      for (const obj of list) {
          if (obj.id === id) return obj;
          if (obj.children) {
              const found = findObjectRecursive(obj.children, id);
              if (found) return found;
          }
      }
      return undefined;
  };

  const handleDuplicateObject = useCallback((id: string) => {
    saveToHistory();
    
    const original = findObjectRecursive(objects, id);
    if (!original) return;

    // Helper to gather all names in scene to ensure uniqueness
    const getAllNames = (list: SceneObject[]) => {
        const names = new Set<string>();
        const traverse = (items: SceneObject[]) => {
            items.forEach(i => {
                names.add(i.name);
                if (i.children) traverse(i.children);
            });
        };
        traverse(list);
        return names;
    };

    // Determine unique name
    const existingNames = getAllNames(objects);
    
    const re = /^(.*?)\s\(Copy(?:\s(\d+))?\)$/;
    const match = original.name.match(re);
    const rootName = match ? match[1] : original.name;
    
    let count = 1;
    let newName = `${rootName} (Copy)`;
    
    while (existingNames.has(newName)) {
        count++;
        newName = `${rootName} (Copy ${count})`;
    }

    // Deep copy helper with rename for root
    const deepClone = (obj: SceneObject, isRoot: boolean): SceneObject => {
        return {
            ...obj,
            id: generateId(),
            name: isRoot ? newName : obj.name,
            position: isRoot 
                ? [obj.position[0] + 5, obj.position[1], obj.position[2] + 5]
                : [obj.position[0], obj.position[1], obj.position[2]],
            children: obj.children ? obj.children.map(c => deepClone(c, false)) : undefined,
            geometryData: obj.geometryData, // Keep boolean geom if exists
            baseDimensions: obj.baseDimensions,
            pivot: (obj.pivot ? [...obj.pivot] : [0,0,0]) as [number, number, number]
        };
    };

    const newObject = deepClone(original, true);
    
    setObjects(prev => [...prev, newObject]);
    setTimeout(() => setSelectedIds([newObject.id]), 0);
  }, [objects, saveToHistory]);

  // --- Selection Management ---
  
  const handleSelect = useCallback((id: string | null, multi: boolean) => {
      if (id === null) {
          setSelectedIds([]);
          return;
      }
      
      setSelectedIds(prev => {
          if (multi) {
              return prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id];
          }
          return [id];
      });
  }, []);

  // --- Grouping Logic ---

  const handleGroup = useCallback(() => {
    if (selectedIds.length < 2) return;
    saveToHistory();

    const selectedObjects: SceneObject[] = [];
    const otherObjects: SceneObject[] = [];

    // Separate selected objects from root list
    objects.forEach(obj => {
        if (selectedIds.includes(obj.id)) {
            selectedObjects.push(obj);
        } else {
            otherObjects.push(obj);
        }
    });

    if (selectedObjects.length === 0) return;

    // Calculate center
    const center = new THREE.Vector3();
    selectedObjects.forEach(o => center.add(new THREE.Vector3(...o.position)));
    center.divideScalar(selectedObjects.length);

    // Create children with relative positions
    const children = selectedObjects.map(o => ({
        ...o,
        position: [
            o.position[0] - center.x,
            o.position[1] - center.y,
            o.position[2] - center.z
        ] as [number, number, number]
    }));

    const newGroup: SceneObject = {
        id: generateId(),
        type: 'group',
        position: [center.x, center.y, center.z],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        pivot: [0, 0, 0],
        color: '#ffffff', // unused for groups usually
        children: children,
        name: 'Group ' + (objects.length + 1)
    };

    setObjects([...otherObjects, newGroup]);
    setSelectedIds([newGroup.id]);
    showNotification("Objects grouped successfully.", "success");
  }, [objects, selectedIds, saveToHistory, showNotification]);

  const handleUngroup = useCallback(() => {
      if (selectedIds.length !== 1) return;
      const group = objects.find(o => o.id === selectedIds[0]);
      
      if (!group || group.type !== 'group' || !group.children) return;
      saveToHistory();

      const groupMatrix = new THREE.Matrix4().compose(
          new THREE.Vector3(...group.position),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(...group.rotation)),
          new THREE.Vector3(...group.scale)
      );

      const newChildren = group.children.map(child => {
          const childMatrix = new THREE.Matrix4().compose(
              new THREE.Vector3(...child.position),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(...child.rotation)),
              new THREE.Vector3(...child.scale)
          );
          
          // Apply parent transform: childWorld = parentWorld * childLocal
          childMatrix.premultiply(groupMatrix);

          const pos = new THREE.Vector3();
          const rot = new THREE.Quaternion();
          const scale = new THREE.Vector3();
          
          childMatrix.decompose(pos, rot, scale);
          const euler = new THREE.Euler().setFromQuaternion(rot);

          return {
              ...child,
              position: [pos.x, pos.y, pos.z] as [number, number, number],
              rotation: [euler.x, euler.y, euler.z] as [number, number, number],
              scale: [scale.x, scale.y, scale.z] as [number, number, number],
              pivot: (child.pivot ? [...child.pivot] : [0,0,0]) as [number, number, number]
          };
      });

      const otherObjects = objects.filter(o => o.id !== group.id);
      setObjects([...otherObjects, ...newChildren]);
      setSelectedIds(newChildren.map(c => c.id));
      showNotification("Group ungrouped.", "success");
  }, [objects, selectedIds, saveToHistory, showNotification]);

  // --- Boolean Operations ---

  const performBooleanOperation = (op: 'union' | 'intersect' | 'subtract') => {
    try {
      if (selectedIds.length !== 2) {
          showNotification("Please select exactly two objects for this operation.", "error");
          return;
      }

      const idA = selectedIds[0];
      const idB = selectedIds[1];
      
      // Use recursive find to grab objects even if nested (though placement logic below generally assumes root for now)
      const objA = findObjectRecursive(objects, idA);
      const objB = findObjectRecursive(objects, idB);
      
      if (!objA || !objB) {
        showNotification("Selected objects could not be found.", "error");
        return;
      }

      if (objA.type === 'group' || objB.type === 'group') {
        showNotification("Boolean operations are not supported on Groups yet. Please ungroup them first.", "error");
        return;
      }

      // Use the new BooleanOperationSystem for the operation
      const result = BooleanOperationSystem.executeBooleanOperation(objA, objB, op);

      if (!result.result) {
        showNotification(`Boolean operation failed: ${result.error || "Unknown error"}`, "error");
        return;
      }

      saveToHistory();
      
      // Remove originals and add new object. Use recursive delete to ensure they are removed even if nested.
      const objectsWithoutOriginals = deleteObjectRecursive(objects, [idA, idB]);
      setObjects([...objectsWithoutOriginals, result.result]);
      setSelectedIds([result.result.id]);
      showNotification("Boolean operation successful!", "success");

    } catch (e: any) {
      console.error(e);
      showNotification("An unexpected error occurred during the operation.", "error");
    }
  };

  const handleBooleanOperation = useCallback((op: 'union' | 'intersect' | 'subtract') => {
      if (selectedIds.length !== 2) return;
      
      // Visual feedback via cursor
      document.body.style.cursor = 'wait';

      // Perform Calculation Async (via setTimeout to allow UI render of cursor)
      setTimeout(() => {
        performBooleanOperation(op);
        document.body.style.cursor = 'default';
      }, 50);
      
  }, [selectedIds, objects, saveToHistory]);


  // --- Camera Management ---
  const handleFocusObject = useCallback((id: string) => {
    setFocusTrigger(prev => prev + 1);
  }, []);

  // --- Project Management ---

  const handleNewProject = useCallback(() => {
    if (window.confirm('Start a new project? Unsaved changes will be lost.')) {
      setObjects([]);
      setPast([]);
      setFuture([]);
      setSelectedIds([]);
      setProjectName(DEFAULT_PROJECT_NAME);
    }
  }, []);

  const handleSaveJSON = useCallback(() => {
    const projectData: ProjectData = {
      name: projectName,
      version: '1.0',
      objects
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Project saved!", "success");
  }, [projectName, objects, showNotification]);

  const handleOpenProject = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.objects && Array.isArray(json.objects)) {
          setObjects(json.objects);
          setPast([]);
          setFuture([]);
          setProjectName(json.name || file.name.replace('.json', ''));
          setSelectedIds([]);
          showNotification("Project loaded successfully.", "success");
        } else {
          showNotification("Invalid project file structure.", "error");
        }
      } catch (err) {
        console.error('Error parsing JSON.');
        showNotification("Error parsing project file.", "error");
      }
    };
    reader.readAsText(file);
  }, [showNotification]);

  const handleImportModel = useCallback((file: File) => {
    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        let geometry: THREE.BufferGeometry | null = null;

        if (extension === 'stl') {
          const loader = new STLLoader();
          geometry = loader.parse(arrayBuffer);
        } else if (extension === 'obj') {
          // OBJLoader expects string, not buffer
          const text = new TextDecoder().decode(arrayBuffer);
          const loader = new OBJLoader();
          const group = loader.parse(text);
          // Extract the first mesh's geometry
          group.traverse((child) => {
            if (child instanceof THREE.Mesh && !geometry) {
              geometry = child.geometry.clone();
            }
          });
        }

        if (!geometry) {
           showNotification("Failed to extract geometry from file.", "error");
           return;
        }

        // Processing Geometry
        geometry.computeVertexNormals();
        geometry.center(); // Center pivot to middle of geometry
        
        // Compute bounds to set natural size
        geometry.computeBoundingBox();
        const size = new THREE.Vector3();
        geometry.boundingBox!.getSize(size);
        
        // Serialize geometry for storage
        const geometryData = geometry.toJSON();

        saveToHistory();

        const newObject: SceneObject = {
          id: generateId(),
          type: 'custom',
          // Position slightly above ground (Z=0) based on height
          position: [0, 0, size.z / 2],
          rotation: [0, 0, 0],
          scale: [1, 1, 1], // Imported models use 1:1 scale relative to their file units
          pivot: [0, 0, 0],
          color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
          name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          geometryData: geometryData,
          baseDimensions: [size.x || 1, size.y || 1, size.z || 1]
        };

        setObjects(prev => [...prev, newObject]);
        setSelectedIds([newObject.id]);
        showNotification(`Imported ${file.name}`, "success");

      } catch (err) {
        console.error('Import error:', err);
        showNotification("Error importing model file.", "error");
      }
    };

    if (extension === 'obj') {
       // OBJ loader in Three-stdlib handles text
       reader.readAsArrayBuffer(file);
    } else {
       reader.readAsArrayBuffer(file);
    }

  }, [saveToHistory, showNotification]);

  // --- Exporting ---

  const handleExportSTL = useCallback(() => {
    if (!sceneRef.current) return;
    const exporter = new STLExporter();
    // Temporary helper to process scene for export (could hide helpers if needed)
    const str = exporter.parse(sceneRef.current);
    const blob = new Blob([str], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.replace(/\s+/g, '_')}.stl`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification("STL export started.", "success");
  }, [projectName, showNotification]);
  
  const handleExport3MF = useCallback(async () => {
      try {
        // @ts-ignore
        const { ThreeMFExporter } = await import('three-stdlib');
        if (ThreeMFExporter && sceneRef.current) {
            const exporter = new ThreeMFExporter();
            exporter.parse(sceneRef.current, (blob: Blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${projectName.replace(/\s+/g, '_')}.3mf`;
                link.click();
                URL.revokeObjectURL(url);
            });
            showNotification("3MF export started.", "success");
            return;
        } 
      } catch (e) {
          console.warn("3MF Exporter not found or failed");
          showNotification("3MF Export failed: Exporter not available.", "error");
      }
  }, [projectName, showNotification]);

  // Determine current selection for PropertiesPanel
  const primarySelectedObject = selectedIds.length === 1 
    ? findObjectRecursive(objects, selectedIds[0])
    : undefined;

  // Determine if boolean operations are possible (2 objects, neither is group)
  const canBoolean = selectedIds.length === 2 && (() => {
      const a = findObjectRecursive(objects, selectedIds[0]);
      const b = findObjectRecursive(objects, selectedIds[1]);
      return !!(a && b && a.type !== 'group' && b.type !== 'group');
  })();

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col">
      <TopBar 
        projectName={projectName}
        onRenameProject={setProjectName}
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onImportModel={handleImportModel}
        onSaveJSON={handleSaveJSON}
        onExportSTL={handleExportSTL}
        onExport3MF={handleExport3MF}
        onUndo={undo}
        onRedo={redo}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
      />
      
      <div className="flex-1 relative">
        <EditorScene 
          objects={objects}
          selectedIds={selectedIds}
          transformMode={transformMode}
          onSelect={handleSelect}
          onUpdateObject={handleUpdateObject}
          sceneRef={sceneRef}
          focusTrigger={focusTrigger}
          isWireframe={isWireframe}
          snapSettings={snapSettings}
          hiddenIds={[]}
          readOnly={false}
          previewObjectId={null}
        />

        <Toolbar 
          onAddShape={handleAddShape}
          currentMode={transformMode}
          onSetMode={setTransformMode}
          isWireframe={isWireframe}
          onToggleWireframe={() => setIsWireframe(prev => !prev)}
        />

        {/* Right Sidebar */}
        <div className="absolute right-4 top-20 bottom-4 w-64 flex flex-col gap-4 pointer-events-none z-10">
            <HierarchyPanel 
                objects={objects} 
                selectedIds={selectedIds} 
                onSelect={handleSelect}
                className="pointer-events-auto flex-1 bg-white/90 backdrop-blur shadow-xl rounded-2xl border border-slate-200 overflow-hidden" 
            />
            
            <PropertiesPanel 
                selectedObject={primarySelectedObject}
                selectionCount={selectedIds.length}
                onUpdate={handleUpdateObject}
                onDelete={(id) => handleDeleteObject(id)}
                onDeleteSelected={() => {
                    selectedIds.forEach(id => handleDeleteObject(id));
                    saveToHistory();
                }}
                onDuplicate={(id) => handleDuplicateObject(id)}
                onFocus={handleFocusObject}
                onGroup={handleGroup}
                onUngroup={handleUngroup}
                onBooleanOperation={handleBooleanOperation}
                canBoolean={canBoolean}
                snapSettings={snapSettings}
                onUpdateSnapSettings={setSnapSettings}
                className="pointer-events-auto shrink-0 max-h-[60%] overflow-y-auto"
            />
        </div>
        
        <div className="absolute bottom-4 left-4 text-xs text-slate-400 pointer-events-none">
          Left Click: Select • Shift+Click: Multi-Select • Right Click: Rotate • Scroll: Zoom
        </div>

        {notification && (
          <NotificationToast 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
      </div>
    </div>
  );
};

export default App;
