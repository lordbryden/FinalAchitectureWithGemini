import * as THREE from 'three';

import { Component, ElementRef, ViewChild } from '@angular/core';
import { Line, LineBasicMaterial } from 'three';
import { Subscription } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { AutoDrawService } from '../services/auto-draw.service';
import { CSG } from 'three-csg-ts';
import { ColorService } from '../services/color.service';
import { DrawingService } from '../services/drawing.service';
import { GeminiService } from '../services/gemini.service';
import { GridService } from '../services/grid.service';
import Konva from 'konva';
import { LoadingController, MenuController, Platform } from '@ionic/angular';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';

import { ActivatedRoute, Router } from '@angular/router';
import { SaveDrawingService } from '../services/save-drawing.service';
import { AlertController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';


@Component({
  selector: 'app-drawing',
  templateUrl: './drawing.page.html',
  styleUrls: ['./drawing.page.scss'],
})
export class DrawingPage {
  @ViewChild('container', { static: true }) containerRef!: ElementRef;
  @ViewChild('threeContainer', { static: true }) threeContainerRef!: ElementRef;

  private stage!: Konva.Stage;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  public isRoofVisible: boolean = true;
  private roof: THREE.Mesh | null = null;
  currentMode: 'wall' | 'window' | 'door' | 'select' | null = null;
  private walls: THREE.Mesh[] = [];
  private dimentionToggle = false;
  private gridToggle = false;
  public wallHeight: number = 4000; // 5 meters in centimeters
  public wallWidth: number = 300; // 30 centimeters
  public doorHeight: number = 2000; // 3 meters in centimeters
  public windowHeight: number = 1500; // Default window height in centimeters

  currentWallColor: string;
  currentDoorColor: string;
  currentWindowColor: string;
  currentRoofColor: string;

  public alertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
      handler: () => {
        console.log('Alert canceled');
      },
    },
    {
      text: 'save',
      role: 'confirm',
      handler: () => {
        this.performSave();
      },
    },
  ];


  segment1 =[["A1", "A2", "External wall 1", "wall", "12000", "0"], ["A2", "A3", "External wall 2", "wall", "10000", "90"], ["A3", "A4", "External wall 3", "wall", "12000", "180"], ["A4", "A1", "External wall 4", "wall", "10000", "270"], ["A2", "A5", "internal wall 1", "wall", "5500", "180"], ["A5", "A6", "internal wall 2", "wall", "4800", "90"], ["A6", "A7", "internal wall 3", "wall", "5500", "0"], ["A3", "A10", "internal wall 4", "wall", "5500", "180"], ["A10", "A9", "internal wall 5", "wall", "3700", "270"], ["A9", "A8", "internal wall 6", "wall", "5500", "0"], ["A9", "A11", "internal wall 7", "wall", "2000", "0"], ["A11", "A12", "internal wall 8", "wall", "2000", "270"], ["A1", "A13", "internal wall 9", "wall", "3500", "0"], ["A13", "A14", "internal wall 10", "wall", "4800", "90"], ["A14", "A15", "internal wall 11", "wall", "3500", "180"], ["A4", "A17", "Door 1", "door", "2000", "0"], ["A9", "A11", "Door 2", "door", "1200", "0"], ["A11", "A32", "internal wall 12", "wall", "400", "270"], ["A32", "A16", "Door 3", "door", "800", "270"], ["A6", "A12", "Door 4", "door", "1200", "0"], ["A13", "A18", "internal wall 13", "wall", "1600", "90"], ["A18", "A19", "door 5", "door", "1800", "90"], ["A10", "A20", "internal wall 14", "wall", "800", "180"], ["A20", "A21", "Window 1", "window", "2000", "180"], ["A3", "A22", "internal wall 15", "wall", "800", "270"], ["A22", "A23", "Window 2", "window", "1800", "270"], ["A8", "A24", "internal wall 16", "wall", "500", "270"], ["A24", "A25", "Window 3", "window", "800", "270"], ["A7", "A26", "internal wall 17", "wall", "1000", "270"], ["A26", "A27", "Window 4", "window", "2000", "270"], ["A5", "A28", "internal wall 18", "wall", "1000", "180"], ["A28", "A29", "Window 5", "window", "1500", "180"], ["A1", "A30", "internal wall 19", "wall", "1000", "90"], ["A30", "A31", "Window 6", "window", "2000", "90"]
]


   drawingId: string = '0';
   drawingTitle: string = '';
  drawingDescription: string = '';
  generatedContent: any = '';
  public lengthScaleFactor: number = 1.7;
  private backButtonSubscription!: Subscription;
  private hasChanges: boolean = false;
  message: string = '';
  firstMenu: boolean = true;

  public alertInputs = [
    {
      placeholder: 'Title',
      binding: 'drawingTitle',
    },
    {
      placeholder: 'Description (max 30 characters)',
      attributes: {
        maxlength: 30,
      },
      binding: 'drawingDescription',
    },
  ];
  constructor(
    private gridService: GridService,
    public drawingService: DrawingService,
    private autoDrawService: AutoDrawService,
    private colorService: ColorService,
    private geminiService: GeminiService,
    private menuCtrl: MenuController,
    private route: ActivatedRoute,
    private saveService: SaveDrawingService,
    private alertController: AlertController,
    private router : Router,
    private platform: Platform,
    private authService: AuthService,
    private loadingController: LoadingController



  ) {
    this.currentWallColor = this.colorService.DEFAULT_WALL_COLOR;
    this.currentDoorColor = this.colorService.DEFAULT_DOOR_COLOR;
    this.currentWindowColor = this.colorService.DEFAULT_WINDOW_COLOR;
    this.currentRoofColor = this.colorService.DEFAULT_ROOF_COLOR;
  }
  currentScale: number = this.drawingService.getScale();

  updateScale() {
    this.drawingService.setScale(this.currentScale);
  }
  openMenu() {
    if (this.firstMenu) {
      this.openFirstMenu();
    } else {
      this.openSecondMenu();
    }
  }
  openSecondMenu() {
    /**
     * Open the menu by menu-id
     * We refer to the menu using an ID
     * because multiple "start" menus exist.
     */

    this.menuCtrl.open('second-menu');
  }

  getDimensionsIcon() {
    return this.dimentionToggle ? 'toggle-on' : 'toggle-off';
  }

  getGridIcon() {
    return this.gridToggle ? 'toggle-on' : 'toggle-off';
  }
  closeSecondMenu() {
    this.menuCtrl.close('second-menu');
  }
  openFirstMenu() {
    /**
     * Open the menu by menu-id
     * We refer to the menu using an ID
     * because multiple "start" menus exist.
     */

    this.menuCtrl.open('first-menu');
  }
  sendMessage() {
    console.log('Message sent:', this.message);
    // Implement your send logic here
    this.message = '';
  }

  undo() {
    console.log('Undo clicked');
    // Implement your undo logic here
  }

  redo() {
    console.log('Redo clicked');
    // Implement your redo logic here
  }
  closeFirstMenu() {
    this.menuCtrl.close('first-menu');
  }
  toggleGridMenu() {
    this.toggleGrid();
    this.closeFirstMenu();
    this.gridToggle = !this.gridToggle;
  }
  selectDoor() {
    this.setMode('door');
    this.closeFirstMenu();
  }
  selectWindow() {
    this.setMode('window');
    this.closeFirstMenu();
  }
  selectWall() {
    this.setMode('wall');
    this.closeFirstMenu();
  }
  selectMode() {
    this.setMode('select');
    this.closeFirstMenu();
  }
  deleteMode() {
    this.deleteSelected();
    this.closeFirstMenu();
  }
  transformTo3D() {
    this.convert2DTo3D();
    this.closeFirstMenu();

    if (this.firstMenu) {
      this.containerRef.nativeElement.style.display = 'none';
      this.threeContainerRef.nativeElement.style.display = 'block';
      console.log(3)
    }
    this.firstMenu = !this.firstMenu;

  }
  roofPlacement() {
    this.closeSecondMenu();
    this.toggleRoof();
  }
  toggleDimentionMode() {
    this.toggleDistanceLabels();
    this.closeFirstMenu();
    this.dimentionToggle = !this.dimentionToggle;
  }
  transformTo2D() {
    this.closeSecondMenu();
    this.containerRef.nativeElement.style.display = 'block';
    this.threeContainerRef.nativeElement.style.display = 'none';
    console.log(1)
    this.firstMenu = !this.firstMenu;

    // if(this.firstMenu){
    //   const element = this.containerRef.nativeElement.
    // }
  }
  toggleGridMode() {
    this.toggleGridMenu();
    this.closeFirstMenu();
    this.gridToggle = !this.gridToggle;
  }
  downloadPlan() {
    this.downloadFloorPlan();
    this.closeFirstMenu();
  }
  clearGrid() {
    this.onClearAllClick();
    this.closeFirstMenu();
  }
  ngOnInit() {
    // localStorage.clear()

    // this.authService.login();
    this.initializeStage();
    this.gridService.createGrid(this.stage);
    this.drawingService.setStage(this.stage);
    this.setupEventListeners();
    this.initializeThreeJS();

    this.colorService.wallColor$.subscribe((color) => {
      this.currentWallColor = color;
      this.updateWallColor(color);
    });
    this.colorService.doorColor$.subscribe((color) => {
      this.currentDoorColor = color;
      this.updateDoorColor(color);
    });
    this.colorService.windowColor$.subscribe((color) => {
      this.currentWindowColor = color;
      this.updateWindowColor(color);
    });
    this.colorService.roofColor$.subscribe((color) => {
      this.currentRoofColor = color;
      this.updateRoofColor(color);
    });

    this.route.paramMap.subscribe((params) => {
      this.drawingId = params.get('id') || '0';
      this.initializeDrawing();
      if(this.drawingId === '0') this.drawingService.clearAllDrawings();
    });
    this.containerRef.nativeElement.style.display = 'block';
    this.threeContainerRef.nativeElement.style.display = 'none';

  }

  ionViewDidEnter() {
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
      this.backToHome();
    });

  }


  async backToHome() {
    if (this.drawingId === '0') {
      // For new drawings
      if (this.hasChanges) {
        const alert = await this.alertController.create({
          header: 'Save Drawing',
          message: 'Do you want to save your drawing?',
          buttons: [
            {
              text: 'No',
              role: 'cancel',
              handler: () => {
                this.router.navigate(['/home']);
              }
            },
            {
              text: 'Yes',
              handler: () => {
                this.openSaveDialog('home');
              }
            }
          ]
        });

        await alert.present();
      } else {
        // No changes, navigate directly
        this.router.navigate(['/home']);
      }
    } else {
      // For existing drawings
      if (this.hasChanges) {
        const alert = await this.alertController.create({
          header: 'Save Changes',
          message: 'Do you want to save changes to your drawing?',
          buttons: [
            {
              text: 'No',
              role: 'cancel',
              handler: () => {
                this.router.navigate(['/home']);
              }
            },
            {
              text: 'Yes',
              handler: () => {
                this.saveDrawing();
                this.router.navigate(['/home']);
              }
            }
          ]
        });

        await alert.present();
      } else {
        // No changes, navigate directly
        this.router.navigate(['/home']);
      }
    }
  }
 saveDrawing() {
  if (this.drawingId === '0') {
    this.openSaveDialog('drawing');
  } else {
    this.performSave();
  }
}
async openSaveDialog(position : any) {
  const alert = await this.alertController.create({
    header: 'Save Drawing',
    inputs: [
      {
        name: 'title',
        type: 'text',
        placeholder: 'Title'
      },
      {
        name: 'description',
        type: 'text',
        placeholder: 'Description (max 30 characters)'
      }
    ],
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Save',
        handler: (data) => {
          this.drawingTitle = data.title;
          this.drawingDescription = data.description;
          this.performSave();
          if(position === 'home'){
            this.router.navigate(['/home'])
          }
        }
      }
    ]
  });

  await alert.present();
}
performSave() {
  if (this.drawingId === '0') {
    this.drawingId = Date.now().toString();
  }
  console.log('me')

  this.saveService.saveDrawingToSession(this.drawingId, this.drawingTitle, this.drawingDescription);
  this.hasChanges = false;  // Reset flag after saving

}

