  import { Component, ElementRef, ViewChild } from '@angular/core';
  import { GridService } from '../services/grid.service';
  import Konva from 'konva';
  import { DrawingService } from '../services/drawing.service';
  import { AutoDrawService } from '../services/auto-draw.service';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
  @Component({
    selector: 'app-home',
    templateUrl: 'home.page.html',
    styleUrls: ['home.page.scss'],
  })
  export class HomePage {
    @ViewChild('container', { static: true }) containerRef!: ElementRef;
    @ViewChild('threeContainer', { static: true }) threeContainerRef!: ElementRef;
    private stage!: Konva.Stage;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private controls!: OrbitControls;

    currentMode: 'wall' | 'window' | 'door' | 'select' | null = null;

    segments = [
      { start: 'A1', end: 'A2', name: 'External wall 1', type: 'wall', length: 1000, angle: 0 },
      { start: 'A2', end: 'A3', name: 'Parlor Door', type: 'door', length: 500, angle: 0 },
      { start: 'A3', end: 'A4', name: 'External Wall 2 ', type: 'wall', length: 3000, angle: 0 },
      { start: 'A1', end: 'A6', name: 'External Wall 3 ', type: 'wall', length: 3000, angle: 90 },
      { start: 'A2', end: 'A7', name: 'External Wall 3 ', type: 'wall', length: 3000, angle: 270 },
      { start: 'A4', end: 'A8', name: 'Window ', type: 'window', length: 3000, angle: 90 },

    ];

    constructor(
      private gridService: GridService,
      private drawingService: DrawingService,
      private autoDrawService: AutoDrawService

    ) {}

    ngOnInit() {
      this.initializeStage();
      this.gridService.createGrid(this.stage);
      this.drawingService.setStage(this.stage);
      this.setupEventListeners();
      this.initializeThreeJS();
    }

    initializeStage() {
      this.stage = new Konva.Stage({
        container: this.containerRef.nativeElement,
        width: window.innerWidth,
        height: window.innerHeight
      });
    }

    initializeThreeJS() {
      // Create a scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xf0f0f0);

      // Create a camera
      this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.camera.position.set(0, 5, 10);

      // Create a renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);
      this.threeContainerRef.nativeElement.appendChild(this.renderer.domElement);

      // Add orbit controls
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);

      // Add a grid helper
      const gridHelper = new THREE.GridHelper(10, 10);
      this.scene.add(gridHelper);

      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0x404040);
      this.scene.add(ambientLight);

      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(1, 1, 1);
      this.scene.add(directionalLight);

      this.animate();
    }

    animate() {
      requestAnimationFrame(() => this.animate());
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }  // toogle gird call

    toggleGrid() {
      this.gridService.toggleGrid();
    }

  //draw call

  setupEventListeners() {
    this.stage.on('mousedown touchstart', (e) => {
      const pos = this.stage.getPointerPosition();
      if (pos) {
        if (this.currentMode === 'select') {
          if (e.target === this.stage) {
            this.drawingService.startSelection(pos);
          } else {
            this.drawingService.startDragging(pos);
          }
        } else {
          this.drawingService.startDrawing(pos);
        }
      }
    });

    this.stage.on('mousemove touchmove', (e) => {
      const pos = this.stage.getPointerPosition();
      if (pos) {
        if (this.currentMode === 'select') {
          if (this.drawingService.isDragging) {
            this.drawingService.continueDragging(pos);
          } else {
            this.drawingService.updateSelection(pos);
          }
        } else {
          this.drawingService.continueDrawing(pos);
        }
      }
    });

    this.stage.on('mouseup touchend', () => {
      if (this.currentMode === 'select') {
        if (this.drawingService.isDragging) {
          this.drawingService.stopDragging();
        } else {
          this.drawingService.endSelection();
        }
      } else {
        this.drawingService.stopDrawing();
      }
    });

    this.stage.on('click tap', (e) => {
      if (this.currentMode === 'select' && !this.drawingService.isDragging) {
        const pos = this.stage.getPointerPosition();
        if (pos) {
          this.drawingService.selectShapeAtPoint(pos);
        }
      }
    });
  }
    setMode(mode: 'wall' | 'window' | 'door' | 'select' | null) {
      this.currentMode = mode;
      this.drawingService.setMode(mode);
    }

    deleteSelected() {
      this.drawingService.deleteSelectedShapes();
    }

    drawSquare() {
      // Draw a square starting at (100, 100) with side length 200
      this.autoDrawService.drawShape(this.segments); // Start drawing at (100, 100)
    }
    toggleDistanceLabels() {
      this.drawingService.toggleDistanceLabels();
    }

    convert2DTo3D() {
      // Clear existing 3D objects
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }

      // Re-add grid helper
      const gridSize = 70;
      const gridHelper = new THREE.GridHelper(gridSize, gridSize);
      this.scene.add(gridHelper);

      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0x404040);
      this.scene.add(ambientLight);

      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(1, 1, 1);
      this.scene.add(directionalLight);

      // Get all shapes from DrawingService
      const shapes = this.drawingService.getAllShapes();

      // Define wall height
      const wallHeight = 8.5; // 2.5 meters
      const wallWidth = 0.8;

      if (shapes.length === 0) {
        return; // No shapes to convert
      }

      // Find the bounding box of the 2D drawing
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      shapes.forEach(shapeInfo => {
        if (shapeInfo.shape instanceof Konva.Line) {
          const points = shapeInfo.shape.points();
          minX = Math.min(minX, points[0], points[2]);
          maxX = Math.max(maxX, points[0], points[2]);
          minY = Math.min(minY, points[1], points[3]);
          maxY = Math.max(maxY, points[1], points[3]);
        }
      });

      // Calculate the dimensions of the 2D drawing
      const width = maxX - minX;
      const depth = maxY - minY;

      // If width or depth is zero (single line scenario), set it to a minimum value to avoid division by zero
      const adjustedWidth = width === 0 ? 1 : width;
      const adjustedDepth = depth === 0 ? 1 : depth;

      // Calculate scale factors for width and depth separately
      const scaleFactorX = gridSize / adjustedWidth;
      const scaleFactorY = gridSize / adjustedDepth;

      // Create and add floor
      const floorGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
      const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = Math.PI / 2;
      this.scene.add(floor);



  const doorHeight = 7; // Slightly shorter than walls
  const windowHeight = 4;
  const windowElevation = 3;
  shapes.forEach(shapeInfo => {
    let start: THREE.Vector3, end: THREE.Vector3;

    if (shapeInfo.shape instanceof Konva.Line) {
      const points = shapeInfo.shape.points();
      start = this.pointToVector3(points[0], points[1], minX, minY, scaleFactorX, scaleFactorY, gridSize);
      end = this.pointToVector3(points[2], points[3], minX, minY, scaleFactorX, scaleFactorY, gridSize);
    } else if (shapeInfo.shape instanceof Konva.Group) {
      start = this.pointToVector3(shapeInfo.startCircle.x(), shapeInfo.startCircle.y(), minX, minY, scaleFactorX, scaleFactorY, gridSize);
      end = this.pointToVector3(shapeInfo.endCircle.x(), shapeInfo.endCircle.y(), minX, minY, scaleFactorX, scaleFactorY, gridSize);
    } else {
      console.warn('Unsupported shape type:', shapeInfo.shape);
      return;
    }

    switch (this.getShapeType(shapeInfo.shape)) {
      case 'wall':
        this.drawWall(start, end, wallHeight, wallWidth);
        break;
      case 'door':
        this.drawDoor(start, end, doorHeight, wallWidth, 0x00ff00); // Green color
        break;
      case 'window':
        this.drawWindow(start, end, windowHeight, wallWidth, windowElevation, 0x0000ff); // Blue color
        break;
    }
  });

      // Adjust camera position
      this.camera.position.set(0, gridSize / 2, gridSize);
      this.camera.lookAt(0, 0, 0);

      // Update the controls target
      this.controls.target.set(0, 0, 0);

      // Update the render
      this.renderer.render(this.scene, this.camera);
    }



    private pointToVector3(x: number, y: number, minX: number, minY: number, scaleFactorX: number, scaleFactorY: number, gridSize: number): THREE.Vector3 {
      return new THREE.Vector3(
        (x - minX) * scaleFactorX - gridSize / 2,
        0,
        (y - minY) * scaleFactorY - gridSize / 2
      );
    }

    private getShapeType(shape: Konva.Shape | Konva.Group): 'wall' | 'window' | 'door' | 'unknown' {
      if (shape instanceof Konva.Line) {
        return 'wall';
      } else if (shape instanceof Konva.Group) {
        const children = shape.getChildren();
        if (children[0] instanceof Konva.Line && children[1] instanceof Konva.Line) {
          return 'window';
        } else if (children[0] instanceof Konva.Arc && children[1] instanceof Konva.Line) {
          return 'door';
        }
      }
      return 'unknown';
    }




    private drawWall(start: THREE.Vector3, end: THREE.Vector3, wallHeight: number, wallWidth: number) {
      // Create wall
      const wallLength = start.distanceTo(end);
      const wallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallWidth);
      const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);

      // Position the wall
      const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      wall.position.set(midpoint.x, wallHeight / 2, midpoint.z);

      // Rotate the wall to align with the line
      const angle = Math.atan2(end.z - start.z, end.x - start.x);
      wall.rotation.y = -angle;

      this.scene.add(wall);
    }

    private drawDoor(start: THREE.Vector3, end: THREE.Vector3, doorHeight: number, wallWidth: number, color: number) {
      const doorLength = start.distanceTo(end);
      const doorThickness = 0.05; // Thickness of the door panel
      const doorFrameWidth = 0.1; // Width of the door frame
      const handleLength = 0.2; // Length of the handle
      const handleRadius = 0.02; // Radius of the handle
      const handleOffsetY = 1.0; // Height offset for the handle from the bottom of the door

      // Create door frame
      const frameGeometry = new THREE.BoxGeometry(doorLength, doorHeight, wallWidth);
      const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown color for frame
      const frame = new THREE.Mesh(frameGeometry, frameMaterial);

      // Create door panel
      const panelGeometry = new THREE.BoxGeometry(doorLength - 2 * doorFrameWidth, doorHeight - doorFrameWidth, doorThickness);
      const panelMaterial = new THREE.MeshLambertMaterial({ color: color });
      const panel = new THREE.Mesh(panelGeometry, panelMaterial);

      // Position the panel within the frame
      panel.position.set(0, 0, -wallWidth / 2 + doorThickness / 2);

      // Create door handle
      const handleGeometry = new THREE.CylinderGeometry(handleRadius, handleRadius, handleLength, 32);
      const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 }); // Black color for handle
      const handle = new THREE.Mesh(handleGeometry, handleMaterial);

      // Position the handle on the door panel
      handle.rotation.z = Math.PI / 2;
      handle.position.set(doorLength / 2 - doorFrameWidth - handleLength / 2, -doorHeight / 2 + handleOffsetY, -wallWidth / 2 + doorThickness);

      // Create a group to hold the frame, panel, and handle
      const doorGroup = new THREE.Group();
      doorGroup.add(frame);
      doorGroup.add(panel);
      doorGroup.add(handle);

      // Position the door group
      const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      doorGroup.position.set(midpoint.x, doorHeight / 2, midpoint.z);

      // Rotate the door group to align with the wall
      const angle = Math.atan2(end.z - start.z, end.x - start.x);
      doorGroup.rotation.y = -angle;

      this.scene.add(doorGroup);
    }


    private drawWindow(start: THREE.Vector3, end: THREE.Vector3, windowHeight: number, wallWidth: number, elevation: number, color: number) {
      const windowLength = start.distanceTo(end);
      const windowGeometry = new THREE.BoxGeometry(windowLength, windowHeight, wallWidth);
      const windowMaterial = new THREE.MeshLambertMaterial({ color: color, transparent: true, opacity: 0.5 });
      const window = new THREE.Mesh(windowGeometry, windowMaterial);

      const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      window.position.set(midpoint.x, elevation + windowHeight / 2, midpoint.z);

      const angle = Math.atan2(end.z - start.z, end.x - start.x);
      window.rotation.y = -angle;

      this.scene.add(window);
    }
  }
