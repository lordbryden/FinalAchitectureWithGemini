    import { Component, ElementRef, ViewChild } from '@angular/core';
    import { GridService } from '../services/grid.service';
    import Konva from 'konva';
    import { DrawingService } from '../services/drawing.service';
    import { AutoDrawService } from '../services/auto-draw.service';

    @Component({
      selector: 'app-home',
      templateUrl: 'home.page.html',
      styleUrls: ['home.page.scss'],
    })
    export class HomePage {

      constructor(
        private gridService: GridService,
        private drawingService: DrawingService,
        private autoDrawService: AutoDrawService,



      ) {

      }
    }
