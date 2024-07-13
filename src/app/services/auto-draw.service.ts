import { Injectable } from '@angular/core';
import Konva from 'konva';
import { DrawingService } from './drawing.service';

interface Segment {
  start: string;
  end: string;
  name: string;
  type: string;
  length: number;
  angle: number;
}

interface Point {
  x: number;
  y: number;
}

@Injectable({
  providedIn: 'root'
})
export class AutoDrawService {
  private layer: Konva.Layer;
  private pixelsPerMeter: number = 100;
  private pointMap: Map<string, Point> = new Map();

  constructor(private drawingService: DrawingService) {
    this.layer = this.drawingService.getLayer();
  }

  async drawShape(segments: Segment[], delayMs: number = 500) {
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

    this.layer.batchDraw();
  }

  private calculateAndStorePoints(segments: Segment[]) {
    this.pointMap.clear();

    for (const segment of segments) {
      if (!this.pointMap.has(segment.start)) {
        this.pointMap.set(segment.start, { x: 0, y: 0 });
      }

      const startPoint = this.pointMap.get(segment.start)!;
      const length = this.lengthToPixels(segment.length);
      const angle = this.degreesToRadians(segment.angle);

      const endPoint = {
        x: startPoint.x + length * Math.cos(angle),
        y: startPoint.y + length * Math.sin(angle)
      };

      this.pointMap.set(segment.end, endPoint);
    }
  }

  private async drawSegmentFromStored(segment: Segment, delayMs: number) {
    const startPoint = this.pointMap.get(segment.start);
    const endPoint = this.pointMap.get(segment.end);

    if (!startPoint || !endPoint) {
      console.error(`Unable to find points for segment: ${segment.name}`);
      return;
    }

    await this.drawSegmentWithDelay(segment.type, startPoint.x, startPoint.y, endPoint.x, endPoint.y, delayMs);
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
      x: (stageWidth * 0.15) - bounds.minX * scale,
      y: (stageHeight * 0.15) - bounds.minY * scale
    };
  }

  private lengthToPixels(length: number): number {
    return (length / 1000) * this.pixelsPerMeter;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
