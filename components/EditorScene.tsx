import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid, Environment, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { SceneObject, TransformMode, SnapSettings } from '../types';

// Fix for missing JSX definitions in the current environment.
// This wildcard definition allows any HTML or Three.js element tag to be used in JSX without type errors.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

interface EditorSceneProps {
  objects: SceneObject[];
  selectedIds: string[];
  transformMode: TransformMode;
  onSelect: (id: string | null, multi: boolean) => void;
  onUpdateObject: (id: string, updates: Partial<SceneObject>) => void;
  sceneRef: React.MutableRefObject<THREE.Group | null>;
  focusTrigger: number;
  isWireframe: boolean;
  snapSettings: SnapSettings;
  hiddenIds?: string[];
  readOnly?: boolean;
  previewObjectId?: string | null;
}

// Camera Handler Component
const CameraHandler: React.FC<{
  focusTrigger: number;
  selectedIds: string[];
  sceneRef: React.MutableRefObject<THREE.Group | null>;
  controlsRef: React.MutableRefObject<any>;
}> = ({ focusTrigger, selectedIds, sceneRef, controlsRef }) => {
  const { camera } = useThree();

  useEffect(() => {
    if (selectedIds.length > 0 && sceneRef.current && controlsRef.current && focusTrigger > 0) {
      const box = new THREE.Box3();
      const selectedObjects: THREE.Object3D[] = [];
      
      sceneRef.current.traverse((child) => {
        if (child.userData?.id && selectedIds.includes(child.userData.id)) {
          selectedObjects.push(child);
        }
      });

      if (selectedObjects.length > 0) {
        selectedObjects.forEach(obj => box.expandByObject(obj));
        
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        
        box.getCenter(center);
        box.getSize(size);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Calculate distance to fit object based on FOV
        const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
        let distance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        distance *= 2.0; // Zoom factor
        
        // Ensure minimum distance so we don't get inside the object
        distance = Math.max(distance, 20);

        // Keep current camera orientation relative to target
        const direction = new THREE.Vector3()
          .subVectors(camera.position, controlsRef.current.target)
          .normalize();
          
        const newPos = center.clone().add(direction.multiplyScalar(distance));
        
        controlsRef.current.target.copy(center);
        camera.position.copy(newPos);
        controlsRef.current.update();
      }
    }
  }, [focusTrigger, selectedIds, sceneRef, controlsRef, camera]);

  return null;
};

interface SceneNodeProps {
  obj: SceneObject;
  selectedIds: string[];
  onSelect: (id: string, multi: boolean) => void;
  onUpdate: (id: string, data: Partial<SceneObject>) => void;
  mode: TransformMode;
  isWireframe: boolean;
  snapSettings: SnapSettings;
  visible: boolean;
  readOnly: boolean;
  isPreview: boolean;
  parentId?: string; // To help bubble selection if needed
}

