import { Component, ElementRef, ViewChild } from '@angular/core';

import { AutoDrawService } from '../services/auto-draw.service';
import { DrawingService } from '../services/drawing.service';
import { GridService } from '../services/grid.service';
import Konva from 'konva';
import { Router } from '@angular/router';
import { SaveDrawingService } from '../services/save-drawing.service';


interface Design {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
}
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  // preBuiltDesigns = [
  //   {
  //     image: 'assets/first.jpg',
  //     title: 'Design 1',
  //     description: 'A beautiful modern house.',
  //   },
  //   {
  //     image: 'assets/first.jpg',
  //     title: 'Design 2',
  //     description: 'Classic style with spacious rooms.',
  //   },
  //   // Add more design objects as needed
  // ];

  previousDesigns: Design[] = [];
  savedDrawings: any;
  constructor(private router : Router , private drawingService: DrawingService , private saveService : SaveDrawingService) {}
  // Do not touch this commented code abeg

  // private drawDoor(
  //   start: THREE.Vector3,
  //   end: THREE.Vector3,
  //   doorHeight: number,
  //   wallWidth: number,
  //   color: number,
  //   frameColor = '0xc3b091'
  // ) {
  //   const doorLength = start.distanceTo(end);
  //   const doorThickness = 0.8; // Thickness of the door panel
  //   const doorFrameWidth = 0.1; // Width of the door frame
  //   const handleLength = 0.2; // Length of the handle
  //   const handleRadius = 0.02; // Radius of the handle
  //   const handleOffsetY = 1.0; // Height offset for the handle from the bottom of the door
  //   const frameThickness = 0.1;
  //   // Create door frame
  //   const frameGeometry = new THREE.BoxGeometry(
  //     doorLength + frameThickness,
  //     doorHeight + frameThickness,
  //     wallWidth + 0.1
  //   );
  //   // Position the door group
  //   const midpoint = new THREE.Vector3()
  //     .addVectors(start, end)
  //     .multiplyScalar(0.5);

  //   const frameMaterial = new THREE.MeshBasicMaterial({ color: frameColor });
  //   const frame = new THREE.Mesh(frameGeometry, frameMaterial);

  //   // frame.position.set(midpoint.x, doorHeight / 2, midpoint.z);

  //   // Create door panel
  //   const panelGeometry = new THREE.BoxGeometry(
  //     doorLength - frameThickness,
  //     doorHeight,
  //     wallWidth + 0.2
  //   );
  //   const panelMaterial = new THREE.MeshBasicMaterial({ color: color });
  //   const panel = new THREE.Mesh(panelGeometry, panelMaterial);

  //   const upperWallGeometry = new THREE.BoxGeometry(
  //     doorLength,
  //     8.5 - doorHeight,
  //     wallWidth
  //   );
  //   const upperWallMaterial = new THREE.MeshBasicMaterial({ color: 0x484848 });
  //   const upperWall = new THREE.Mesh(upperWallGeometry, upperWallMaterial);

  //   upperWall.position.y = doorHeight / 2 + 0.75;

  //   // Create door handle

  //   const handle = new THREE.Group();

  //   // Handle base
  //   const handleBaseGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32);
  //   const handleBaseMaterial = new THREE.MeshLambertMaterial({
  //     color: 0x000000,
  //   }); // Black color for handle base
  //   const handleBase = new THREE.Mesh(handleBaseGeometry, handleBaseMaterial);
  //   handleBase.rotation.x = Math.PI / 2;
  //   handleBase.position.set(
  //     doorLength / 2 - 0.1,
  //     doorHeight / 8 - 0.2,
  //     wallWidth
  //   );

  //   // Handle grip stripe
  //   const handleGripGeometrys = new THREE.CylinderGeometry(0.01, 0.1, 0.05, 32);
  //   const handleGripMaterials = new THREE.MeshLambertMaterial({
  //     color: 0x000000,
  //   }); // Black color for handle grip
  //   const handleGrips = new THREE.Mesh(
  //     handleGripGeometrys,
  //     handleGripMaterials
  //   );
  //   // handleGrips.rotation.z = Math.PI / 2;
  //   handleGrips.position.set(
  //     doorLength / 2 - 0.1,
  //     doorHeight / 8 - 0.2,
  //     wallWidth + 0.09
  //   );

  //   // Handle grip
  //   const handleGripGeometry = new THREE.CylinderGeometry(0.07, 0.07, 1, 32);
  //   const handleGripMaterial = new THREE.MeshLambertMaterial({
  //     color: 0x000000,
  //   }); // Black color for handle grip
  //   const handleGrip = new THREE.Mesh(handleGripGeometry, handleGripMaterial);
  //   handleGrip.rotation.z = Math.PI / 2;
  //   handleGrip.position.set(
  //     doorLength / 2 - 0.3,
  //     doorHeight / 8 - 0.2,
  //     wallWidth
  //   );

  //   // Keyhole
  //   const keyholeGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.02, 32);
  //   const keyholeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 }); // Black color for keyhole
  //   const keyhole = new THREE.Mesh(keyholeGeometry, keyholeMaterial);
  //   keyhole.rotation.x = Math.PI / 2;
  //   keyhole.position.set(-0.04, 0, 0.01);

  //   handle.add(handleBase);
  //   handle.add(handleGrip);
  //   handle.add(keyhole);
  //   handle.add(handleGrips);
  //   const handle2 = handle.clone();
  //   handle2.position.set(0, 0, -wallWidth + 1);

  //   // Create a group to hold the frame, panel, and handle
  //   const doorGroup = new THREE.Group();
  //   doorGroup.add(frame);
  //   doorGroup.add(panel);
  //   doorGroup.add(handle);
  //   doorGroup.add(upperWall);

  //   // Position the door group

  //   doorGroup.position.set(midpoint.x, doorHeight / 2, midpoint.z);

  //   // Rotate the door group to align with the wall
  //   const angle = Math.atan2(end.z - start.z, end.x - start.x);
  //   doorGroup.rotation.y = -angle;

  //   this.scene.add(doorGroup);
  // }

  // private drawWindow(
  //   start: THREE.Vector3,
  //   end: THREE.Vector3,
  //   windowHeight: number,
  //   wallWidth: number,
  //   elevation: number,
  //   color: number,
  //   frameColor = '0xc3b091'
  // ) {
  //   const wallLength = start.distanceTo(end);
  //   const frameWidth = 1.2;
  //   const frameHeight = 1.5;
  //   const frameThickness = 0.2;
  //   const glassThickness = 0.02;

  //   const windowGroup = new THREE.Group();

  //   // Create window frame
  //   const frameMaterial = new THREE.MeshLambertMaterial({ color: frameColor });

  //   // Top frame
  //   const topFrameGeometry = new THREE.BoxGeometry(
  //     wallLength,
  //     frameThickness,
  //     frameThickness
  //   );
  //   const topFrame = new THREE.Mesh(topFrameGeometry, frameMaterial);
  //   topFrame.position.set(0, windowHeight, 0);

  //   // Bottom frame
  //   const bottomFrame = topFrame.clone();
  //   bottomFrame.position.set(0, 0, 0);

  //   // Left frame
  //   const sideFrameGeometry = new THREE.BoxGeometry(
  //     frameThickness,
  //     windowHeight,
  //     frameThickness
  //   );
  //   const leftFrame = new THREE.Mesh(sideFrameGeometry, frameMaterial);
  //   leftFrame.position.set(-wallLength / 2, windowHeight / 2, 0);

  //   // Right frame
  //   const rightFrame = leftFrame.clone();
  //   rightFrame.position.set(wallLength / 2, windowHeight / 2, 0);

  //   // Create glass pane
  //   const glassGeometry = new THREE.PlaneGeometry(
  //     wallLength - frameThickness,
  //     windowHeight - frameThickness
  //   );
  //   const glassMaterial = new THREE.MeshLambertMaterial({
  //     color: color,
  //     transparent: true,
  //     opacity: 0.5,
  //   });
  //   const glass = new THREE.Mesh(glassGeometry, glassMaterial);
  //   glass.position.set(0, windowHeight / 2, frameThickness / 2);

  //   const glass2 = glass.clone();
  //   glass.position.set(0, windowHeight / 2, -frameThickness * 2);

  //   // Add frame and glass to window group
  //   windowGroup.add(topFrame);
  //   windowGroup.add(bottomFrame);
  //   windowGroup.add(leftFrame);
  //   windowGroup.add(rightFrame);
  //   windowGroup.add(glass);
  //   windowGroup.add(glass2);
  //   const midpoint = new THREE.Vector3()
  //     .addVectors(start, end)
  //     .multiplyScalar(0.5);
  //   windowGroup.position.set(midpoint.x, windowHeight / 2, midpoint.z);
  //   const angle = Math.atan2(end.z - start.z, end.x - start.x);
  //   windowGroup.rotation.y = -angle;
  //   this.scene.add(windowGroup);
  // }


  ngOnInit() {
  }
  ionViewDidEnter(){
    this.previousDesigns = [];
    this.loadSavedDrawings();

  }

  loadSavedDrawings() {
    // Assuming you have a way to get all saved drawing IDs
    Object.keys(localStorage).forEach(key => {
      console.log(key)
      const item = localStorage.getItem(key);
      if (item) {
        try {
          const parsedItem = JSON.parse(item);
          const design: Design = {
            id: key,
            title: parsedItem.title || 'Untitled',
            description: parsedItem.description || 'No description',
            thumbnail: parsedItem.thumbnail || 'default-thumbnail-url'
          };
          this.previousDesigns.push(design);
        } catch (error) {
          console.error(`Error parsing item with key "${key}":`, error);
          console.log('Problematic item:', item);
        }
      }
    });
  }

  goToDesign(id : any){
    this.router.navigate(['/drawing', id]);
  }
}
