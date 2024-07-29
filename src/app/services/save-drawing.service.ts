import { Injectable } from '@angular/core';
import { DrawingService } from './drawing.service';


interface DrawingData {
  shapes: any;
  title: string;
  description: string;
  thumbnail: string;
}
@Injectable({
  providedIn: 'root'
})
export class SaveDrawingService {
    private shapes : any;
  constructor(private drawingService : DrawingService) {
    this.shapes = this.drawingService.getAllShapes();
   }


  serializeDrawing(): string {
    this.shapes = this.drawingService.getAllShapes();
    const serializedShapes = this.shapes.map((shapeInfo : any) => {
      console.log(shapeInfo)
      console.log('me')
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
  saveDrawingToSession(id: string, title: string, description: string) {
    const thumbnail = this.drawingService.generateThumbnail(500, 500); // Adjust size as needed

    const drawingData: DrawingData = {
      shapes: this.serializeDrawing(),
      title: title,
      description: description,
      thumbnail: thumbnail
    };
    localStorage.setItem(`${id}`, JSON.stringify(drawingData));
  }

  loadDrawingFromSession(id: string): { loaded: boolean, title?: string, description?: string, thumbnail?: string } {
    const serializedData = localStorage.getItem(`${id}`);
    if (serializedData) {
      const drawingData: DrawingData = JSON.parse(serializedData);
      this.deserializeDrawing(drawingData.shapes);
      return {
        loaded: true,
        title: drawingData.title,
        description: drawingData.description,
        thumbnail: drawingData.thumbnail
      };
    }
    return { loaded: false };
  }
}
