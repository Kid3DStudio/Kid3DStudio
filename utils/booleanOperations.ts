import * as THREE from 'three';
import { CSG } from 'three-csg-ts';
import { SceneObject } from '../types';
import { generateId } from './idGenerator';

// Типы для результатов булевых операций
export interface BooleanOperationResult {
  geometry: THREE.BufferGeometry;
  position: THREE.Vector3;
  size: THREE.Vector3;
  isValid: boolean;
  error?: string;
}

// Улучшенная система булевых операций
export class BooleanOperationSystem {
  // Проверка корректности геометрии
  static validateGeometry(geometry: THREE.BufferGeometry): boolean {
    if (!geometry || !geometry.attributes.position) return false;
    
    const positions = geometry.attributes.position.array as Float32Array;
    if (!positions || positions.length < 9) return false; // Минимум 1 треугольник
    
    for (let i = 0; i < positions.length; i++) {
      if (!Number.isFinite(positions[i])) {
        return false;
      }
    }
    
    return true;
  }

  // Создание меша из объекта сцены с учетом всех трансформаций
  static createMeshFromObject(obj: SceneObject): THREE.Mesh | null {
    let geometry: THREE.BufferGeometry;

    switch (obj.type) {
      case 'box':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        // Align Cylinder with Z-axis (Height)
        geometry.rotateX(Math.PI / 2);
        break;
      case 'cone':
        geometry = new THREE.ConeGeometry(0.5, 1, 32);
        // Align Cone with Z-axis (Height)
        geometry.rotateX(Math.PI / 2);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(0.4, 0.1, 16, 100);
        break;
      case 'custom':
        if (obj.geometryData) {
          const loader = new THREE.BufferGeometryLoader();
          try {
            geometry = loader.parse(obj.geometryData);
          } catch (e) {
            console.warn("Error parsing custom geometry data", e);
            geometry = new THREE.BoxGeometry(1, 1, 1);
          }
        } else {
          geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    if (!this.validateGeometry(geometry)) {
      return null;
    }

    const mesh = new THREE.Mesh(geometry);

    // Применение трансформаций
    mesh.position.set(obj.position[0], obj.position[1], obj.position[2]);
    
    if (obj.pivot) {
      mesh.position.x += obj.pivot[0];
      mesh.position.y += obj.pivot[1];
      mesh.position.z += obj.pivot[2];
    }

    mesh.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
    
    // Обеспечение корректного масштаба (не ноль)
    const scaleX = Math.abs(obj.scale[0]) < 0.001 ? (obj.scale[0] >= 0 ? 0.001 : -0.001) : obj.scale[0];
    const scaleY = Math.abs(obj.scale[1]) < 0.001 ? (obj.scale[1] >= 0 ? 0.001 : -0.001) : obj.scale[1];
    const scaleZ = Math.abs(obj.scale[2]) < 0.001 ? (obj.scale[2] >= 0 ? 0.001 : -0.001) : obj.scale[2];
    
    mesh.scale.set(scaleX, scaleY, scaleZ);

    mesh.updateMatrix();
    mesh.updateMatrixWorld(true);
    
    return mesh;
 }

  // Выполнение булевой операции
  static performOperation(
    meshA: THREE.Mesh,
    meshB: THREE.Mesh,
    operation: 'union' | 'subtract' | 'intersect'
  ): BooleanOperationResult {
    try {
      // Проверка валидности мешей
      if (!meshA || !meshB) {
        return {
          geometry: new THREE.BufferGeometry(),
          position: new THREE.Vector3(),
          size: new THREE.Vector3(),
          isValid: false,
          error: 'One or both meshes are invalid'
        };
      }

      // Проверка геометрии мешей
      if (!this.validateGeometry(meshA.geometry) || !this.validateGeometry(meshB.geometry)) {
        return {
          geometry: new THREE.BufferGeometry(),
          position: new THREE.Vector3(),
          size: new THREE.Vector3(),
          isValid: false,
          error: 'Mesh geometry is invalid'
        };
      }

      // Выполнение CSG операции
      let resultMesh: THREE.Mesh;
      
      switch (operation) {
        case 'union':
          resultMesh = CSG.union(meshA, meshB);
          break;
        case 'intersect':
          resultMesh = CSG.intersect(meshA, meshB);
          break;
        case 'subtract':
          resultMesh = CSG.subtract(meshA, meshB);
          break;
        default:
          return {
            geometry: new THREE.BufferGeometry(),
            position: new THREE.Vector3(),
            size: new THREE.Vector3(),
            isValid: false,
            error: 'Unknown operation type'
          };
      }

      if (!resultMesh) {
        return {
          geometry: new THREE.BufferGeometry(),
          position: new THREE.Vector3(),
          size: new THREE.Vector3(),
          isValid: false,
          error: 'CSG operation failed - no result mesh'
        };
      }

      // Проверка результата
      if (!this.validateGeometry(resultMesh.geometry)) {
        return {
          geometry: new THREE.BufferGeometry(),
          position: new THREE.Vector3(),
          size: new THREE.Vector3(),
          isValid: false,
          error: 'Result geometry is invalid'
        };
      }

      // Вычисление центра и размеров результата
      const boundingBox = new THREE.Box3().setFromObject(resultMesh);
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      
      const size = new THREE.Vector3();
      boundingBox.getSize(size);

      // Возвращение результата
      return {
        geometry: resultMesh.geometry.clone(),
        position: center,
        size: size,
        isValid: true
      };
    } catch (error) {
      return {
        geometry: new THREE.BufferGeometry(),
        position: new THREE.Vector3(),
        size: new THREE.Vector3(),
        isValid: false,
        error: `CSG operation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Создание нового объекта сцены из результата булевой операции
  static createResultObject(
    operationResult: BooleanOperationResult,
    objA: SceneObject,
    objB: SceneObject,
    operation: 'union' | 'subtract' | 'intersect'
  ): SceneObject {
    // Для сохранения исходных координат, мы будем использовать позицию первого объекта
    // для операций типа вычитания, где логично сохранить позицию основного объекта
    let resultPosition: [number, number, number];
    
    switch (operation) {
      case 'subtract':
        // При вычитании результат должен оставаться на месте первого объекта
        resultPosition = [...objA.position] as [number, number, number];
        break;
      case 'intersect':
        // При пересечении результат может быть в области пересечения
        resultPosition = [
          (objA.position[0] + objB.position[0]) / 2,
          (objA.position[1] + objB.position[1]) / 2,
          (objA.position[2] + objB.position[2]) / 2
        ] as [number, number, number];
        break;
      case 'union':
      default:
        // При объединении результат может быть в средней точке между объектами
        resultPosition = [
          (objA.position[0] + objB.position[0]) / 2,
          (objA.position[1] + objB.position[1]) / 2,
          (objA.position[2] + objB.position[2]) / 2
        ] as [number, number, number];
        break;
    }

    // Перемещаем геометрию так, чтобы она была правильно позиционирована относительно resultPosition
    // operationResult.position - это центр масс результата в мировых координатах
    const adjustedGeometry = operationResult.geometry.clone();
    const offset = new THREE.Vector3(
      operationResult.position.x - resultPosition[0],
      operationResult.position.y - resultPosition[1],
      operationResult.position.z - resultPosition[2]
    );
    adjustedGeometry.translate(-offset.x, -offset.y, -offset.z);

    // Создаем новый объект, сохраняя позицию и устанавливая реальные размеры как scale
    // При этом baseDimensions устанавливаем в [1,1,1] для корректной работы системы
    const newObject: SceneObject = {
      id: generateId(),
      type: 'custom',
      position: resultPosition,
      rotation: [0, 0, 0], // Сбрасываем вращение, так как оно уже учтено в геометрии
      scale: [
        Math.abs(operationResult.size.x) || 1,
        Math.abs(operationResult.size.y) || 1,
        Math.abs(operationResult.size.z) || 1
      ], // Реальные размеры объекта
      pivot: [0, 0, 0],
      baseDimensions: [1, 1, 1], // Базовые размеры для корректной работы системы
      color: objA.color, // Сохраняем цвет первого объекта
      name: `${operation.charAt(0).toUpperCase() + operation.slice(1)} Result`,
      geometryData: adjustedGeometry.toJSON() // Сохраняем скорректированную геометрию
    };

    return newObject;
  }

  // Основной метод выполнения булевой операции между двумя объектами сцены
  static executeBooleanOperation(
    objA: SceneObject,
    objB: SceneObject,
    operation: 'union' | 'subtract' | 'intersect'
  ): { result: SceneObject | null; error?: string } {
    try {
      // Создание мешей из объектов сцены
      const meshA = this.createMeshFromObject(objA);
      const meshB = this.createMeshFromObject(objB);

      if (!meshA || !meshB) {
        return {
          result: null,
          error: 'Failed to create meshes from scene objects'
        };
      }

      // Выполнение булевой операции
      const operationResult = this.performOperation(meshA, meshB, operation);

      if (!operationResult.isValid) {
        return {
          result: null,
          error: operationResult.error
        };
      }

      // Создание нового объекта сцены из результата
      const resultObject = this.createResultObject(operationResult, objA, objB, operation);

      return {
        result: resultObject,
        error: undefined
      };
    } catch (error) {
      return {
        result: null,
        error: `Boolean operation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}