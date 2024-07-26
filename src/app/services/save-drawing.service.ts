import { Injectable } from '@angular/core';
import { DrawingService } from './drawing.service';

@Injectable({
  providedIn: 'root'
})
export class SaveDrawingService {
    private shapes : any;
  constructor(private drawingService : DrawingService) {
    this.shapes = this
   }


  serializeDrawing(): string {
    const serializedShapes = this.shapes.map((shapeInfo : any) => {
      const serializedShape = {
        type: this.drawingService.getShapeType(shapeInfo.shape),
        start: { x: shapeInfo.startCircle.x(), y: shapeInfo.startCircle.y() },
        end: { x: shapeInfo.endCircle.x(), y: shapeInfo.endCircle.y() }
      };
      return serializedShape;
    });
    return JSON.stringify(serializedShapes);
  }

  deserializeDrawing(serializedData: string) {
    const shapes = JSON.parse(serializedData);
    this.drawingService.clearAllDrawings();
    shapes.forEach((shape : any) => {
      this.recreateShape(shape);
    });
    const layer = this.drawingService.getLayer()
    layer.batchDraw();
  }

  private recreateShape(shapeData: any) {
    const startPos = shapeData.start;
    const endPos = shapeData.end;

    this.drawingService.startDrawing(startPos);
    this.drawingService.continueDrawing(endPos);
    this.drawingService.stopDrawing();
  }
}
