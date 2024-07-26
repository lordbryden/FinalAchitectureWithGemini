import * as THREE from 'three';

import { Component, ElementRef, ViewChild } from '@angular/core';
import { Line, LineBasicMaterial } from 'three';

import { AutoDrawService } from '../services/auto-draw.service';
import { CSG } from 'three-csg-ts';
import { ColorService } from '../services/color.service';
import { DrawingService } from '../services/drawing.service';
import { GeminiService } from '../services/gemini.service';
import { GridService } from '../services/grid.service';
import Konva from 'konva';
import { MenuController } from '@ionic/angular';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';

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

  public wallHeight: number = 4000; // 5 meters in centimeters
  public wallWidth: number = 300; // 30 centimeters
  public doorHeight: number = 2000; // 3 meters in centimeters
  public windowHeight: number = 1500; // Default window height in centimeters

  currentWallColor: string;
  currentDoorColor: string;
  currentWindowColor: string;
  currentRoofColor: string;

  // segments3 = [
  //  // External wall
  //  { start: 'A1', end: 'A2', name: 'External wall 1', type: 'wall', length: 4000, angle: 0 },
  //  { start: 'A2', end: 'A3', name: 'External wall 2', type: 'wall', length: 4500, angle: 90 },
  //  { start: 'A3', end: 'A4', name: 'External wall 3', type: 'wall', length: 4000, angle: 180 },
  //  { start: 'A4', end: 'A1', name: 'External wall 4', type: 'wall', length: 4500, angle: 270 },

  // //  inner walls Kitchen
  // { start: 'A3', end: 'A5', name: 'Inner wall 1', type: 'wall', length: 1500, angle: 270 },
  // { start: 'A5', end: 'A6', name: 'Inner wall 2', type: 'wall', length: 1400, angle: 180 },
  // { start: 'A6', end: 'A7', name: 'Inner wall 3', type: 'wall', length: 1500, angle: 90 },

  // // inner walls toilet
  // { start: 'A4', end: 'A8', name: 'Inner wall 4', type: 'wall', length: 1500, angle: 270 },
  // { start: 'A8', end: 'A9', name: 'Inner wall 5', type: 'wall', length: 1400, angle: 0 },
  // { start: 'A9', end: 'A10', name: 'Inner wall 6', type: 'wall', length: 1500, angle: 90 },

  // // Room door
  // { start: 'A2', end: 'A11', name: 'Door 1', type: 'door', length: 1500, angle: 180 },

  // // Kitchen door
  // { start: 'A5', end: 'A13', name: 'Door 2', type: 'door', length: 900, angle: 180 },

  // // toilet door
  // { start: 'A9', end: 'A12', name: 'Door 3', type: 'door', length: 900, angle: 90 },

  // // Room Window
  // { start: 'A1', end: 'A14', name: 'Window External wall 1', type: 'wall', length: 500, angle: 0 },
  // { start: 'A14', end: 'A15', name: 'Window 1', type: 'window', length: 1000, angle: 0 },

  // // Kitchen Window
  // { start: 'A3', end: 'A18', name: 'Window External wall 2', type: 'wall', length: 250, angle: 180 },
  // { start: 'A18', end: 'A19', name: 'Window 2', type: 'window', length: 800, angle: 180 },

  //  // toilet Window
  //  { start: 'A4', end: 'A16', name: 'Window External wall 2', type: 'wall', length: 250, angle: 0 },
  //  { start: 'A16', end: 'A17', name: 'Window 3', type: 'window', length: 500, angle: 0 },

  // ];

  segments3 = [
    // External wall
    {
      start: 'A1',
      end: 'A2',
      name: 'External wall 1',
      type: 'wall',
      length: 3800,
      angle: 0,
    },
    {
      start: 'A2',
      end: 'A3',
      name: 'External wall 2',
      type: 'wall',
      length: 4600,
      angle: 90,
    },
    {
      start: 'A3',
      end: 'A4',
      name: 'External wall 3',
      type: 'wall',
      length: 3800,
      angle: 180,
    },
    {
      start: 'A4',
      end: 'A1',
      name: 'External wall 4',
      type: 'wall',
      length: 4600,
      angle: 270,
    },

    // Inner walls Kitchen
    {
      start: 'A3',
      end: 'A5',
      name: 'Inner wall 1',
      type: 'wall',
      length: 1700,
      angle: 270,
    },
    {
      start: 'A5',
      end: 'A6',
      name: 'Inner wall 2',
      type: 'wall',
      length: 1500,
      angle: 180,
    },
    {
      start: 'A6',
      end: 'A7',
      name: 'Inner wall 3',
      type: 'wall',
      length: 1700,
      angle: 90,
    },

    // Inner walls toilet
    {
      start: 'A4',
      end: 'A8',
      name: 'Inner wall 4',
      type: 'wall',
      length: 1600,
      angle: 270,
    },
    {
      start: 'A8',
      end: 'A9',
      name: 'Inner wall 5',
      type: 'wall',
      length: 1200,
      angle: 0,
    },
    {
      start: 'A9',
      end: 'A10',
      name: 'Inner wall 6',
      type: 'wall',
      length: 1600,
      angle: 90,
    },

    // Room door
    {
      start: 'A2',
      end: 'A11',
      name: 'Door 1',
      type: 'door',
      length: 1400,
      angle: 180,
    },

    // Kitchen door
    {
      start: 'A5',
      end: 'A13',
      name: 'Door 2',
      type: 'door',
      length: 1100,
      angle: 180,
    },

    // Toilet door
    {
      start: 'A9',
      end: 'A12',
      name: 'Door 3',
      type: 'door',
      length: 1100,
      angle: 90,
    },

    // Room Window
    {
      start: 'A1',
      end: 'A14',
      name: 'Window External wall 1',
      type: 'wall',
      length: 700,
      angle: 0,
    },
    {
      start: 'A14',
      end: 'A15',
      name: 'Window 1',
      type: 'window',
      length: 900,
      angle: 0,
    },

    // Kitchen Window
    {
      start: 'A3',
      end: 'A18',
      name: 'Window External wall 2',
      type: 'wall',
      length: 400,
      angle: 180,
    },
    {
      start: 'A18',
      end: 'A19',
      name: 'Window 2',
      type: 'window',
      length: 700,
      angle: 180,
    },

    // Toilet Window
    {
      start: 'A4',
      end: 'A16',
      name: 'Window External wall 2',
      type: 'wall',
      length: 400,
      angle: 0,
    },
    {
      start: 'A16',
      end: 'A17',
      name: 'Window 3',
      type: 'window',
      length: 700,
      angle: 0,
    },
  ];

  // 1 room 1 parlor 1kitchen 1 toilet (studio)
  segment1 = [
    // External wall
    {
      start: 'A1',
      end: 'A2',
      name: 'External wall 1',
      type: 'wall',
      length: 7500,
      angle: 0,
    },
    {
      start: 'A2',
      end: 'A3',
      name: 'External wall 2',
      type: 'wall',
      length: 9500,
      angle: 90,
    },
    {
      start: 'A3',
      end: 'A4',
      name: 'External wall 3',
      type: 'wall',
      length: 7500,
      angle: 180,
    },
    {
      start: 'A4',
      end: 'A1',
      name: 'External wall 4',
      type: 'wall',
      length: 9500,
      angle: 270,
    },

    // Inner walls Bedroom
    {
      start: 'A1',
      end: 'A5',
      name: 'Inner wall 1',
      type: 'wall',
      length: 5000,
      angle: 0,
    },
    {
      start: 'A5',
      end: 'A6',
      name: 'Inner wall 2',
      type: 'wall',
      length: 4500,
      angle: 90,
    },
    {
      start: 'A6',
      end: 'A7',
      name: 'Inner wall 3',
      type: 'wall',
      length: 5000,
      angle: 180,
    },

    // Inner walls toilet
    {
      start: 'A2',
      end: 'A8',
      name: 'Inner wall 4',
      type: 'wall',
      length: 3200,
      angle: 90,
    },
    {
      start: 'A8',
      end: 'A9',
      name: 'Inner wall 5',
      type: 'wall',
      length: 2500,
      angle: 180,
    },

    // Inner walls Kitchen
    {
      start: 'A3',
      end: 'A10',
      name: 'Inner wall 4',
      type: 'wall',
      length: 3500,
      angle: 270,
    },
    {
      start: 'A10',
      end: 'A11',
      name: 'Inner wall 5',
      type: 'wall',
      length: 2500,
      angle: 180,
    },
    {
      start: 'A11',
      end: 'A12',
      name: 'Inner wall 5',
      type: 'wall',
      length: 3500,
      angle: 90,
    },

    // Doors
    // bedroom door
    {
      start: 'A6',
      end: 'A13',
      name: 'Door 1',
      type: 'door',
      length: 900,
      angle: 270,
    },

    // toilet door

    {
      start: 'A9',
      end: 'A14',
      name: 'Door 2',
      type: 'door',
      length: 900,
      angle: 0,
    },

    // Kitchen door door
    {
      start: 'A11',
      end: 'A15',
      name: 'Door 3',
      type: 'door',
      length: 900,
      angle: 0,
    },

    // // Hall way door

    {
      start: 'A11',
      end: 'A6',
      name: 'Door 4',
      type: 'door',
      length: 1500,
      angle: 270,
    },

    // // Living room door
    {
      start: 'A12',
      end: 'A16',
      name: 'Door 5',
      type: 'door',
      length: 900,
      angle: 180,
    },

    // Windows
    // Bedroom Window
    {
      start: 'A1',
      end: 'A17',
      name: 'Window External wall 1',
      type: 'wall',
      length: 1200,
      angle: 0,
    },
    {
      start: 'A17',
      end: 'A18',
      name: 'Window 1',
      type: 'window',
      length: 1830,
      angle: 0,
    },

    // Toilet Window
    {
      start: 'A2',
      end: 'A19',
      name: 'Window External wall 2',
      type: 'wall',
      length: 800,
      angle: 180,
    },
    {
      start: 'A19',
      end: 'A20',
      name: 'Window 2',
      type: 'window',
      length: 740,
      angle: 180,
    },

    // Kitchen window
    {
      start: 'A3',
      end: 'A21',
      name: 'Window External wall 3',
      type: 'wall',
      length: 300,
      angle: 180,
    },
    {
      start: 'A21',
      end: 'A22',
      name: 'Window 3',
      type: 'window',
      length: 1830,
      angle: 180,
    },

    // living room window
    {
      start: 'A4',
      end: 'A23',
      name: 'Window External wall 3',
      type: 'wall',
      length: 1000,
      angle: 0,
    },
    {
      start: 'A23',
      end: 'A24',
      name: 'Window 3',
      type: 'window',
      length: 1830,
      angle: 0,
    },
  ];

  // 2 rooms 1 parlor 1 kitchen 1 toilet
  segments2 = [
    // External wall
    {
      start: 'A1',
      end: 'A2',
      name: 'External wall 1',
      type: 'wall',
      length: 9000,
      angle: 0,
    },
    {
      start: 'A2',
      end: 'A3',
      name: 'External wall 2',
      type: 'wall',
      length: 7750,
      angle: 90,
    },
    {
      start: 'A3',
      end: 'A4',
      name: 'External wall 3',
      type: 'wall',
      length: 9000,
      angle: 180,
    },
    {
      start: 'A4',
      end: 'A1',
      name: 'External wall 4',
      type: 'wall',
      length: 7750,
      angle: 270,
    },

    // Internal Walls
    // Master Bedroom
    {
      start: 'A1',
      end: 'A5',
      name: 'internal wall 1',
      type: 'wall',
      length: 4000,
      angle: 0,
    },
    {
      start: 'A5',
      end: 'A6',
      name: 'internal wall 2',
      type: 'wall',
      length: 3750,
      angle: 90,
    },
    {
      start: 'A6',
      end: 'A7',
      name: 'internal wall 3',
      type: 'wall',
      length: 4000,
      angle: 180,
    },

    // Bedroom
    {
      start: 'A4',
      end: 'A10',
      name: 'internal wall 4',
      type: 'wall',
      length: 4000,
      angle: 0,
    },
    {
      start: 'A10',
      end: 'A9',
      name: 'internal wall 5',
      type: 'wall',
      length: 3000,
      angle: 270,
    },
    {
      start: 'A9',
      end: 'A8',
      name: 'internal wall 6',
      type: 'wall',
      length: 4000,
      angle: 180,
    },

    // toilet Wall
    {
      start: 'A9',
      end: 'A11',
      name: 'internal wall 7',
      type: 'wall',
      length: 1000,
      angle: 180,
    },
    {
      start: 'A11',
      end: 'A12',
      name: 'internal wall 8',
      type: 'wall',
      length: 1000,
      angle: 270,
    },

    // Kitchen wall
    {
      start: 'A2',
      end: 'A13',
      name: 'internal wall 9',
      type: 'wall',
      length: 2500,
      angle: 180,
    },
    {
      start: 'A13',
      end: 'A14',
      name: 'internal wall 10',
      type: 'wall',
      length: 3750,
      angle: 90,
    },
    {
      start: 'A14',
      end: 'A15',
      name: 'internal wall 11',
      type: 'wall',
      length: 2500,
      angle: 0,
    },

    //doors
    // main door
    {
      start: 'A10',
      end: 'A17',
      name: 'Door 1',
      type: 'door',
      length: 1500,
      angle: 0,
    },

    // // room door
    {
      start: 'A9',
      end: 'A11',
      name: 'Door 2',
      type: 'door',
      length: 1000,
      angle: 180,
    },

    // // toilet door
    {
      start: 'A11',
      end: 'A32',
      name: 'internal wall 12',
      type: 'wall',
      length: 250,
      angle: 270,
    },
    {
      start: 'A32',
      end: 'A16',
      name: 'Door 3',
      type: 'door',
      length: 500,
      angle: 270,
    },

    // // Master bedroom door
    {
      start: 'A6',
      end: 'A12',
      name: 'Door 4',
      type: 'door',
      length: 1000,
      angle: 180,
    },

    // // kitchen door
    {
      start: 'A13',
      end: 'A18',
      name: 'internal wall 13',
      type: 'wall',
      length: 1125,
      angle: 90,
    },
    {
      start: 'A18',
      end: 'A19',
      name: 'door 5',
      type: 'door',
      length: 1500,
      angle: 90,
    },

    // Windows
    // Living room window
    {
      start: 'A3',
      end: 'A20',
      name: 'internal wall 14',
      type: 'wall',
      length: 500,
      angle: 180,
    },
    {
      start: 'A20',
      end: 'A21',
      name: 'Window 1',
      type: 'window',
      length: 1300,
      angle: 180,
    },

    // bedroom window
    {
      start: 'A4',
      end: 'A22',
      name: 'internal wall 15',
      type: 'wall',
      length: 500,
      angle: 270,
    },
    {
      start: 'A22',
      end: 'A23',
      name: 'Window 2',
      type: 'window',
      length: 1100,
      angle: 270,
    },

    // toilet window
    {
      start: 'A8',
      end: 'A24',
      name: 'internal wall 16',
      type: 'wall',
      length: 250,
      angle: 270,
    },
    {
      start: 'A24',
      end: 'A25',
      name: 'Window 3',
      type: 'window',
      length: 500,
      angle: 270,
    },

    // master Bedroom window
    {
      start: 'A7',
      end: 'A26',
      name: 'internal wall 17',
      type: 'wall',
      length: 500,
      angle: 270,
    },
    {
      start: 'A26',
      end: 'A27',
      name: 'Window 4',
      type: 'window',
      length: 1300,
      angle: 270,
    },

    // corridor window
    {
      start: 'A5',
      end: 'A28',
      name: 'internal wall 18',
      type: 'wall',
      length: 750,
      angle: 0,
    },
    {
      start: 'A28',
      end: 'A29',
      name: 'Window 5',
      type: 'window',
      length: 1500,
      angle: 0,
    },

    // Kitchen window
    {
      start: 'A2',
      end: 'A30',
      name: 'internal wall 19',
      type: 'wall',
      length: 750,
      angle: 90,
    },
    {
      start: 'A30',
      end: 'A31',
      name: 'Window 6',
      type: 'window',
      length: 1500,
      angle: 90,
    },
  ];

  // 3 rooms 4 toilets 1 kitchen 1 parlor
  segment4 = [
    // External wall
    {
      start: 'A1',
      end: 'A2',
      name: 'External wall 1',
      type: 'wall',
      length: 17500,
      angle: 0,
    },
    {
      start: 'A2',
      end: 'A3',
      name: 'External wall 2',
      type: 'wall',
      length: 16100,
      angle: 90,
    },
    {
      start: 'A3',
      end: 'A4',
      name: 'External wall 3',
      type: 'wall',
      length: 17500,
      angle: 180,
    },
    {
      start: 'A4',
      end: 'A1',
      name: 'External wall 4',
      type: 'wall',
      length: 16100,
      angle: 270,
    },

    // Internal Walls
    //  Bedroom 1
    {
      start: 'A1',
      end: 'A5',
      name: 'internal wall 1',
      type: 'wall',
      length: 6000,
      angle: 0,
    },
    {
      start: 'A5',
      end: 'A6',
      name: 'internal wall 2',
      type: 'wall',
      length: 6400,
      angle: 90,
    },
    {
      start: 'A6',
      end: 'A7',
      name: 'internal wall 3',
      type: 'wall',
      length: 6000,
      angle: 180,
    },

    // toilet wall 1
    {
      start: 'A6',
      end: 'A8',
      name: 'internal wall 4',
      type: 'wall',
      length: 2700,
      angle: 180,
    },
    {
      start: 'A8',
      end: 'A9',
      name: 'internal wall 5',
      type: 'wall',
      length: 2300,
      angle: 90,
    },
    {
      start: 'A9',
      end: 'A10',
      name: 'internal wall 6',
      type: 'wall',
      length: 3300,
      angle: 180,
    },

    // Bedroom 2
    {
      start: 'A4',
      end: 'A14',
      name: 'internal wall 7',
      type: 'wall',
      length: 6000,
      angle: 0,
    },
    {
      start: 'A14',
      end: 'A13',
      name: 'internal wall 8',
      type: 'wall',
      length: 7400,
      angle: 270,
    },
    {
      start: 'A13',
      end: 'A10',
      name: 'internal wall 9',
      type: 'wall',
      length: 6000,
      angle: 180,
    },

    // toilet wall 2
    {
      start: 'A9',
      end: 'A12',
      name: 'internal wall 4',
      type: 'wall',
      length: 2200,
      angle: 90,
    },
    {
      start: 'A12',
      end: 'A11',
      name: 'internal wall 5',
      type: 'wall',
      length: 3300,
      angle: 180,
    },

    // Kitchen wall
    {
      start: 'A2',
      end: 'A17',
      name: 'internal wall 9',
      type: 'wall',
      length: 5000,
      angle: 180,
    },
    {
      start: 'A17',
      end: 'A18',
      name: 'internal wall 10',
      type: 'wall',
      length: 6400,
      angle: 90,
    },
    {
      start: 'A18',
      end: 'A15',
      name: 'internal wall 11',
      type: 'wall',
      length: 5000,
      angle: 0,
    },

    // Bedroom 3 wall
    {
      start: 'A3',
      end: 'A19',
      name: 'internal wall 7',
      type: 'wall',
      length: 7400,
      angle: 270,
    },
    {
      start: 'A19',
      end: 'A20',
      name: 'internal wall 8',
      type: 'wall',
      length: 5000,
      angle: 180,
    },
    {
      start: 'A20',
      end: 'A23',
      name: 'internal wall 9',
      type: 'wall',
      length: 7400,
      angle: 90,
    },

    // External toilet
    {
      start: 'A19',
      end: 'A24',
      name: 'internal wall 4',
      type: 'wall',
      length: 3300,
      angle: 180,
    },
    {
      start: 'A24',
      end: 'A25',
      name: 'internal wall 5',
      type: 'wall',
      length: 2300,
      angle: 270,
    },

    // room 3 toilet
    {
      start: 'A24',
      end: 'A26',
      name: 'internal wall 4',
      type: 'wall',
      length: 2300,
      angle: 90,
    },
    {
      start: 'A26',
      end: 'A27',
      name: 'internal wall 5',
      type: 'wall',
      length: 3300,
      angle: 0,
    },

    // // Hall way wall
    {
      start: 'A18',
      end: 'A16',
      name: 'internal wall 9',
      type: 'wall',
      length: 2000,
      angle: 180,
    },
    {
      start: 'A20',
      end: 'A28',
      name: 'internal wall 9',
      type: 'wall',
      length: 2000,
      angle: 180,
    },

    //doors
    // Bedroom 1 door
    {
      start: 'A6',
      end: 'A29',
      name: 'Door 1',
      type: 'door',
      length: 1500,
      angle: 180,
    },

    // Bedroom 1 toilet door
    {
      start: 'A8',
      end: 'A30',
      name: 'Door 1',
      type: 'door',
      length: 1500,
      angle: 180,
    },

    // Bedroom 2 door
    {
      start: 'A13',
      end: 'A31',
      name: 'Door 1',
      type: 'door',
      length: 1500,
      angle: 180,
    },

    // Bedroom 2 toilet door
    {
      start: 'A9',
      end: 'A32',
      name: 'Door 1',
      type: 'door',
      length: 1500,
      angle: 90,
    },

    // Kitchen door
    {
      start: 'A17',
      end: 'A33',
      name: 'internal wall 9',
      type: 'wall',
      length: 2450,
      angle: 90,
    },
    {
      start: 'A33',
      end: 'A34',
      name: 'Door 1',
      type: 'door',
      length: 2000,
      angle: 90,
    },

    // external toilet door
    {
      start: 'A25',
      end: 'A35',
      name: 'Door 1',
      type: 'door',
      length: 1500,
      angle: 90,
    },

    // Bedroom 3 door
    {
      start: 'A24',
      end: 'A20',
      name: 'Door 1',
      type: 'door',
      length: 1700,
      angle: 180,
    },

    // Bedroom 3 toilet door
    {
      start: 'A26',
      end: 'A36',
      name: 'Door 1',
      type: 'door',
      length: 1500,
      angle: 270,
    },

    // Parlor door
    {
      start: 'A14',
      end: 'A37',
      name: 'Internal wall 19',
      type: 'wall',
      length: 1500,
      angle: 0,
    },
    {
      start: 'A37',
      end: 'A38',
      name: 'Door 1',
      type: 'door',
      length: 3000,
      angle: 0,
    },

    // Windows
    // Dining room window
    {
      start: 'A5',
      end: 'A39',
      name: 'internal wall 14',
      type: 'wall',
      length: 1000,
      angle: 0,
    },
    {
      start: 'A39',
      end: 'A40',
      name: 'Window 1',
      type: 'window',
      length: 2000,
      angle: 0,
    },

    // Kitchen window 1
    {
      start: 'A2',
      end: 'A41',
      name: 'internal wall 14',
      type: 'wall',
      length: 1000,
      angle: 180,
    },
    {
      start: 'A41',
      end: 'A42',
      name: 'Window 1',
      type: 'window',
      length: 1500,
      angle: 180,
    },

    // Kitchen window 2
    {
      start: 'A2',
      end: 'A43',
      name: 'internal wall 14',
      type: 'wall',
      length: 2500,
      angle: 90,
    },
    {
      start: 'A43',
      end: 'A44',
      name: 'Window 1',
      type: 'window',
      length: 1500,
      angle: 90,
    },

    // External toilet window
    {
      start: 'A15',
      end: 'A45',
      name: 'internal wall 14',
      type: 'wall',
      length: 500,
      angle: 90,
    },
    {
      start: 'A45',
      end: 'A46',
      name: 'Window 1',
      type: 'window',
      length: 1300,
      angle: 90,
    },

    // Bedroom 3 toilet window
    {
      start: 'A19',
      end: 'A47',
      name: 'internal wall 15',
      type: 'wall',
      length: 500,
      angle: 90,
    },
    {
      start: 'A47',
      end: 'A48',
      name: 'Window 2',
      type: 'window',
      length: 1100,
      angle: 90,
    },

    // Kitchen window 1
    {
      start: 'A3',
      end: 'A49',
      name: 'internal wall 14',
      type: 'wall',
      length: 1500,
      angle: 270,
    },
    {
      start: 'A49',
      end: 'A50',
      name: 'Window 1',
      type: 'window',
      length: 2000,
      angle: 270,
    },

    // Parlor window
    {
      start: 'A23',
      end: 'A51',
      name: 'internal wall 16',
      type: 'wall',
      length: 250,
      angle: 180,
    },
    {
      start: 'A51',
      end: 'A52',
      name: 'Window 3',
      type: 'window',
      length: 1500,
      angle: 180,
    },

    // Bedroom 2 window
    {
      start: 'A4',
      end: 'A53',
      name: 'internal wall 15',
      type: 'wall',
      length: 1500,
      angle: 270,
    },
    {
      start: 'A53',
      end: 'A54',
      name: 'Window 2',
      type: 'window',
      length: 2000,
      angle: 270,
    },

    // Bedroom 2 toilet window
    {
      start: 'A11',
      end: 'A55',
      name: 'internal wall 15',
      type: 'wall',
      length: 500,
      angle: 270,
    },
    {
      start: 'A55',
      end: 'A56',
      name: 'Window 2',
      type: 'window',
      length: 1100,
      angle: 270,
    },

    // Bedroom 1 toilet window
    {
      start: 'A10',
      end: 'A57',
      name: 'internal wall 15',
      type: 'wall',
      length: 500,
      angle: 270,
    },
    {
      start: 'A57',
      end: 'A58',
      name: 'Window 2',
      type: 'window',
      length: 1100,
      angle: 270,
    },

    // Bedroom 1 window
    {
      start: 'A7',
      end: 'A59',
      name: 'internal wall 15',
      type: 'wall',
      length: 1500,
      angle: 270,
    },
    {
      start: 'A59',
      end: 'A60',
      name: 'Window 2',
      type: 'window',
      length: 2000,
      angle: 270,
    },
  ];
  generatedContent: any = '';
  public lengthScaleFactor: number = 1.2;
  constructor(
    private gridService: GridService,
    private drawingService: DrawingService,
    private autoDrawService: AutoDrawService,
    private colorService: ColorService,
    private geminiService: GeminiService,
    private menuCtrl: MenuController
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
  openSecondMenu() {
    /**
     * Open the menu by menu-id
     * We refer to the menu using an ID
     * because multiple "start" menus exist.
     */
    this.menuCtrl.open('second-menu');
  }
  ngOnInit() {
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
  }

  initializeStage() {
    const screenSize = Math.max(window.innerWidth, window.innerHeight);
    const stageSize = screenSize; // You can adjust this multiplier as needed

    this.stage = new Konva.Stage({
      container: this.containerRef.nativeElement,
      width: stageSize,
      height: stageSize,
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

  async generateContents() {
    const question =
      'I need a detailed plan to draw a 1-bedroom apartment with 1 room, 1 parlor, 1 kitchen, and 1 toilet. The instructions should be step-by-step and include directional details (left, right, up, down) for each line. The process should start with the outer walls and then segment each part of the house (bedroom, parlor, kitchen, toilet).';
    try {
      this.generatedContent = await this.geminiService.generateContent(
        question
      );
      console.log(this.generatedContent);
    } catch (error) {
      console.error('Error generating content:', error);
    }
  }
}