const SceneNode: React.FC<SceneNodeProps> = ({ 
  obj, 
  selectedIds, 
  onSelect, 
  onUpdate, 
  mode,
  isWireframe,
  snapSettings,
  visible,
  readOnly,
  isPreview
}) => {
  // Use a group reference for the object container (handling Position/Rotation/Scale)
  const groupRef = useRef<THREE.Group>(null);
  
  const isSelected = selectedIds.includes(obj.id);
  const pivot = obj.pivot || [0, 0, 0];
  
  // Prevent propagation to avoid selecting parent when child is clicked
  const handlePointerDown = (e: ThreeEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    onSelect(obj.id, e.shiftKey);
  };

  if (obj.type === 'group') {
    return (
      <>
        <group
          ref={groupRef}
          position={obj.position}
          rotation={obj.rotation}
          scale={obj.scale}
          userData={{ id: obj.id, isGroup: true }}
          onClick={handlePointerDown}
          visible={visible}
        >
          {obj.children?.map(child => (
            <SceneNode
              key={child.id}
              obj={child}
              selectedIds={selectedIds}
              onSelect={(id, multi) => {
                  onSelect(id, multi);
              }}
              onUpdate={onUpdate}
              mode={mode}
              isWireframe={isWireframe}
              snapSettings={snapSettings}
              visible={visible} // Inherit visibility for now
              readOnly={readOnly}
              isPreview={isPreview}
            />
          ))}
          {isSelected && (
              <mesh>
                 <boxGeometry args={[1, 1, 1]} />
                 <meshBasicMaterial visible={false} />
                 <Edges 
                   threshold={15} 
                   color="#3b82f6" 
                   renderOrder={1000} 
                   scale={1.01}
                 />
              </mesh>
          )}
        </group>
        
        {isSelected && selectedIds.length === 1 && !readOnly && (
            <TransformControls
                object={groupRef}
                mode={mode}
                // Intuitive Snapping: Use World space for translation (grid align), Local for rotate/scale
                space={mode === 'translate' ? 'world' : 'local'}
                translationSnap={snapSettings.translation}
                rotationSnap={snapSettings.rotation * (Math.PI / 180)}
                scaleSnap={snapSettings.scale}
                onMouseUp={() => {
                    if (groupRef.current) {
                        const p = groupRef.current.position;
                        const r = groupRef.current.rotation;
                        const s = groupRef.current.scale;
                        onUpdate(obj.id, {
                            position: [p.x, p.y, p.z],
                            rotation: [r.x, r.y, r.z],
                            scale: [s.x, s.y, s.z]
                        });
                    }
                }}
            />
        )}
      </>
    );
  }

  // Geometries normalized to approx 1 unit size so scale = mm size
  const geometry = useMemo(() => {
    let geom: THREE.BufferGeometry;
    switch (obj.type) {
      case 'box': 
        geom = new THREE.BoxGeometry(1, 1, 1); 
        break;
      case 'sphere': 
        geom = new THREE.SphereGeometry(0.5, 32, 32); 
        break;
      case 'cylinder': 
        geom = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); 
        // Rotate Cylinder to align with Z-axis (Height)
        geom.rotateX(Math.PI / 2);
        break;
      case 'cone': 
        geom = new THREE.ConeGeometry(0.5, 1, 32); 
        // Rotate Cone to align with Z-axis (Height)
        geom.rotateX(Math.PI / 2);
        break;
      case 'torus': 
        geom = new THREE.TorusGeometry(0.4, 0.1, 16, 100); 
        // Torus is already XY aligned (lies flat), which is what we want for Z-up
        break;
      case 'custom': {
        if (obj.geometryData) {
            const loader = new THREE.BufferGeometryLoader();
            try {
                geom = loader.parse(obj.geometryData);
                // Validate geometry validity
                if (geom.attributes.position) {
                    const arr = geom.attributes.position.array;
                    // Basic sanity check on first few vertices to fail fast
                    for(let i=0; i < Math.min(arr.length, 30); i++) {
                        if (!Number.isFinite(arr[i])) throw new Error("NaN vertex detected");
                    }
                }
            } catch (e) {
                console.warn("Failed to load custom geometry for object", obj.id, e);
                // Return a fallback geometry to prevent crashes
                geom = new THREE.BoxGeometry(1, 1, 1);
            }
        } else {
            geom = new THREE.BoxGeometry(1, 1, 1);
        }
        break;
      }
      default: geom = new THREE.BoxGeometry(1, 1, 1);
    }
    return geom;
  }, [obj.type, obj.geometryData, obj.id]);

  return (
    <>
      {/* 
        WRAPPER GROUP: Handles the Object's Location, Rotation, and Scale. 
        This is what the TransformGizmo attaches to.
      */}
      <group
        ref={groupRef}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        visible={visible}
      >
        {/* 
            ACTUAL MESH: Handles Geometry and Visuals.
            It is offset by the 'pivot' value inside the parent group.
        */}
        <mesh 
          userData={{ id: obj.id, isExportable: true }}
          position={pivot} // Apply Geometry Offset (Pivot)
          onClick={handlePointerDown}
          geometry={geometry}
          castShadow={!isPreview}
          receiveShadow={!isPreview}
        >
          <meshStandardMaterial 
            color={isPreview ? "#3b82f6" : obj.color} 
            
            // Ghost/Preview Styles
            transparent={isPreview}
            opacity={isPreview ? 0.6 : 1.0}
            
            // Selection Highlight Styles
            emissive={isSelected || isPreview ? (isPreview ? "#1e40af" : "#444") : undefined}
            emissiveIntensity={isPreview ? 0.5 : (isSelected ? 0.2 : undefined)}
            
            wireframe={isWireframe}
            metalness={isPreview ? 0.2 : 0}
            roughness={isPreview ? 0.1 : 1}
          />
          {(isSelected || isPreview) && (
            <Edges 
              threshold={15} 
              color={isPreview ? "#93c5fd" : "#3b82f6"} 
              renderOrder={1000}
              scale={1.002}
            />
          )}
        </mesh>

        {/* Pivot Point Indicator (Only when selected) */}
        {isSelected && !readOnly && (
            <axesHelper args={[0.8]} />
        )}
      </group>

      {/* Transform Controls attach to the Wrapper Group (the Pivot Point) */}
      {isSelected && selectedIds.length === 1 && !readOnly && (
        <TransformControls
          object={groupRef}
          mode={mode}
          // Intuitive Snapping: Use World space for translation (grid align), Local for rotate/scale
          space={mode === 'translate' ? 'world' : 'local'}
          translationSnap={snapSettings.translation}
          rotationSnap={snapSettings.rotation * (Math.PI / 180)}
          scaleSnap={snapSettings.scale}
          onMouseUp={() => {
             if (groupRef.current) {
                const p = groupRef.current.position;
                const r = groupRef.current.rotation;
                const s = groupRef.current.scale;
                onUpdate(obj.id, {
                  position: [p.x, p.y, p.z],
                  rotation: [r.x, r.y, r.z],
                  scale: [s.x, s.y, s.z]
                });
             }
          }}
        />
      )}
    </>
  );
};

