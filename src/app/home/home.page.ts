import * as THREE from 'three';

import { Component, ElementRef, ViewChild } from '@angular/core';

import { AutoDrawService } from '../services/auto-draw.service';
import { DrawingService } from '../services/drawing.service';
import { GridService } from '../services/grid.service';
import Konva from 'konva';
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
    {
      start: 'A1',
      end: 'A2',
      name: 'External wall 1',
      type: 'wall',
      length: 1000,
      angle: 0,
    },
    {
      start: 'A2',
      end: 'A3',
      name: 'Parlor Door',
      type: 'door',
      length: 500,
      angle: 0,
    },
    {
      start: 'A3',
      end: 'A4',
      name: 'External Wall 2 ',
      type: 'wall',
      length: 3000,
      angle: 0,
    },
    {
      start: 'A1',
      end: 'A6',
      name: 'External Wall 3 ',
      type: 'wall',
      length: 3000,
      angle: 90,
    },
    {
      start: 'A2',
      end: 'A7',
      name: 'External Wall 3 ',
      type: 'wall',
      length: 3000,
      angle: 270,
    },
    {
      start: 'A4',
      end: 'A8',
      name: 'Window ',
      type: 'window',
      length: 3000,
      angle: 90,
    },
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
      height: window.innerHeight,
    });
  }

  initializeThreeJS() {
    // Create a scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Create a camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
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
  } // toogle gird call

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
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    shapes.forEach((shapeInfo) => {
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
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    this.scene.add(floor);

    const doorHeight = 7; // Slightly shorter than walls
    const windowHeight = 4;
    const windowElevation = 3;
    shapes.forEach((shapeInfo) => {
      let start: THREE.Vector3, end: THREE.Vector3;

      if (shapeInfo.shape instanceof Konva.Line) {
        const points = shapeInfo.shape.points();
        start = this.pointToVector3(
          points[0],
          points[1],
          minX,
          minY,
          scaleFactorX,
          scaleFactorY,
          gridSize
        );
        end = this.pointToVector3(
          points[2],
          points[3],
          minX,
          minY,
          scaleFactorX,
          scaleFactorY,
          gridSize
        );
      } else if (shapeInfo.shape instanceof Konva.Group) {
        start = this.pointToVector3(
          shapeInfo.startCircle.x(),
          shapeInfo.startCircle.y(),
          minX,
          minY,
          scaleFactorX,
          scaleFactorY,
          gridSize
        );
        end = this.pointToVector3(
          shapeInfo.endCircle.x(),
          shapeInfo.endCircle.y(),
          minX,
          minY,
          scaleFactorX,
          scaleFactorY,
          gridSize
        );
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
          this.drawWindow(
            start,
            end,
            windowHeight,
            wallWidth,
            windowElevation,
            0x0000ff
          ); // Blue color
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

  private pointToVector3(
    x: number,
    y: number,
    minX: number,
    minY: number,
    scaleFactorX: number,
    scaleFactorY: number,
    gridSize: number
  ): THREE.Vector3 {
    return new THREE.Vector3(
      (x - minX) * scaleFactorX - gridSize / 2,
      0,
      (y - minY) * scaleFactorY - gridSize / 2
    );
  }

  private getShapeType(
    shape: Konva.Shape | Konva.Group
  ): 'wall' | 'window' | 'door' | 'unknown' {
    if (shape instanceof Konva.Line) {
      return 'wall';
    } else if (shape instanceof Konva.Group) {
      const children = shape.getChildren();
      if (
        children[0] instanceof Konva.Line &&
        children[1] instanceof Konva.Line
      ) {
        return 'window';
      } else if (
        children[0] instanceof Konva.Arc &&
        children[1] instanceof Konva.Line
      ) {
        return 'door';
      }
    }
    return 'unknown';
  }

  private drawWall(
    start: THREE.Vector3,
    end: THREE.Vector3,
    wallHeight: number,
    wallWidth: number
  ) {
    // Create wall
    const wallLength = start.distanceTo(end);
    const wallGeometry = new THREE.BoxGeometry(
      wallLength,
      wallHeight,
      wallWidth
    );
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);

    // Position the wall
    const midpoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    wall.position.set(midpoint.x, wallHeight / 2, midpoint.z);

    // Rotate the wall to align with the line
    const angle = Math.atan2(end.z - start.z, end.x - start.x);
    wall.rotation.y = -angle;

    this.scene.add(wall);
  }

  private drawDoor(
    start: THREE.Vector3,
    end: THREE.Vector3,
    doorHeight: number,
    wallWidth: number,
    color: number,
    frameColor = '0xc3b091'
  ) {
    const doorLength = start.distanceTo(end);
    const doorThickness = 0.8; // Thickness of the door panel
    const doorFrameWidth = 0.1; // Width of the door frame
    const handleLength = 0.2; // Length of the handle
    const handleRadius = 0.02; // Radius of the handle
    const handleOffsetY = 1.0; // Height offset for the handle from the bottom of the door
    const frameThickness = 0.1;
    // Create door frame
    const frameGeometry = new THREE.BoxGeometry(
      doorLength + frameThickness,
      doorHeight + frameThickness,
      wallWidth + 0.1
    );
    // Position the door group
    const midpoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);

    const frameMaterial = new THREE.MeshBasicMaterial({ color: frameColor });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);

    // frame.position.set(midpoint.x, doorHeight / 2, midpoint.z);

    // Create door panel
    const panelGeometry = new THREE.BoxGeometry(
      doorLength - frameThickness,
      doorHeight,
      wallWidth + 0.2
    );
    const panelMaterial = new THREE.MeshBasicMaterial({ color: color });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);

    const upperWallGeometry = new THREE.BoxGeometry(
      doorLength,
      8.5 - doorHeight,
      wallWidth
    );
    const upperWallMaterial = new THREE.MeshBasicMaterial({ color: 0x484848 });
    const upperWall = new THREE.Mesh(upperWallGeometry, upperWallMaterial);

    upperWall.position.y = doorHeight / 2 + 0.75;

    // Create door handle

    const handle = new THREE.Group();

    // Handle base
    const handleBaseGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32);
    const handleBaseMaterial = new THREE.MeshLambertMaterial({
      color: 0x000000,
    }); // Black color for handle base
    const handleBase = new THREE.Mesh(handleBaseGeometry, handleBaseMaterial);
    handleBase.rotation.x = Math.PI / 2;
    handleBase.position.set(
      doorLength / 2 - 0.1,
      doorHeight / 8 - 0.2,
      wallWidth
    );

    // Handle grip stripe
    const handleGripGeometrys = new THREE.CylinderGeometry(0.01, 0.1, 0.05, 32);
    const handleGripMaterials = new THREE.MeshLambertMaterial({
      color: 0x000000,
    }); // Black color for handle grip
    const handleGrips = new THREE.Mesh(
      handleGripGeometrys,
      handleGripMaterials
    );
    // handleGrips.rotation.z = Math.PI / 2;
    handleGrips.position.set(
      doorLength / 2 - 0.1,
      doorHeight / 8 - 0.2,
      wallWidth + 0.09
    );

    // Handle grip
    const handleGripGeometry = new THREE.CylinderGeometry(0.07, 0.07, 1, 32);
    const handleGripMaterial = new THREE.MeshLambertMaterial({
      color: 0x000000,
    }); // Black color for handle grip
    const handleGrip = new THREE.Mesh(handleGripGeometry, handleGripMaterial);
    handleGrip.rotation.z = Math.PI / 2;
    handleGrip.position.set(
      doorLength / 2 - 0.3,
      doorHeight / 8 - 0.2,
      wallWidth
    );

    // Keyhole
    const keyholeGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.02, 32);
    const keyholeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 }); // Black color for keyhole
    const keyhole = new THREE.Mesh(keyholeGeometry, keyholeMaterial);
    keyhole.rotation.x = Math.PI / 2;
    keyhole.position.set(-0.04, 0, 0.01);

    handle.add(handleBase);
    handle.add(handleGrip);
    handle.add(keyhole);
    handle.add(handleGrips);
    const handle2 = handle.clone();
    handle2.position.set(0, 0, -wallWidth - 0.7);

    // Create a group to hold the frame, panel, and handle
    const doorGroup = new THREE.Group();
    doorGroup.add(frame);
    doorGroup.add(panel);
    doorGroup.add(handle);
    doorGroup.add(upperWall);
    doorGroup.add(handle2);

    // Position the door group

    doorGroup.position.set(midpoint.x, doorHeight / 2, midpoint.z);

    // Rotate the door group to align with the wall
    const angle = Math.atan2(end.z - start.z, end.x - start.x);
    doorGroup.rotation.y = -angle;

    this.scene.add(doorGroup);
  }

  private drawWindow(
    start: THREE.Vector3,
    end: THREE.Vector3,
    windowHeight: number,
    wallWidth: number,
    elevation: number,
    color: number,
    frameColor = '0xc3b091'
  ) {
    const wallLength = start.distanceTo(end);
    const frameWidth = 1.2;
    const frameHeight = 1.5;
    const frameThickness = 0.2;
    const glassThickness = 0.02;

    const windowGroup = new THREE.Group();

    // Create window frame
    const frameMaterial = new THREE.MeshLambertMaterial({ color: frameColor });

    // Top frame
    const topFrameGeometry = new THREE.BoxGeometry(
      wallLength,
      frameThickness,
      frameThickness
    );
    const topFrame = new THREE.Mesh(topFrameGeometry, frameMaterial);
    topFrame.position.set(0, windowHeight, 0);

    // Bottom frame
    const bottomFrame = topFrame.clone();
    bottomFrame.position.set(0, 0, 0);

    // Left frame
    const sideFrameGeometry = new THREE.BoxGeometry(
      frameThickness,
      windowHeight,
      frameThickness
    );
    const leftFrame = new THREE.Mesh(sideFrameGeometry, frameMaterial);
    leftFrame.position.set(-wallLength / 2, windowHeight / 2, 0);

    // Right frame
    const rightFrame = leftFrame.clone();
    rightFrame.position.set(wallLength / 2, windowHeight / 2, 0);

    // Create glass pane
    const glassGeometry = new THREE.PlaneGeometry(
      wallLength - frameThickness,
      windowHeight - frameThickness
    );
    const glassMaterial = new THREE.MeshLambertMaterial({
      color: color,
      transparent: true,
      opacity: 0.5,
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.set(0, windowHeight / 2, frameThickness / 2);

    const glass2 = glass.clone();
    glass.position.set(0, windowHeight / 2, -frameThickness * 2);

    // Add frame and glass to window group
    windowGroup.add(topFrame);
    windowGroup.add(bottomFrame);
    windowGroup.add(leftFrame);
    windowGroup.add(rightFrame);
    windowGroup.add(glass);
    windowGroup.add(glass2);
    const midpoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    windowGroup.position.set(midpoint.x, windowHeight / 2, midpoint.z);
    const angle = Math.atan2(end.z - start.z, end.x - start.x);
    windowGroup.rotation.y = -angle;
    this.scene.add(windowGroup);
  }
}
