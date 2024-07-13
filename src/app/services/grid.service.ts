import { Injectable } from '@angular/core';
import Konva from 'konva';
@Injectable({
  providedIn: 'root'
})
export class GridService {
  private gridLayer: Konva.Layer;

  constructor() {
    this.gridLayer = new Konva.Layer();
  }

  createGrid(stage: Konva.Stage, cellSize: number = 20): void {
    const width = stage.width();
    const height = stage.height();

    // Create vertical lines
    for (let i = 0; i <= width; i += cellSize) {
      this.gridLayer.add(new Konva.Line({
        points: [i, 0, i, height],
        stroke: '#ddd',
        strokeWidth: 1
      }));
    }

    // Create horizontal lines
    for (let i = 0; i <= height; i += cellSize) {
      this.gridLayer.add(new Konva.Line({
        points: [0, i, width, i],
        stroke: '#ddd',
        strokeWidth: 1
      }));
    }

    stage.add(this.gridLayer);
  }

  toggleGrid(): void {
    this.gridLayer.visible(!this.gridLayer.visible());
  }

  getGridLayer(): Konva.Layer {
    return this.gridLayer;
  }
}