const EditorScene: React.FC<EditorSceneProps> = ({
  objects,
  selectedIds,
  transformMode,
  onSelect,
  onUpdateObject,
  sceneRef,
  focusTrigger,
  isWireframe,
  snapSettings,
  hiddenIds = [],
  readOnly = false,
  previewObjectId = null
}) => {
  const controlsRef = useRef<any>(null);

  // Sync grid visualization with snap settings
  // If snap is 0 (disabled), use 10 as default visual grid
  const gridCellSize = snapSettings.translation > 0 ? snapSettings.translation : 10;
  // Major lines every 10 cells
  const gridSectionSize = gridCellSize * 10;

  return (
    <div className="w-full h-full bg-slate-50">
      <Canvas 
        shadows 
        // Use Z-up coordinate convention
        camera={{ position: [40, -40, 40], fov: 45, up: [0, 0, 1] }}
        onPointerMissed={(e) => {
          if (e.type === 'click' && !readOnly) {
            onSelect(null, false);
          }
        }}
      >
        <CameraHandler 
          focusTrigger={focusTrigger} 
          selectedIds={selectedIds} 
          sceneRef={sceneRef} 
          controlsRef={controlsRef} 
        />

        <group ref={sceneRef}>
          {objects.map(obj => (
            <SceneNode 
              key={obj.id}
              obj={obj}
              selectedIds={selectedIds}
              onSelect={onSelect}
              onUpdate={onUpdateObject}
              mode={transformMode}
              isWireframe={isWireframe}
              snapSettings={snapSettings}
              visible={!hiddenIds.includes(obj.id)}
              readOnly={readOnly}
              isPreview={obj.id === previewObjectId}
            />
          ))}
        </group>
        
        <ambientLight intensity={0.5} />
        {/* Light moved to Z-up position */}
        <pointLight position={[50, 50, 100]} intensity={1} castShadow />
        <Environment preset="city" />
        
        {/* Grid rotated to lie on XY plane, synced with snapping */}
        <Grid 
            infiniteGrid 
            cellSize={gridCellSize} 
            sectionSize={gridSectionSize} 
            fadeDistance={400} 
            sectionColor="#94a3b8" 
            cellColor="#cbd5e1" 
            rotation={[Math.PI / 2, 0, 0]} 
        />
        
        {/* Orbit Controls with Z as up axis */}
        <OrbitControls 
            ref={controlsRef} 
            makeDefault 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2} 
            object-up={[0, 0, 1]} 
            target={[0, 0, 0]}
        />
        
        {/* Floor for shadows on XY plane (Z=-0.1) */}
        <mesh position={[0, 0, -0.1]} receiveShadow>
          <planeGeometry args={[1000, 1000]} />
          <shadowMaterial opacity={0.2} />
        </mesh>
      </Canvas>
    </div>
  );
};

export default EditorScene;