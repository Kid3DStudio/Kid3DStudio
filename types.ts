export type ShapeType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'group' | 'custom';

export interface SceneObject {
  id: string;
  type: ShapeType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  pivot?: [number, number, number]; // Offset of the geometry relative to the object's origin
  color: string;
  name: string;
  children?: SceneObject[];
  geometryData?: any; // To store serialized BufferGeometry for custom shapes (CSG results)
  baseDimensions?: [number, number, number]; // The natural size of the geometry before scaling (default 1,1,1 for primitives)
}

export interface ProjectData {
  name: string;
  version: string;
  objects: SceneObject[];
}

export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface SnapSettings {
  translation: number;
  rotation: number; // in degrees
  scale: number;
}