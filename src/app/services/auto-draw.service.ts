import { Injectable, OnInit } from '@angular/core';
import Konva from 'konva';
import { DrawingService } from './drawing.service';
import { HomePage } from '../home/home.page';

interface Segment {
  start: string;
  end: string;
  name: string;
  type: string;
  length: number;
  angle: number;
}
type SimpleSegment = [string, string, string, string, number, number];


interface Point {
  x: number;
  y: number;
}

@Injectable({
  providedIn: 'root'
})
export class AutoDrawService implements OnInit {
  private layer: Konva.Layer;
  private pixelsPerMeter!: number ;
  private pointMap: Map<string, Point> = new Map();

  constructor(private drawingService: DrawingService ) {

    this.layer = this.drawingService.getLayer();
  }

  ngOnInit() {


  }
  async drawShape(segments: SimpleSegment[], delayMs: number = 500) {
    this.drawingService.setAutoDrawingState(true);
    this.calculateAndStorePoints(segments);
    const bounds = this.calculateBounds(Array.from(this.pointMap.values()));
    const offset = this.calculateOffset(bounds);

    // Apply offset to all stored points
    for (const [key, point] of this.pointMap) {
      this.pointMap.set(key, {
        x: point.x + offset.x,
        y: point.y + offset.y
      });
    }

    for (const segment of segments) {
      await this.drawSegmentFromStored(segment, delayMs);
    }

   await this.layer.batchDraw();


   this.drawingService.setAutoDrawingState(false);
  }

  private calculateAndStorePoints(segments: SimpleSegment[]) {
    this.pointMap.clear();

    for (const [start, end, , , length, angle] of segments) {
      if (!this.pointMap.has(start)) {
        this.pointMap.set(start, { x: 0, y: 0 });
      }

      const startPoint = this.pointMap.get(start)!;
      const pixelLength = this.lengthToPixels(length);
      const radianAngle = this.degreesToRadians(angle);

      const endPoint = {
        x: startPoint.x + pixelLength * Math.cos(radianAngle),
        y: startPoint.y + pixelLength * Math.sin(radianAngle)
      };

      this.pointMap.set(end, endPoint);
    }
  }

  private async drawSegmentFromStored(segment: SimpleSegment, delayMs: number) {
  const [start, end, , type] = segment;
  const startPoint = this.pointMap.get(start);
  const endPoint = this.pointMap.get(end);

  if (!startPoint || !endPoint) {
    console.error(`Unable to find points for segment: ${segment[2]}`);
    return;
  }

  await this.drawSegmentWithDelay(type, startPoint.x, startPoint.y, endPoint.x, endPoint.y, delayMs);
}
  private drawSegmentWithDelay(type: string, startX: number, startY: number, endX: number, endY: number, delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.drawSegment(type, startX, startY, endX, endY);
        resolve();
      }, delayMs);
    });
  }

  private drawSegment(type: string, startX: number, startY: number, endX: number, endY: number) {
    let drawingMode: 'wall' | 'door' | 'window';

    switch(type.toLowerCase()) {
      case 'wall':
        drawingMode = 'wall';
        break;
      case 'door':
        drawingMode = 'door';
        break;
      case 'window':
        drawingMode = 'window';
        break;
      default:
        console.warn(`Unknown segment type: ${type}. Defaulting to wall.`);
        drawingMode = 'wall';
    }

    this.drawingService.setMode(drawingMode);
    this.drawingService.startDrawing({ x: startX, y: startY });
    this.drawingService.continueDrawing({ x: endX, y: endY });
    this.drawingService.stopDrawing();
  }

  private calculateBounds(points: Point[]): { minX: number, minY: number, maxX: number, maxY: number } {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys)
    };
  }

  private calculateOffset(bounds: { minX: number, minY: number, maxX: number, maxY: number }): Point {
    this.pixelsPerMeter = this.drawingService.getScale();
    const stage = this.layer.getStage();
    const stageWidth = stage.width();
    const stageHeight = stage.height();

    const shapeWidth = bounds.maxX - bounds.minX;
    const shapeHeight = bounds.maxY - bounds.minY;

    const scaleX = (stageWidth * 0.25) / shapeWidth;
    const scaleY = (stageHeight * 0.25) / shapeHeight;
    const scale = Math.min(scaleX, scaleY);

    this.pixelsPerMeter *= scale;

    return {
      x: (stageWidth * 0.05) - bounds.minX * scale,
      y: (stageHeight * 0.05) - bounds.minY * scale
    };
  }

  private lengthToPixels(length: number): number {
    this.pixelsPerMeter = this.drawingService.getScale();

    return (length / 1000) * this.pixelsPerMeter;
  }

  private degreesToRadians(degrees: number): number {
    this.pixelsPerMeter = this.drawingService.getScale();

    return degrees * (Math.PI / 180);
  }



  checkShapeSize() {
    const stage = this.layer.getStage();
    if (!stage) {
      console.error('Stage not found');
      return 0;
    }

    const canvasWidth = stage.width();
    const canvasHeight = stage.height();

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Calculate the bounding box of all points
    this.pointMap.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });

    const shapeWidth = maxX - minX;
    const shapeHeight = maxY - minY;
    const currentPixelsPerMeter = this.drawingService.getScale();

    if (shapeWidth > canvasWidth || shapeHeight > canvasHeight) {
      console.log('The drawn shape is larger than the canvas. Adjusting scale...');

      // Calculate the scale factor needed to fit the shape
      const scaleX = canvasWidth / shapeWidth;
      const scaleY = canvasHeight / shapeHeight;
      const scaleFactor = Math.min(scaleX, scaleY) * 0.5; // 0.9 to leave some margin

      // Calculate the new pixels per meter
      const newPixelsPerMeter = Math.floor(currentPixelsPerMeter * scaleFactor);

      console.log(`Adjusted pixelsPerMeter from ${currentPixelsPerMeter} to ${newPixelsPerMeter}`);

      // Set the new scale
      this.drawingService.setScale(newPixelsPerMeter);

      // Update all point positions with the new scale
      this.pointMap.forEach((point, key) => {
        this.pointMap.set(key, {
          x: point.x * scaleFactor,
          y: point.y * scaleFactor
        });
      });

      return newPixelsPerMeter;
    } else {
      console.log('The drawn shape fits within the canvas');
      return currentPixelsPerMeter;
    }
  }

}