initializeDrawing() {
  if (this.drawingId === '0') {
    // New drawing, do nothing special
  } else if (parseInt(this.drawingId) < 10) {
    this.drawSquare(this.segment1);
  } else {
    const loadedData = this.loaddatafromstorage(this.drawingId);
    if (loadedData) {
      this.drawingTitle = loadedData.title;
      this.drawingDescription = loadedData.description;
      this.deserializeDrawing(loadedData.shapes);
      this.currentMode = 'select';
    } else {
      console.log('No saved drawing found for ID:', this.drawingId);
      // Optionally start a new drawing or show a message to the user
    }
  }
  this.hasChanges = false;  // Reset flag when loading a drawing
}

  deserializeDrawing(serializedData: string) {
    console.log('Deserializing drawing data:', serializedData);
    const shapes = JSON.parse(serializedData);
    this.drawingService.clearAllDrawings();
    shapes.forEach((shape: any, index: number) => {
      console.log(`Recreating shape ${index}:`, shape);
      this.recreateShape(shape);
    });
    const layer = this.drawingService.getLayer();
    layer.batchDraw();
  }

  private recreateShape(shapeData: any) {
    console.log('Recreating shape:', shapeData);
    const startPos = this.stage.getPointerPosition() || { x: 0, y: 0 };
    startPos.x = shapeData.start.x;
    startPos.y = shapeData.start.y;
    const endPos = { x: shapeData.end.x, y: shapeData.end.y };

    this.drawingService.setMode(shapeData.type);
    this.drawingService.startDrawing(startPos);
    this.drawingService.continueDrawing(endPos);
    this.drawingService.stopDrawing();
  }

  loaddatafromstorage(id: string) {
    console.log(id);
    const item = localStorage.getItem(`${id}`);
    if (item) {
      console.log(item);
      return JSON.parse(item);
    }
    return null;
  }
  initializeStage() {
    // const screenSize = Math.max(window.innerWidth, window.innerHeight);
    const screen =( window.innerWidth + window.innerHeight)/1.7 ;
    // const stageSize = screenSize; // You can adjust this multiplier as needed

    this.stage = new Konva.Stage({
      container: this.containerRef.nativeElement,
      width: screen,
      height: screen,
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.threeContainerRef.nativeElement.appendChild(this.renderer.domElement);

    // Add orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Add a grid helper
    this.createGridFloor();

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 1); // Increase intensity from 0.5 to 1
    this.scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    this.animate();
  }

  private createGridFloor() {
    const gridHelper = new THREE.GridHelper(50, 50);
    this.scene.add(gridHelper);
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
            this.hasChanges = true;  // Set flag when changes occur
          } else {
            this.drawingService.updateSelection(pos);
          }
        } else {
          this.drawingService.continueDrawing(pos);
          this.hasChanges = true;  // Set flag when changes occur
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

  async drawSquare(segment: any) {
    // Draw a square starting at (100, 100) with side length 200
    this.drawingService.clearAllDrawings();
    await this.autoDrawService.drawShape(segment); // Start drawing at (100, 100)

    this.currentScale = this.autoDrawService.checkShapeSize();

    this.setMode('select');
  }
  toggleDistanceLabels() {
    this.drawingService.toggleDistanceLabels();
  }

  convert2DTo3D() {
    // Clear existing 3D objects
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    this.walls = [];
    this.scene.background = new THREE.Color(0xf0f0f0);

    const shapes = this.drawingService.getAllShapes();
    const wallPoints: THREE.Vector3[] = [];

    if (shapes.length === 0) {
      return;
    }

    const wallDimensions = {
      minX: Infinity,
      maxX: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity,
    };

    const canvasWidth = this.stage.width();
    const canvasHeight = this.stage.height();
    const sceneWidth = 12000 * this.lengthScaleFactor;
    const sceneHeight = 12000 * this.lengthScaleFactor;
    const scaleX = sceneWidth / canvasWidth;
    const scaleZ = sceneHeight / canvasHeight;

    // Create and add grid floor
    // const gridSize = Math.max(sceneWidth, sceneHeight);
    const gridDivisions = 20 * this.lengthScaleFactor;
    const gridHelper = new THREE.GridHelper(
      50000,
      gridDivisions,
      0x000000,
      0x000000
    );
    gridHelper.position.set(sceneWidth, 0, sceneHeight);
    this.scene.add(gridHelper);
    // this.createGridFloor();
    // Add lights
    this.addLights(sceneWidth, sceneHeight);

    const wallHeight = this.wallHeight;
    const wallWidth = this.wallWidth;
    const doorHeight = this.doorHeight;
    const windowHeight = this.windowHeight;
    const windowElevation = 60;

    // First pass: Create all walls
    shapes.forEach((shapeInfo) => {
      if (this.getShapeType(shapeInfo.shape) === 'wall') {
        const [start, end] = this.getShapePoints(
          shapeInfo,
          canvasWidth,
          canvasHeight,
          scaleX,
          scaleZ
        );
        this.drawWall(start, end, wallHeight, wallWidth);
        this.updateWallDimensions(wallDimensions, start, end);
        wallPoints.push(start, end);
      }
    });
    // Second pass: Create doors and windows, and cut out from walls
    shapes.forEach((shapeInfo) => {
      const shapeType = this.getShapeType(shapeInfo.shape);
      if (shapeType === 'door' || shapeType === 'window') {
        const [start, end] = this.getShapePoints(
          shapeInfo,
          canvasWidth,
          canvasHeight,
          scaleX,
          scaleZ
        );
        if (shapeType === 'door') {
          this.drawDoor(
            start,
            end,
            doorHeight,
            wallWidth,
            wallHeight,
            0x00ff00
          );
          this.cutOutFromWalls(start, end, doorHeight, 0, wallHeight);
        } else {
          this.drawWindow(
            start,
            end,
            windowHeight,
            wallWidth,
            wallHeight,
            0x0000ff
          );
          const windowElevation = (wallHeight - windowHeight) / 2;
          this.cutOutFromWalls(
            start,
            end,
            windowHeight,
            windowElevation,
            wallHeight
          );
        }
      }
    });
    this.walls.forEach((wall) => {
      if (wall.geometry instanceof THREE.BufferGeometry) {
        const boundingBox = new THREE.Box3().setFromObject(wall);
        this.updateWallDimensions(
          wallDimensions,
          new THREE.Vector3(boundingBox.min.x, 0, boundingBox.min.z),
          new THREE.Vector3(boundingBox.max.x, 0, boundingBox.max.z)
        );
      }
    });

    const center = this.calculateCenterPoint(wallPoints);
    this.addRedSphere(center);
    this.createRoof(wallDimensions);

    // Adjust camera and controls
    this.adjustCameraAndControls(sceneWidth, sceneHeight);

    // Update the render
    this.renderer.render(this.scene, this.camera);
  }

  private updateWallDimensions(
    wallDimensions: any,
    start: THREE.Vector3,
    end: THREE.Vector3
  ) {
    wallDimensions.minX = Math.min(wallDimensions.minX, start.x, end.x);
    wallDimensions.maxX = Math.max(wallDimensions.maxX, start.x, end.x);
    wallDimensions.minZ = Math.min(wallDimensions.minZ, start.z, end.z);
    wallDimensions.maxZ = Math.max(wallDimensions.maxZ, start.z, end.z);
  }

  updateLengthScale() {
    // Remove existing 3D objects
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    this.walls = [];

    // Re-convert 2D to 3D with new scale factor
    this.convert2DTo3D();
  }

  onClearAllClick() {
    this.drawingService.clearAllDrawings();
  }

  private getShapePoints(
    shapeInfo: any,
    canvasWidth: number,
    canvasHeight: number,
    scaleX: number,
    scaleZ: number
  ): [THREE.Vector3, THREE.Vector3] {
    let start: THREE.Vector3, end: THREE.Vector3;

    if (shapeInfo.shape instanceof Konva.Line) {
      const points = shapeInfo.shape.points();
      start = this.pointToVector3(
        points[0],
        points[1],
        canvasWidth,
        canvasHeight,
        scaleX,
        scaleZ
      );
      end = this.pointToVector3(
        points[2],
        points[3],
        canvasWidth,
        canvasHeight,
        scaleX,
        scaleZ
      );
    } else if (shapeInfo.shape instanceof Konva.Group) {
      start = this.pointToVector3(
        shapeInfo.startCircle.x(),
        shapeInfo.startCircle.y(),
        canvasWidth,
        canvasHeight,
        scaleX,
        scaleZ
      );
      end = this.pointToVector3(
        shapeInfo.endCircle.x(),
        shapeInfo.endCircle.y(),
        canvasWidth,
        canvasHeight,
        scaleX,
        scaleZ
      );
    } else {
      console.warn('Unsupported shape type:', shapeInfo.shape);
      start = end = new THREE.Vector3();
    }

    return [start, end];
  }

  // private cutOutFromWalls(start: THREE.Vector3, end: THREE.Vector3, height: number, elevation: number = 0) {
  //   const direction = new THREE.Vector3().subVectors(end, start).normalize();
  //   const length = start.distanceTo(end);
  //   const cutoutWidth = Math.max(10, length / 10); // Increase the width of the cutout

  //   // Create a slightly larger cutout geometry
  //   const cutoutGeometry = new THREE.BoxGeometry(length + cutoutWidth, height, cutoutWidth);

  //   this.walls.forEach(wall => {
  //     const wallBox = new THREE.Box3().setFromObject(wall);
  //     const cutoutMesh = new THREE.Mesh(cutoutGeometry);

  //     // Position the cutout
  //     cutoutMesh.position.set(
  //       (start.x + end.x) / 2,
  //       elevation + height / 2,
  //       (start.z + end.z) / 2
  //     );

  //     // Rotate the cutout to align with the wall
  //     cutoutMesh.rotation.y = Math.atan2(direction.z, direction.x);

  //     // Move the cutout slightly towards the camera to ensure it intersects the wall
  //     cutoutMesh.position.add(new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cutoutMesh.rotation.y));

  //     const cutoutBox = new THREE.Box3().setFromObject(cutoutMesh);

  //     if (wallBox.intersectsBox(cutoutBox)) {
  //       // Perform CSG operation
  //       const wallBSP = CSG.fromMesh(wall);
  //       const cutoutBSP = CSG.fromMesh(cutoutMesh);
  //       const newBSP = wallBSP.subtract(cutoutBSP);

  //       // Create new mesh from BSP result
  //       const newMesh = CSG.toMesh(newBSP, wall.matrix, wall.material);
  //       newMesh.name = 'wall';
  //       newMesh.userData = wall.userData;

  //       // Replace old wall with new one
  //       this.scene.remove(wall);
  //       this.scene.add(newMesh);
  //       this.walls[this.walls.indexOf(wall)] = newMesh;
  //     }
  //   });
  // }

  private addLights(sceneWidth: number, sceneHeight: number) {
    // Increase ambient light intensity
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    // Add hemisphere light for better overall illumination
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    this.scene.add(hemisphereLight);

    // Increase directional light intensities
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight1.position.set(
      sceneWidth / 2,
      sceneHeight,
      sceneHeight / 2
    );
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight2.position.set(
      -sceneWidth / 2,
      sceneHeight,
      -sceneHeight / 2
    );
    this.scene.add(directionalLight2);

    const directionalLight3 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight3.position.set(0, sceneHeight, 0);
    this.scene.add(directionalLight3);

    // Add a point light at the center for additional illumination
    const pointLight = new THREE.PointLight(0xffffff, 1, sceneWidth * 2);
    pointLight.position.set(sceneWidth / 2, sceneHeight / 2, sceneHeight / 2);
    this.scene.add(pointLight);
  }
  private adjustCameraAndControls(sceneWidth: number, sceneHeight: number) {
    const maxDimension = Math.max(sceneWidth, sceneHeight);
    this.camera.position.set(sceneWidth / 2, maxDimension / 1, sceneHeight * 2);
    this.camera.lookAt(sceneWidth / 2, 0, sceneHeight / 2);
    this.camera.near = 1;
    this.camera.far = maxDimension * 3;
    this.camera.updateProjectionMatrix();

    this.controls.target.set(sceneWidth / 2, 0, sceneHeight / 2);
    this.controls.update();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private drawWall(
    start: THREE.Vector3,
    end: THREE.Vector3,
    wallHeight: number,
    wallWidth: number
  ) {
    const wallLength = start.distanceTo(end);
    const wallGeometry = new THREE.BoxGeometry(
      wallLength,
      wallHeight,
      wallWidth
    );
    const wallMaterial = new THREE.MeshLambertMaterial({
      color: this.colorService.getCurrentWallColor(),
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);

    const midpoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    wall.position.set(midpoint.x, wallHeight / 2, midpoint.z);
    const angle = Math.atan2(end.z - start.z, end.x - start.x);
    wall.rotation.y = -angle;
    wall.name = 'wall';

    // Store original geometry for later use
    (wall.userData as any).originalGeometry = wallGeometry.clone();

    this.walls.push(wall);
    this.scene.add(wall);
  }

  private drawDoor(
    start: THREE.Vector3,
    end: THREE.Vector3,
    doorHeight: number,
    wallWidth: number,
    wallHeight: number,
    color: number
  ) {
    const doorLength = start.distanceTo(end);
    // Use exact wall width for the door
    const doorGeometry = new THREE.BoxGeometry(
      doorLength,
      doorHeight,
      wallWidth
    );
    const doorMaterial = new THREE.MeshLambertMaterial({
      color: this.colorService.getCurrentDoorColor(),
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);

    const midpoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    door.position.set(midpoint.x, doorHeight / 2, midpoint.z);
    const angle = Math.atan2(end.z - start.z, end.x - start.x);
    door.rotation.y = -angle;
    door.name = 'door';

    this.scene.add(door);
    this.createCutout(door, doorHeight, 0, wallHeight);
  }

  private drawWindow(
    start: THREE.Vector3,
    end: THREE.Vector3,
    windowHeight: number,
    wallWidth: number,
    wallHeight: number,
    color: number
  ) {
    const windowLength = start.distanceTo(end);
    // Use exact wall width for the window
    const windowGeometry = new THREE.BoxGeometry(
      windowLength,
      windowHeight,
      wallWidth
    );
    const windowMaterial = new THREE.MeshLambertMaterial({
      color: this.colorService.getCurrentWindowColor(),
      transparent: true,
      opacity: 0.5,
    });
    const window = new THREE.Mesh(windowGeometry, windowMaterial);

    const midpoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    const verticalCenter = wallHeight / 2;
    window.position.set(midpoint.x, verticalCenter, midpoint.z);
    const angle = Math.atan2(end.z - start.z, end.x - start.x);
    window.rotation.y = -angle;
    window.name = 'window';

    this.scene.add(window);
    this.createCutout(
      window,
      windowHeight,
      verticalCenter - windowHeight / 2,
      wallHeight
    );
  }

  private pointToVector3(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    scaleX: number,
    scaleZ: number
  ): THREE.Vector3 {
    return new THREE.Vector3(
      x * scaleX * this.lengthScaleFactor,
      0,
      y * scaleZ * this.lengthScaleFactor
    );
  }
  private cutOutFromWalls(
    start: THREE.Vector3,
    end: THREE.Vector3,
    height: number,
    elevation: number,
    wallHeight: number
  ) {
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const length = start.distanceTo(end);
    // Remove the extra width added to the cutout
    const cutoutGeometry = new THREE.BoxGeometry(
      length,
      height,
      this.wallWidth * 1.01
    );

    this.walls.forEach((wall) => {
      const wallBox = new THREE.Box3().setFromObject(wall);
      const cutoutMesh = new THREE.Mesh(cutoutGeometry);

      cutoutMesh.position.set(
        (start.x + end.x) / 2,
        elevation + height / 2,
        (start.z + end.z) / 2
      );

      cutoutMesh.rotation.y = Math.atan2(direction.z, direction.x);

      // Remove the slight offset towards the camera
      const cutoutBox = new THREE.Box3().setFromObject(cutoutMesh);

      if (wallBox.intersectsBox(cutoutBox)) {
        // Perform CSG operation
        const wallBSP = CSG.fromMesh(wall);
        const cutoutBSP = CSG.fromMesh(cutoutMesh);
        const newBSP = wallBSP.subtract(cutoutBSP);

        // Create new mesh from BSP result
        const newMesh = CSG.toMesh(newBSP, wall.matrix, wall.material);
        newMesh.name = 'wall';
        newMesh.userData = wall.userData;

        // Replace old wall with new one
        this.scene.remove(wall);
        this.scene.add(newMesh);
        this.walls[this.walls.indexOf(wall)] = newMesh;
      }
    });
  }

  // private pointToVector3(x: number, y: number, minX: number, minY: number, scaleFactorX: number, scaleFactorY: number, gridSize: number): THREE.Vector3 {
  //   return new THREE.Vector3(
  //     (x - minX) * scaleFactorX - gridSize / 2,
  //     0,
  //     (y - minY) * scaleFactorY - gridSize / 2
  //   );
  // }

  private createCutout(
    cutoutMesh: THREE.Mesh,
    height: number,
    elevation: number,
    wallHeight: number
  ) {
    const cutoutBox = new THREE.Box3().setFromObject(cutoutMesh);

    this.walls.forEach((wall, index) => {
      const wallBox = new THREE.Box3().setFromObject(wall);
      if (cutoutBox.intersectsBox(wallBox)) {
        const cutoutMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
        });
        const cutout = new THREE.Mesh(cutoutMesh.geometry, cutoutMaterial);
        cutout.position.copy(cutoutMesh.position);
        cutout.rotation.copy(cutoutMesh.rotation);
        cutout.scale.copy(cutoutMesh.scale);

        // Adjust the position of the cutout based on the wall height
        cutout.position.y = elevation + height / 2;

        wall.add(cutout);
      }
    });
  }

  private calculateCenterPoint(points: THREE.Vector3[]): THREE.Vector3 {
    const sum = points.reduce(
      (acc, point) => acc.add(point),
      new THREE.Vector3()
    );
    return sum.divideScalar(points.length);
  }

  private addRedSphere(position: THREE.Vector3) {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32); // Increased size for visibility
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      depthTest: false,
      transparent: true,
      opacity: 0.8,
    });
    const sphere = new THREE.Mesh(geometry, material);

    // Lift the sphere higher in the air
    const liftHeight = 30; // Adjust this value to lift the sphere higher or lower
    sphere.position.set(position.x, position.y + liftHeight, position.z);

    sphere.renderOrder = 1; // Ensure it's rendered on top of other objects
    this.scene.add(sphere);
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

  private createRoof(wallDimensions: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }) {
    const { minX, maxX, minZ, maxZ } = wallDimensions;
    let maxWallHeight = 0;

    // Find the maximum wall height
    this.walls.forEach((wall) => {
      if (wall.geometry instanceof THREE.BufferGeometry) {
        const boundingBox = new THREE.Box3().setFromObject(wall);
        maxWallHeight = Math.max(maxWallHeight, boundingBox.max.y);
      }
    });
    const houseWidth = maxX - minX;
    const houseLength = maxZ - minZ;
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    // Roof parameters
    const roofOverhang = 1000;
    const roofAngle = Math.PI / 5; // 30 degrees
    const roofHeight =
      (Math.max(houseWidth, houseLength) * Math.tan(roofAngle)) / 2;
    const roofThickness = 5;

    // Create roof geometry
    const roofGeometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      // Bottom vertices
      minX - roofOverhang,
      maxWallHeight,
      minZ - roofOverhang,
      maxX + roofOverhang,
      maxWallHeight,
      minZ - roofOverhang,
      centerX,
      maxWallHeight + roofHeight,
      centerZ,
      minX - roofOverhang,
      maxWallHeight,
      maxZ + roofOverhang,
      maxX + roofOverhang,
      maxWallHeight,
      maxZ + roofOverhang,
      // Top vertices
      minX - roofOverhang,
      maxWallHeight + roofThickness,
      minZ - roofOverhang,
      maxX + roofOverhang,
      maxWallHeight + roofThickness,
      minZ - roofOverhang,
      centerX,
      maxWallHeight + roofHeight + roofThickness,
      centerZ,
      minX - roofOverhang,
      maxWallHeight + roofThickness,
      maxZ + roofOverhang,
      maxX + roofOverhang,
      maxWallHeight + roofThickness,
      maxZ + roofOverhang,
    ]);

    const indices = new Uint16Array([
      // Bottom face
      0, 1, 2, 3, 4, 2, 0, 2, 3, 1, 4, 2,
      // Top face
      5, 7, 6, 8, 7, 9, 5, 8, 7, 6, 9, 7,
      // Side faces
      0, 5, 1, 1, 5, 6, 1, 6, 4, 4, 6, 9, 4, 9, 3, 3, 9, 8, 3, 8, 0, 0, 8, 5,
    ]);

    roofGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(vertices, 3)
    );
    roofGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
    roofGeometry.computeVertexNormals();

    const roofMaterial = new THREE.MeshPhongMaterial({
      color: this.colorService.getCurrentRoofColor(),
      side: THREE.DoubleSide,
    });

    if (this.roof) {
      this.scene.remove(this.roof);
    }

    this.roof = new THREE.Mesh(roofGeometry, roofMaterial);
    this.roof.visible = this.isRoofVisible; // Set visibility based on isRoofVisible
    this.roof.name = 'roof';

    this.scene.add(this.roof);

    console.log('Roof created with dimensions:', {
      minX,
      maxX,
      minZ,
      maxZ,
      maxWallHeight,
      roofHeight,
    });
  }
  toggleRoof() {
    this.isRoofVisible = !this.isRoofVisible;
    if (this.roof) {
      this.roof.visible = this.isRoofVisible;
    }
    // Re-render the scene
    this.renderer.render(this.scene, this.camera);
  }

  private updateWallColor(color: string) {
    this.walls.forEach((wall) => {
      if (wall.material instanceof THREE.MeshLambertMaterial) {
        wall.material.color.setStyle(color);
        wall.material.needsUpdate = true;
      }
    });
    this.renderer.render(this.scene, this.camera);
  }

  private updateDoorColor(color: string) {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.name === 'door') {
        if (object.material instanceof THREE.MeshLambertMaterial) {
          object.material.color.setStyle(color);
          object.material.needsUpdate = true;
        }
      }
    });
    this.renderer.render(this.scene, this.camera);
  }

  private updateWindowColor(color: string) {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.name === 'window') {
        if (object.material instanceof THREE.MeshLambertMaterial) {
          object.material.color.setStyle(color);
          object.material.needsUpdate = true;
        }
      }
    });
    this.renderer.render(this.scene, this.camera);
  }

  private updateRoofColor(color: string) {
    if (this.roof && this.roof.material instanceof THREE.MeshPhongMaterial) {
      this.roof.material.color.setStyle(color);
      this.roof.material.needsUpdate = true;
      this.renderer.render(this.scene, this.camera);
    }
  }

  onWallColorChange(event: Event) {
    const color = (event.target as HTMLInputElement).value;
    this.colorService.setWallColor(color);
  }

  onDoorColorChange(event: Event) {
    const color = (event.target as HTMLInputElement).value;
    this.colorService.setDoorColor(color);
  }

  onWindowColorChange(event: Event) {
    const color = (event.target as HTMLInputElement).value;
    this.colorService.setWindowColor(color);
  }

  onRoofColorChange(event: Event) {
    const color = (event.target as HTMLInputElement).value;
    this.colorService.setRoofColor(color);
  }
  resetColors() {
    this.colorService.resetAllColors();
  }

  downloadFloorPlan() {
    this.drawingService.downloadImage('my_floor_plan.png');
  }

  export3DModel(format: 'stl' | 'obj') {
    let result: string;
    if (format === 'stl') {
      const exporter = new STLExporter();
      result = exporter.parse(this.scene);
    } else {
      const exporter = new OBJExporter();
      result = exporter.parse(this.scene);
    }

    const blob = new Blob([result], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `3d_model.${format}`;
    link.click();
  }
    // result= [] ;
  // input = 'draw a 2 room house';
  // prediction: string | null = null;
  // async  runModel() {
  //   this.geminiService.predict(this.input).subscribe(
  //     response => {
  //       this.prediction = response;
  //     },
  //     error => {
  //       console.error('Error:', error);
  //     }
  //   );
  // }

  input: string = 'draw a 2 room house';
  response: string = '';
  async generateContent() {
    await this.simpleLoader('please wait ...');

    try {
      const response = await firstValueFrom(this.geminiService.generateContent(this.message));

      console.log(response);
      const segment1String = response.candidates[0].content.parts[0].text.trim();
      const segment1Array = this.convertToSingleArray(segment1String);

      if (segment1Array) {
        this.drawSquare(segment1Array);
      } else {
        alert('Something went wrong');
      }
    } catch (error) {
      console.error(error);
      alert('Error connecting');
    } finally {
      this.dismissLoader();
    }

  }

  convertToSingleArray(segmentString : any) {
    // Remove the "segment1 = " part and any leading/trailing whitespace
    const cleanedString = segmentString.replace(/^segment1\s*=\s*/, '').trim();

    // Remove the outer square brackets
    const innerContent = cleanedString.slice(1, -1);

    // Split the string into individual array strings
    const arrayStrings = innerContent.match(/\[([^\]]+)\]/g);

    // Convert each array string to an actual array
    const result = arrayStrings.map((str :any) => {
        // Remove the square brackets
        const content = str.slice(1, -1);

        // Split by comma, parse each element
        return content.split(',').map((item: any) => {
            item = item.trim().replace(/^['"]|['"]$/g, ''); // Remove quotes
            return isNaN(item) ? item : Number(item); // Convert to number if possible
        });
    });

    // Return the result as a single array named segment1
    return result;
}

async simpleLoader(message: string) {
  const loading = await this.loadingController.create({
    message: message
  });
  await loading.present();
}

async dismissLoader() {
  try {
    await this.loadingController.dismiss();
    console.log('Loader closed!');
  } catch (err) {
    console.log('Error occured : ', err);
  }
}
}
