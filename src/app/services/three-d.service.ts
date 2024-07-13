// src/app/services/three-d.service.ts

import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

@Injectable({
  providedIn: 'root'
})
export class ThreeDService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;

  initScene(container: HTMLElement) {
    // Set up scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Set up camera
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 10);

    // Set up renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Set up controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  this.scene.add(cube);

  // Position camera
  this.camera.position.z = 5;
    // Start animation loop
    this.animate();
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  createWall(start: THREE.Vector3, end: THREE.Vector3, height: number) {
    const wallGeometry = new THREE.BoxGeometry(
      end.distanceTo(start),
      height,
      0.1
    );
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);

    // Position and rotate the wall
    wall.position.copy(start.clone().add(end).multiplyScalar(0.5));
    wall.position.y = height / 2;
    wall.lookAt(end);

    this.scene.add(wall);
  }

  createWindow(start: THREE.Vector3, end: THREE.Vector3, height: number) {
    // Create frame
    this.createWall(start, end, height);

    // Create glass
    const glassGeometry = new THREE.PlaneGeometry(
      end.distanceTo(start) - 0.1,
      height - 0.1
    );
    const glassMaterial = new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.3,
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);

    glass.position.copy(start.clone().add(end).multiplyScalar(0.5));
    glass.position.y = height / 2;
    glass.lookAt(end);

    this.scene.add(glass);
  }

  createDoor(start: THREE.Vector3, end: THREE.Vector3, height: number) {
    // Create frame
    this.createWall(start, end, height);

    // Create door
    const doorGeometry = new THREE.PlaneGeometry(
      end.distanceTo(start) - 0.1,
      height - 0.1
    );
    const doorMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);

    door.position.copy(start.clone().add(end).multiplyScalar(0.5));
    door.position.y = height / 2;
    door.lookAt(end);

    this.scene.add(door);
  }

  drawFloorPlan(segments: any[]) {
    const height = 2.5; // Standard room height
    segments.forEach(segment => {
      const start = new THREE.Vector3(segment.start.x, 0, segment.start.y);
      const end = new THREE.Vector3(segment.end.x, 0, segment.end.y);

      switch (segment.type) {
        case 'wall':
          this.createWall(start, end, height);
          break;
        case 'window':
          this.createWindow(start, end, height);
          break;
        case 'door':
          this.createDoor(start, end, height);
          break;
      }
    });
  }
}
