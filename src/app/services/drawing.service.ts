import { Injectable } from '@angular/core';
import Konva from 'konva';


interface ShapeInfo {
  shape: Konva.Shape | Konva.Group;
  startCircle: Konva.Circle;
  endCircle: Konva.Circle;
  type: 'wall' | 'window' | 'door';
  height?: number;
}
interface DragOperation {
  shapes: Array<{
    shape: Konva.Shape | Konva.Group,
    oldPosition: Konva.Vector2d,
    newPosition: Konva.Vector2d,
    startCircleOldPosition: Konva.Vector2d | null,
    endCircleOldPosition: Konva.Vector2d | null,
    startCircleNewPosition: Konva.Vector2d | null,
    endCircleNewPosition: Konva.Vector2d | null
  }>;
}

interface EditOperation {
  shape: Konva.Shape | Konva.Group;
  startCircle: Konva.Circle;
  endCircle: Konva.Circle;
  oldStartPosition: Konva.Vector2d;
  oldEndPosition: Konva.Vector2d;
  newStartPosition: Konva.Vector2d;
  newEndPosition: Konva.Vector2d;
}


@Injectable({
  providedIn: 'root'
})
export class DrawingService {
  private layer: Konva.Layer;
  private currentMode: 'wall' | 'window' | 'door' | 'select' | 'adjust' | null = 'wall';
  private isDrawing = false;
  private startPoint: Konva.Vector2d | null = null;
  private currentShape: Konva.Shape | Konva.Group | null = null;
  private startCircle: Konva.Circle | null = null;
  private endCircle: Konva.Circle | null = null;
  private shapes: Array<{ shape: Konva.Shape | Konva.Group, startCircle: Konva.Circle, endCircle: Konva.Circle }> = [];
  private selectionRect: Konva.Rect | null = null;
  private selectedShapes: Set<Konva.Shape | Konva.Group> = new Set();
  private pixelsPerMeter = 30 ; // Adjust this value based on your needs

  private selectionBoundingRect: Konva.Rect | null = null;
  private dragLayer!: Konva.Layer;
  //  isDragging = false;
  private dragStartPosition: Konva.Vector2d | null = null;

   _isDragging = false;
   private distanceLabelsVisible: boolean = true;
   private scaleFactor: number = 1; // 1 unit = 1 meter by default

   private lastCenter: Konva.Vector2d | null = null;
   private lastDist: number = 0;
   private previousMode: 'wall' | 'window' | 'door' | 'select' | 'adjust' | null = null;
   private selectionStartPos: Konva.Vector2d | null = null;

   private undoStack: Array<{ action: string, data: any  }> = [];
   private redoStack: Array<{ action: string, data: any }> = [];
   private readonly MAX_UNDO_STEPS = 30;
   private dragOperation: DragOperation | null = null;
   private issAutoDrawing: boolean = false;

  constructor() {
    this.layer = new Konva.Layer();
    this.dragLayer = new Konva.Layer();

  }

  setStage(stage: Konva.Stage) {
    stage.add(this.layer);
    stage.add(this.dragLayer);
    this.handlePinchZoom(stage);
  }
  get isDragging(): boolean {
    return this._isDragging;
  }
  setScale(pixelsPerMeter: number) {
    const minPixelsPerMeter = 5; // Set this to whatever minimum value you want
    if (pixelsPerMeter > minPixelsPerMeter) {
      const scaleFactor = pixelsPerMeter / this.pixelsPerMeter;
      this.pixelsPerMeter = pixelsPerMeter;
      this.updateAllShapesAndMeasurements(scaleFactor);
    }
  }
  getScale(): number {
    return this.pixelsPerMeter;
  }

  setScaleFactor(factor: number) {
    this.scaleFactor = factor;
  }

  getScaleFactor() {
    return this.scaleFactor;
  }
  setMode(mode: 'wall' | 'window' | 'door' | 'select' | 'adjust' | null) {
    this.currentMode = mode;
    this.updateShapesDraggable();

    // If mode is not null, update previousMode
    if (mode !== null) {
      this.previousMode = mode;
    }
  }
  private updateAllShapesAndMeasurements(scaleFactor: number) {
    this.shapes.forEach(shapeInfo => {
      const start = shapeInfo.startCircle.position();
      const end = shapeInfo.endCircle.position();

      // Scale the start and end positions
      const newStart = {
        x: start.x * scaleFactor,
        y: start.y * scaleFactor
      };
      const newEnd = {
        x: end.x * scaleFactor,
        y: end.y * scaleFactor
      };

      // Update circle positions
      shapeInfo.startCircle.position(newStart);
      shapeInfo.endCircle.position(newEnd);

      // Update shape geometry
      if (shapeInfo.shape instanceof Konva.Group) {
        // For door shapes
        const children = shapeInfo.shape.getChildren();
        if (children[0] instanceof Konva.Arc && children[1] instanceof Konva.Line) {
          const arc = children[0] as Konva.Arc;
          const line = children[1] as Konva.Line;

          const dx = newEnd.x - newStart.x;
          const dy = newEnd.y - newStart.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          arc.outerRadius(distance);
          line.points([0, 0, distance, 0]);

          let rotation = angle * (180 / Math.PI);
          if (rotation < 0) rotation += 360;
          rotation = (rotation + 270) % 360;

          shapeInfo.shape.position(newStart);
          shapeInfo.shape.rotation(rotation);
        } else {
          // For window shapes
          this.updateShapeGeometry(shapeInfo.shape, newStart, newEnd);
        }
      } else {
        // For wall shapes
        this.updateShapeGeometry(shapeInfo.shape, newStart, newEnd);
      }

      // Update measurements
      this.updateMeasurements(shapeInfo.shape, newStart, newEnd);
    });
    this.layer.batchDraw();
  }
  startDrawing(pos: Konva.Vector2d) {
    if (this.currentMode === 'select') {
      this.startSelection(pos);
      return;
    }
    if (!this.currentMode) return;


    this.isDrawing = true;
    this.startPoint = pos;

    this.startCircle = this.createCircle(pos);
    this.layer.add(this.startCircle);

    this.createShape(pos);
    if (this.currentShape) {
      this.layer.add(this.currentShape);
    }

    switch (this.currentMode) {
      case 'wall':
        this.currentShape = new Konva.Line({
          points: [pos.x, pos.y, pos.x, pos.y],
          stroke: 'black',
          strokeWidth: 2
        });
        break;
      case 'window':
        this.currentShape = new Konva.Group();
        const line1 = new Konva.Line({
          points: [pos.x, pos.y, pos.x, pos.y],
          stroke: 'blue',
          strokeWidth: 2
        });
        const line2 = new Konva.Line({
          points: [pos.x, pos.y, pos.x, pos.y],
          stroke: 'blue',
          strokeWidth: 2
        });
        (this.currentShape as Konva.Group).add(line1, line2);
        break;
      case 'door':
        this.currentShape = new Konva.Group();
        const arc = new Konva.Arc({
          x: 0,
          y: 0,
          innerRadius: 0,
          outerRadius: 0,
          angle: 90,
          fill: '',
          stroke: 'green',
          strokeWidth: 2,
          rotation: 0
        });
        const line = new Konva.Line({
          points: [0, 0, 0, 0],
          stroke: 'green',
          strokeWidth: 2
        });
        (this.currentShape as Konva.Group).add(arc, line);
        (this.currentShape as Konva.Group).position(pos);
        break;
    }

    if (this.currentShape) {
      this.layer.add(this.currentShape);
    }
    this.updateShapesDraggable();

  }

  continueDrawing(pos: Konva.Vector2d) {
    if (this.currentMode === 'select') {
      this.updateSelection(pos);
      return;
    }

    if (!this.isDrawing || !this.startPoint || !this.currentShape) return;

    if (!this.endCircle) {
      this.endCircle = this.createCircle(pos);
      this.layer.add(this.endCircle);
    } else {
      this.endCircle.position(pos);
    }

    this.updateShapeGeometry(this.currentShape, this.startPoint, pos);

    // Update the measurements in real-time
    if (this.currentShape) {
      this.updateMeasurements(this.currentShape, this.startPoint, pos);
    }

    this.layer.batchDraw();
  }

  stopDrawing() {
    if (this.currentMode === 'select') {
      this.endSelection();
      return;
    }

    if (this.currentShape && this.startCircle && this.endCircle) {
      // Check if the shape has any length
      const start = this.startCircle.position();
      const end = this.endCircle.position();
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length > 1) { // Only add shapes with some length
        // Ensure that currentMode is of the correct type
        if (this.currentMode === 'wall' || this.currentMode === 'window' || this.currentMode === 'door') {
          const shapeInfo: ShapeInfo = {
            shape: this.currentShape,
            startCircle: this.startCircle,
            endCircle: this.endCircle,
            type: this.currentMode,
          };
          this.shapes.push(shapeInfo);
          this.addToUndoStack('add', shapeInfo);
          this.redoStack = []; // Clear redo stack when a new action is performed

          // Update measurements for the new shape
          this.updateMeasurements(this.currentShape, start, end);
        } else {
          console.error('Invalid shape type:', this.currentMode);
        }
      } else {
        // If it's just a dot, remove it
        this.currentShape.destroy();
        this.startCircle.destroy();
        this.endCircle.destroy();
      }
    }

    this.isDrawing = false;
    this.startPoint = null;
    this.currentShape = null;
    this.startCircle = null;
    this.endCircle = null;
  }




  private updateShapeGeometry(shape: Konva.Shape | Konva.Group, start: Konva.Vector2d, end: Konva.Vector2d) {
    if (shape instanceof Konva.Line) {
      shape.points([start.x, start.y, end.x, end.y]);
    } else if (shape instanceof Konva.Group) {
      const children = shape.getChildren();
      if (children[0] instanceof Konva.Line && children[1] instanceof Konva.Line) {
        // Window
        const offset = 5; // Half of the window thickness
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);
        const length = Math.sqrt(dx * dx + dy * dy);

        const line1 = children[0] as Konva.Line;
        const line2 = children[1] as Konva.Line;

        // Calculate offset perpendicular to the line
        const perpX = Math.sin(angle) * offset;
        const perpY = -Math.cos(angle) * offset;

        // Set points for both lines
        line1.points([
          start.x + perpX, start.y + perpY,
          end.x + perpX, end.y + perpY
        ]);
        line2.points([
          start.x - perpX, start.y - perpY,
          end.x - perpX, end.y - perpY
        ]);

        // Reset the group's position and rotation
        shape.position({ x: 0, y: 0 });
        shape.rotation(0);
      } else if (children[0] instanceof Konva.Arc && children[1] instanceof Konva.Line) {
        // Door
        const arc = children[0] as Konva.Arc;
        const line = children[1] as Konva.Line;

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        arc.outerRadius(distance);
        line.points([0, 0, distance, 0]);

        let rotation = angle * (180 / Math.PI);
        if (rotation < 0) rotation += 360;
        rotation = (rotation + 270) % 360;

        shape.rotation(rotation);
      }
    }
  }


  public updateMeasurements(shape: Konva.Shape | Konva.Group, start: Konva.Vector2d, end: Konva.Vector2d) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const lengthInMeters = (length / this.pixelsPerMeter).toFixed(2);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    // Remove existing measurement texts
    this.layer.getChildren().forEach(child => {
      if (child.name() === `measurement-${shape._id}`) {
        child.destroy();
      }
    });

    const lengthText = new Konva.Text({
      text: `${lengthInMeters}m`,
      fontSize: 14,
      fill: 'black',
      name: 'measurement'
    });

    const angleText = new Konva.Text({
      text: `${Math.abs(angle).toFixed(1)}°`,
      fontSize: 6,
      fill: 'black',
      name: 'measurement'
    });

    // Position the length text
    const midPoint = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2
    };

    if (Math.abs(angle) < 45 || Math.abs(angle) > 135) {
      // For near-horizontal lines, place text above
      lengthText.position({
        x: midPoint.x - lengthText.width() / 2,
        y: midPoint.y - 20
      });
    } else {
      // For near-vertical lines, place text to the side
      lengthText.position({
        x: midPoint.x + 10,
        y: midPoint.y - lengthText.height() / 2
      });
    }

    // Position the angle text
    angleText.position({
      x: end.x + 10,
      y: end.y + 10
    });

    // Check for overlaps and adjust positions
    const existingLabels = this.layer.find('.measurement').map(node => node as Konva.Text);
    let offset = 0;
    while (this.checkLabelOverlap(lengthText, existingLabels)) {
      offset += 20;
      lengthText.y(lengthText.y() - 20);
    }
    while (this.checkLabelOverlap(angleText, existingLabels)) {
      offset += 20;
      angleText.y(angleText.y() - 20);
    }

    // Create a new group for measurements
    const measurementGroup = new Konva.Group({
      name: `measurement-${shape._id}`,
      id: `measurement-${shape._id}`,
      visible: this.distanceLabelsVisible
    });
    measurementGroup.add(lengthText);
    if (Math.abs(angle) > 5 && Math.abs(angle) < 175) {
      measurementGroup.add(angleText);
    }

    // Add the measurement group to the layer
    this.layer.add(measurementGroup);
    this.layer.batchDraw();
  }

  private checkLabelOverlap(newLabel: Konva.Text, existingLabels: Konva.Text[]): boolean {
    const newBox = newLabel.getClientRect();
    for (const existingLabel of existingLabels) {
      const existingBox = existingLabel.getClientRect();
      if (!(newBox.x > existingBox.x + existingBox.width ||
            newBox.x + newBox.width < existingBox.x ||
            newBox.y > existingBox.y + existingBox.height ||
            newBox.y + newBox.height < existingBox.y)) {
        return true;
      }
    }
    return false;
  }


  getLayer(): Konva.Layer {
    return this.layer;
  }

  private createShape(pos: Konva.Vector2d) {

    switch (this.currentMode) {
      case 'wall':
        this.currentShape = new Konva.Line({
          points: [pos.x, pos.y, pos.x, pos.y],
          stroke: 'black',
          strokeWidth: 2
        });
        break;
      case 'window':
        this.currentShape = new Konva.Group();
        const line1 = new Konva.Line({
          points: [pos.x, pos.y, pos.x, pos.y],
          stroke: 'blue',
          strokeWidth: 2
        });
        const line2 = new Konva.Line({
          points: [pos.x, pos.y, pos.x, pos.y],
          stroke: 'blue',
          strokeWidth: 2
        });
        (this.currentShape as Konva.Group).add(line1, line2);
        break;
        case 'door':
          this.currentShape = new Konva.Group();
          const arc = new Konva.Arc({
            x: 0,
            y: 0,
            innerRadius: 0,
            outerRadius: 0,
            angle: 90,
            fill: '',
            stroke: 'green',
            strokeWidth: 2,
            rotation: 0
          });
          const line = new Konva.Line({
            points: [0, 0, 0, 0],
            stroke: 'green',
            strokeWidth: 2
          });
          (this.currentShape as Konva.Group).add(arc, line);
          (this.currentShape as Konva.Group).position(pos);
          break;
  }
    if (this.currentShape) {
      this.layer.add(this.currentShape);
    }
  }

  private createCircle(pos: Konva.Vector2d): Konva.Circle {
    const circle = new Konva.Circle({
      x: pos.x,
      y: pos.y,
      radius: 5,
      fill: 'black',
      draggable: false
    });

    let dragStartPos: Konva.Vector2d;

    circle.on('dragstart', () => {
      dragStartPos = circle.position();
    });

    circle.on('dragmove', () => {
      const shapeInfo = this.shapes.find(s => s.startCircle === circle || s.endCircle === circle);
      if (shapeInfo) {
        const isStart = shapeInfo.startCircle === circle;
        const otherCircle = isStart ? shapeInfo.endCircle : shapeInfo.startCircle;
        this.updateShapeGeometry(shapeInfo.shape, shapeInfo.startCircle.position(), shapeInfo.endCircle.position());
        this.updateMeasurements(shapeInfo.shape, shapeInfo.startCircle.position(), shapeInfo.endCircle.position());
        this.layer.batchDraw();
      }
    });

    circle.on('dragend', () => {
      const shapeInfo = this.shapes.find(s => s.startCircle === circle || s.endCircle === circle);
      if (shapeInfo) {
        const isStart = shapeInfo.startCircle === circle;
        const otherCircle = isStart ? shapeInfo.endCircle : shapeInfo.startCircle;
        const editOperation: EditOperation = {
          shape: shapeInfo.shape,
          startCircle: shapeInfo.startCircle,
          endCircle: shapeInfo.endCircle,
          oldStartPosition: isStart ? dragStartPos : otherCircle.position(),
          oldEndPosition: isStart ? otherCircle.position() : dragStartPos,
          newStartPosition: shapeInfo.startCircle.position(),
          newEndPosition: shapeInfo.endCircle.position()
        };
        this.addToUndoStack('edit', editOperation);
      }
    });

    return circle;
  }
  private findNearbyCircle(pos: Konva.Vector2d): Konva.Circle | null {
    const mergeThreshold = 10; // pixels
    for (const shapeInfo of this.shapes) {
      const circles = [shapeInfo.startCircle, shapeInfo.endCircle];
      for (const circle of circles) {
        const distance = Math.sqrt(Math.pow(circle.x() - pos.x, 2) + Math.pow(circle.y() - pos.y, 2));
        if (distance <= mergeThreshold) {
          return circle;
        }
      }
    }
    return null;
  }

  endSelection() {
    if (!this.selectionRect) return;

    const box = {
      x1: this.selectionRect.x(),
      y1: this.selectionRect.y(),
      x2: this.selectionRect.x() + this.selectionRect.width(),
      y2: this.selectionRect.y() + this.selectionRect.height()
    };

    this.selectShapesInRectangle(box);
    this.selectionRect.destroy();
    this.selectionRect = null;
    this.selectionStartPos = null;
    this.layer.batchDraw();
  }

  private updateShapesDraggable() {
    const isDraggable = this.currentMode !== 'wall' && this.currentMode !== 'window' && this.currentMode !== 'door';
    this.shapes.forEach(shapeInfo => {
      shapeInfo.startCircle.draggable(isDraggable);
      shapeInfo.endCircle.draggable(isDraggable);
    });
  }

  private isCircleIntersectingBox(circle: Konva.Circle, box: {x1: number, y1: number, x2: number, y2: number}): boolean {
    const cx = circle.x();
    const cy = circle.y();
    const radius = circle.radius();

    // Check if circle center is inside the box
    if (cx >= box.x1 && cx <= box.x2 && cy >= box.y1 && cy <= box.y2) {
      return true;
    }

    // Check if circle intersects with box edges
    const closestX = Math.max(box.x1, Math.min(cx, box.x2));
    const closestY = Math.max(box.y1, Math.min(cy, box.y2));
    const distanceX = cx - closestX;
    const distanceY = cy - closestY;
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

    return distanceSquared <= (radius * radius);
  }

  private isGroupIntersectingBox(group: Konva.Group, box: {x1: number, y1: number, x2: number, y2: number}): boolean {
    const children = group.getChildren();
    return children.some(child => {
      if (child instanceof Konva.Line) {
        return this.isLineIntersectingBox(child.points(), box);
      }
      if (child instanceof Konva.Arc) {
        const bbox = child.getClientRect();
        return this.isBoxIntersectingBox(bbox, box);
      }
      return false;
    });
  }

  private isLineIntersectingBox(points: number[], box: {x1: number, y1: number, x2: number, y2: number}): boolean {
    for (let i = 0; i < points.length - 2; i += 2) {
      const x1 = points[i], y1 = points[i+1];
      const x2 = points[i+2], y2 = points[i+3];

      if (this.isLineIntersectingBoxEdges(x1, y1, x2, y2, box)) {
        return true;
      }
    }
    return false;
  }

  private isLineIntersectingBoxEdges(x1: number, y1: number, x2: number, y2: number, box: {x1: number, y1: number, x2: number, y2: number}): boolean {
    return (
      this.lineIntersect(x1, y1, x2, y2, box.x1, box.y1, box.x2, box.y1) ||
      this.lineIntersect(x1, y1, x2, y2, box.x2, box.y1, box.x2, box.y2) ||
      this.lineIntersect(x1, y1, x2, y2, box.x2, box.y2, box.x1, box.y2) ||
      this.lineIntersect(x1, y1, x2, y2, box.x1, box.y2, box.x1, box.y1) ||
      (x1 >= box.x1 && x1 <= box.x2 && y1 >= box.y1 && y1 <= box.y2) ||
      (x2 >= box.x1 && x2 <= box.x2 && y2 >= box.y1 && y2 <= box.y2)
    );
  }

  private lineIntersect(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean {
    const denom = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    if (denom === 0) {
      return false;
    }
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    return (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1);
  }

  private isBoxIntersectingBox(bbox: {x: number, y: number, width: number, height: number}, selectBox: {x1: number, y1: number, x2: number, y2: number}): boolean {
    return !(
      bbox.x > selectBox.x2 ||
      bbox.x + bbox.width < selectBox.x1 ||
      bbox.y > selectBox.y2 ||
      bbox.y + bbox.height < selectBox.y1
    );
  }


  updateSelection(pos: Konva.Vector2d) {
    if (!this.selectionRect || !this.selectionStartPos) return;

    const x = Math.min(this.selectionStartPos.x, pos.x);
    const y = Math.min(this.selectionStartPos.y, pos.y);
    const width = Math.abs(pos.x - this.selectionStartPos.x);
    const height = Math.abs(pos.y - this.selectionStartPos.y);

    this.selectionRect.setAttrs({
      x: x,
      y: y,
      width: width,
      height: height
    });

    this.layer.batchDraw();
  }




  private selectShapesInRectangle(box: {x1: number, y1: number, x2: number, y2: number}) {
    // Clear current selection
    this.clearSelection();

    // Select shapes
    this.shapes.forEach(shapeInfo => {
      const shape = shapeInfo.shape;
      let selected = false;

      if (shape instanceof Konva.Line) {
        selected = this.isLineIntersectingBox(shape.points(), box);
      } else if (shape instanceof Konva.Group) {
        selected = this.isGroupIntersectingBox(shape, box);
      }

      // Check start and end circles
      if (!selected) {
        selected = this.isCircleIntersectingBox(shapeInfo.startCircle, box) ||
                   this.isCircleIntersectingBox(shapeInfo.endCircle, box);
      }

      if (selected) {
        this.selectedShapes.add(shape);
        this.highlightShape(shape);
        // Also select the start and end circles
        this.selectedShapes.add(shapeInfo.startCircle);
        this.selectedShapes.add(shapeInfo.endCircle);
        this.highlightShape(shapeInfo.startCircle);
        this.highlightShape(shapeInfo.endCircle);
      }
    });

    // Select standalone circles (dots)
    this.layer.getChildren((node) => {
      if (node instanceof Konva.Circle && !this.selectedShapes.has(node)) {
        if (this.isCircleIntersectingBox(node, box)) {
          this.selectedShapes.add(node);
          this.highlightShape(node);
        }
      }
      return false;  // Continue iteration
    });

    this.updateSelectionRectangle();
    this.layer.batchDraw();
  }


  clearAllDrawings() {
    // Remove all shapes and their associated elements
    this.shapes.forEach(shapeInfo => {
      shapeInfo.shape.destroy();
      shapeInfo.startCircle.destroy();
      shapeInfo.endCircle.destroy();

      // Remove the measurement display
      const measurementGroup = this.layer.findOne(`#measurement-${shapeInfo.shape._id}`) as Konva.Group;
      if (measurementGroup) {
        measurementGroup.destroy();
      }
    });

    // Clear the shapes array
    this.shapes = [];

    // Remove all remaining shapes and circles from the layer
    this.layer.destroyChildren();

    // Clear the selection
    this.selectedShapes.clear();
    this.selectionBoundingRect = null;

    // Clear any ongoing drawing
    this.isDrawing = false;
    this.startPoint = null;
    this.currentShape = null;
    this.startCircle = null;
    this.endCircle = null;

    // Redraw the layer
    this.layer.batchDraw();
  }


  private findParentShape(shape: Konva.Shape): Konva.Shape | Konva.Group | null {
    let parent = shape.getParent();
    while (parent) {
      if (parent instanceof Konva.Group) {
        return parent;
      }
      parent = parent.getParent();
    }
    return shape;
  }



  startSelection(pos: Konva.Vector2d) {
    this.selectionStartPos = pos;
    this.selectionRect = new Konva.Rect({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      fill: 'rgba(0, 0, 255, 0.3)',
      stroke: 'blue',
      strokeWidth: 1
    });
    this.layer.add(this.selectionRect);
  }



  private getOriginalColor(shape: Konva.Shape | Konva.Group): string {
    switch (this.getShapeType(shape)) {
      case 'wall':
        return 'black';
      case 'window':
        return 'blue';
      case 'door':
        return 'green';
      default:
        return 'black';
    }
  }

  public getShapeType(shape: Konva.Shape | Konva.Group): 'wall' | 'window' | 'door' | 'unknown' {
    if (shape instanceof Konva.Line) {
      return 'wall';
    } else if (shape instanceof Konva.Group) {
      const children = shape.getChildren();
      if (children[0] instanceof Konva.Line && children[1] instanceof Konva.Line) {
        return 'window';
      } else if (children[0] instanceof Konva.Arc && children[1] instanceof Konva.Line) {
        return 'door';
      }
    }
    return 'unknown';
  }
  // private highlightShape(shape: Konva.Shape | Konva.Group) {
  //   if (shape instanceof Konva.Line) {
  //     shape.stroke('blue');
  //   } else if (shape instanceof Konva.Group) {
  //     shape.getChildren().forEach(child => {
  //       if (child instanceof Konva.Shape) {
  //         child.stroke('blue');
  //       }
  //     });
  //   } else if (shape instanceof Konva.Circle) {
  //     shape.stroke('blue');
  //   }
  //   this.updateSelectionRectangle();
  // }


  private updateSelectionRectangle() {
    if (this.selectedShapes.size === 0) {
      if (this.selectionBoundingRect) {
        this.selectionBoundingRect.destroy();
        this.selectionBoundingRect = null;
      }
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    this.selectedShapes.forEach(shape => {
      const bbox = shape.getClientRect();
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    });

    if (!this.selectionBoundingRect) {
      this.selectionBoundingRect = new Konva.Rect({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        stroke: 'blue',
        strokeWidth: 2,
        dash: [5, 5],
        fill: 'rgba(0, 0, 255, 0.05)',
        listening: true,
      });
      this.layer.add(this.selectionBoundingRect);
    } else {
      this.selectionBoundingRect.setAttrs({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      });
    }

    // Add click event to the selection rectangle
    this.selectionBoundingRect.off('mousedown touchstart');
    this.selectionBoundingRect.on('mousedown touchstart', (e) => {
      e.cancelBubble = true; // Prevent the event from bubbling up
      const stage = this.selectionBoundingRect?.getStage();
      const pos = stage?.getPointerPosition();
      if (pos) {
        this.startDragging(pos);
      }
    });

    this.selectionBoundingRect.moveToTop();
    this.layer.batchDraw();
  }

  clearSelection() {
    this.selectedShapes.forEach(shape => this.unhighlightShape(shape));
    this.selectedShapes.clear();
    if (this.selectionBoundingRect) {
      this.selectionBoundingRect.destroy();
      this.selectionBoundingRect = null;
    }
    this.layer.batchDraw();
  }
  continueDragging(pos: Konva.Vector2d) {
    if (this._isDragging && this.dragStartPosition) {
      const dx = pos.x - this.dragStartPosition.x;
      const dy = pos.y - this.dragStartPosition.y;

      this.selectedShapes.forEach(shape => {
        shape.move({x: dx, y: dy});

        const shapeInfo = this.shapes.find(s => s.shape === shape);
        if (shapeInfo) {
          if (!this.selectedShapes.has(shapeInfo.startCircle)) {
            shapeInfo.startCircle.move({x: dx, y: dy});
          }
          if (!this.selectedShapes.has(shapeInfo.endCircle)) {
            shapeInfo.endCircle.move({x: dx, y: dy});
          }

          if (this.getShapeType(shape) === 'window') {
            this.updateWindowGeometry(shape as Konva.Group, shapeInfo.startCircle, shapeInfo.endCircle);
          }

          const measurementGroup = this.layer.findOne(`#measurement-${shape._id}`) as Konva.Group;
          if (measurementGroup) {
            measurementGroup.move({x: dx, y: dy});
          }
          this.updateMeasurements(shape, shapeInfo.startCircle.position(), shapeInfo.endCircle.position());
        }
      });

      if (this.selectionBoundingRect) {
        this.selectionBoundingRect.move({x: dx, y: dy});
      }

      this.dragStartPosition = pos;
      this.dragLayer.batchDraw();
      this.layer.batchDraw();
    }
  }

  private unhighlightShape(shape: Konva.Shape | Konva.Group) {
    const originalColor = shape.getAttr('originalColor') || this.getOriginalColor(shape);

    if (shape instanceof Konva.Line) {
      shape.stroke(originalColor);
    } else if (shape instanceof Konva.Group) {
      shape.getChildren().forEach(child => {
        if (child instanceof Konva.Shape) {
          child.stroke(originalColor);
        }
      });
    } else if (shape instanceof Konva.Circle) {
      shape.stroke(originalColor);
    }
  }

  private highlightShape(shape: Konva.Shape | Konva.Group) {
    const originalColor = this.getOriginalColor(shape);
    const highlightColor = 'blue';

    if (shape instanceof Konva.Line) {
      shape.stroke(highlightColor);
    } else if (shape instanceof Konva.Group) {
      shape.getChildren().forEach(child => {
        if (child instanceof Konva.Shape) {
          child.stroke(highlightColor);
        }
      });
    } else if (shape instanceof Konva.Circle) {
      shape.stroke(highlightColor);
    }

    // Store the original color for later use
    shape.setAttr('originalColor', originalColor);
  }


  startDragging(pos: Konva.Vector2d) {
    if (this.selectedShapes.size > 0) {
      this._isDragging = true;
      this.dragStartPosition = pos;

      this.dragOperation = {
        shapes: Array.from(this.selectedShapes).map(shape => {
          const shapeInfo = this.shapes.find(s => s.shape === shape);
          return {
            shape,
            oldPosition: shape.position(),
            newPosition: shape.position(), // Will be updated in stopDragging
            startCircleOldPosition: shapeInfo ? shapeInfo.startCircle.position() : null,
            endCircleOldPosition: shapeInfo ? shapeInfo.endCircle.position() : null,
            startCircleNewPosition: null, // Will be updated in stopDragging
            endCircleNewPosition: null // Will be updated in stopDragging
          };
        })
      };
      // Move selected shapes and the selection rectangle to the drag layer
      this.selectedShapes.forEach(shape => {
        shape.moveTo(this.dragLayer);
      });
      if (this.selectionBoundingRect) {
        this.selectionBoundingRect.moveTo(this.dragLayer);
      }

      this.layer.batchDraw();
      this.dragLayer.batchDraw();
    }
  }
  private updateWindowGeometry(windowGroup: Konva.Group, startCircle: Konva.Circle, endCircle: Konva.Circle) {
    const startPos = startCircle.position();
    const endPos = endCircle.position();

    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const angle = Math.atan2(dy, dx);
    const length = Math.sqrt(dx * dx + dy * dy);

    windowGroup.rotation(angle * 180 / Math.PI);
    windowGroup.position(startPos);

    const offset = 5; // Half of the window thickness
    const children = windowGroup.getChildren();

    children.forEach((child, index) => {
      if (child instanceof Konva.Line) {
        const sign = index === 0 ? 1 : -1;
        child.points([0, sign * offset, length, sign * offset]);
      }
    });
  }

  stopDragging() {
    if (this._isDragging) {
      this._isDragging = false;
      this.dragStartPosition = null;

      this.selectedShapes.forEach(shape => {
        shape.moveTo(this.layer);

        const shapeInfo = this.shapes.find(s => s.shape === shape);
        if (shapeInfo) {
          shapeInfo.startCircle.moveTo(this.layer);
          shapeInfo.endCircle.moveTo(this.layer);

          const startPos = shapeInfo.startCircle.position();
          const endPos = shapeInfo.endCircle.position();

          if (shape instanceof Konva.Line) {
            shape.points([startPos.x, startPos.y, endPos.x, endPos.y]);
            shape.position({x: 0, y: 0});
          } else if (shape instanceof Konva.Group) {
            if (this.getShapeType(shape) === 'window') {
              this.updateWindowGeometry(shape, shapeInfo.startCircle, shapeInfo.endCircle);
            } else if (this.getShapeType(shape) === 'door') {
              // Update door geometry (existing code)
            }
          }

          this.updateMeasurements(shape, shapeInfo.startCircle.position(), shapeInfo.endCircle.position());
        }
        if (this.dragOperation) {
          this.dragOperation.shapes.forEach(item => {
            item.newPosition = item.shape.position();
            const shapeInfo = this.shapes.find(s => s.shape === item.shape);
            if (shapeInfo) {
              item.startCircleNewPosition = shapeInfo.startCircle.position();
              item.endCircleNewPosition = shapeInfo.endCircle.position();
            }
          });
          this.addToUndoStack('drag', this.dragOperation);
          this.dragOperation = null;
        }
        const measurementGroup = this.dragLayer.findOne(`#measurement-${shape._id}`) as Konva.Group;
        if (measurementGroup) {
          measurementGroup.moveTo(this.layer);
        }
      });

      if (this.selectionBoundingRect) {
        this.selectionBoundingRect.moveTo(this.layer);
      }

      this.updateSelectionRectangle();
      this.layer.batchDraw();
      this.dragLayer.batchDraw();
    }
  }

  deleteSelectedShapes() {
    if (this.selectedShapes.size === 0) return;

    this.selectedShapes.forEach(shape => {
      // Find the associated shapeInfo
      const shapeIndex = this.shapes.findIndex(s => s.shape === shape);
      if (shapeIndex !== -1) {
        const shapeInfo = this.shapes[shapeIndex];

        // Remove the shape and its associated circles
        shape.destroy();
        shapeInfo.startCircle.destroy();
        shapeInfo.endCircle.destroy();

        // Remove the measurement display
        const measurementGroup = this.layer.findOne(`#measurement-${shape._id}`) as Konva.Group;
        if (measurementGroup) {
          measurementGroup.destroy();
        }

        // Remove the shapeInfo from the shapes array
        this.shapes.splice(shapeIndex, 1);
      } else {
        // If it's not in shapes array, it might be a single-point shape
        shape.destroy();
      }
    });

    // Clear the selection
    this.selectedShapes.clear();
    if (this.selectionBoundingRect) {
      this.selectionBoundingRect.destroy();
      this.selectionBoundingRect = null;
    }

    // Redraw the layer
    this.layer.batchDraw();
  }


  selectShapeAtPoint(pos: Konva.Vector2d) {
    const shape = this.layer.getIntersection(pos);
    if (shape) {
      const parentShape = this.findParentShape(shape);
      if (parentShape) {
        if (this.selectedShapes.has(parentShape)) {
          this.selectedShapes.delete(parentShape);
          this.unhighlightShape(parentShape);
        } else {
          this.selectedShapes.add(parentShape);
          this.highlightShape(parentShape);
        }
      }
    } else {
      // Check for single-point shapes (circles)
      const circles = this.layer.getChildren(node => {
        return node instanceof Konva.Circle &&
               node.getAttr('x') === pos.x &&
               node.getAttr('y') === pos.y;
      });
      if (circles.length > 0) {
        const circle = circles[0] as Konva.Circle;
        if (this.selectedShapes.has(circle)) {
          this.selectedShapes.delete(circle);
          circle.stroke('black');
        } else {
          this.selectedShapes.add(circle);
          circle.stroke('blue');
        }
      } else {
        // If clicked on empty space, clear selection
        this.clearSelection();
      }
    }
    this.layer.batchDraw();
  }

  addShape(shapeInfo: { shape: Konva.Shape | Konva.Group, startCircle: Konva.Circle, endCircle: Konva.Circle }) {
    this.shapes.push(shapeInfo);
    this.updateShapesDraggable();

    const measurementGroup = this.layer.findOne(`#measurement-${shapeInfo.shape._id}`) as Konva.Group;
    if (measurementGroup) {
      measurementGroup.visible(this.distanceLabelsVisible);
    }
  }


  toggleDistanceLabels() {
    this.distanceLabelsVisible = !this.distanceLabelsVisible;
    this.updateAllMeasurements();

  }


  private updateAllMeasurements() {
    this.shapes.forEach(shapeInfo => {
      const measurementGroup = this.layer.findOne(`#measurement-${shapeInfo.shape._id}`) as Konva.Group;
      if (measurementGroup) {
        measurementGroup.visible(this.distanceLabelsVisible);
      }
    });
    this.layer.batchDraw();
  }
  getAllShapes(): Array<{ shape: Konva.Shape | Konva.Group, startCircle: Konva.Circle, endCircle: Konva.Circle }> {
    return this.shapes;
  }

  downloadImage(fileName: string = 'floor_plan.png') {
    // Get the Konva stage
    const stage = this.layer.getStage();
    if (!stage) {
      console.error('Stage not found');
      return;
    }

    // Create a temporary white rectangle as background
    const bgRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: stage.width(),
      height: stage.height(),
      fill: 'white',
    });

    // Add the white rectangle to the bottom of the layer
    this.layer.add(bgRect);
    bgRect.moveToBottom();

    // Convert the stage to a data URL
    const dataURL = stage.toDataURL({
      pixelRatio: 2,
      mimeType: 'image/png',
      quality: 1
    });

    // Remove the temporary background
    bgRect.destroy();

    // Create a temporary link element
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataURL;

    // Append to the document, trigger a click, and then remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Redraw the layer to ensure the background is removed from view
    this.layer.batchDraw();
  }

// In drawing.service.ts

generateThumbnail(width: number, height: number): string {
  const stage = this.layer.getStage();
  if (!stage) {
    console.error('Stage not found');
    return '';
  }

  // Create a temporary white rectangle as background
  const bgRect = new Konva.Rect({
    x: 0,
    y: 0,
    width: stage.width(),
    height: stage.height(),
    fill: 'white',
  });

  // Add the white rectangle to the bottom of the layer
  this.layer.add(bgRect);
  bgRect.moveToBottom();

  // Convert the stage to a data URL
  const dataURL = stage.toDataURL({
    width: width,
    height: height,
    pixelRatio: 1,
    mimeType: 'image/png',
    quality: 0.8
  });

  // Remove the temporary background
  bgRect.destroy();
  this.layer.batchDraw();

  return dataURL;
}



handlePinchZoom(stage: Konva.Stage) {
  stage.on('touchstart', (e) => {
    if (e.evt.touches.length === 2) {
      // Store the current mode and set it to null
      this.previousMode = this.currentMode;
      this.setMode(null);

      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];
      this.lastCenter = this.getCenter(touch1, touch2);
      this.lastDist = this.getDistance(touch1, touch2);
    }
  });

  stage.on('touchmove', (e) => {
    e.evt.preventDefault();
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && touch2) {
      if (!this.lastCenter) {
        this.lastCenter = this.getCenter(touch1, touch2);
        this.lastDist = this.getDistance(touch1, touch2);
        return;
      }

      const newCenter = this.getCenter(touch1, touch2);
      const newDist = this.getDistance(touch1, touch2);

      const scale = newDist / this.lastDist;

      // Adjust pixelsPerMeter based on the scale
      const newPixelsPerMeter = this.pixelsPerMeter * scale;
      this.setScale(newPixelsPerMeter);

      // Update last values
      this.lastCenter = newCenter;
      this.lastDist = newDist;
    }
  });

  stage.on('touchend', (e) => {
    if (e.evt.touches.length < 2) {
      // Reset zoom-related variables
      this.lastCenter = null;
      this.lastDist = 0;

      // Set mode back to 'select' or the previous mode
      if (this.currentMode === null) {
        this.setMode(this.previousMode || 'select');
      }
    }
  });
}

private getCenter(touch1: Touch, touch2: Touch): Konva.Vector2d {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2
  };
}

private getDistance(touch1: Touch, touch2: Touch): number {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

public addToUndoStack(action: string, data: ShapeInfo | DragOperation | EditOperation) {
  this.undoStack.push({ action, data });
  if (this.undoStack.length > this.MAX_UNDO_STEPS) {
    this.undoStack.shift();
  }
  this.redoStack = []; // Clear redo stack when a new action is performed
}


private undoAdd(shapeInfo: ShapeInfo) {
  if (this.shapes.length === 0) {
    console.log("No shapes to remove");
    return;
  }
  console.log(this.undoStack)
  const lastShapeInfo = this.shapes[this.shapes.length - 1];
  const index = this.shapes.length - 1;

  console.log(`Removing shape at index: ${index}`);

  this.shapes.splice(index, 1);
  lastShapeInfo.shape.destroy();
  lastShapeInfo.startCircle.destroy();
  lastShapeInfo.endCircle.destroy();

  // Remove the measurement display
  const measurementGroup = this.layer.findOne(`#measurement-${lastShapeInfo.shape._id}`) as Konva.Group;
  if (measurementGroup) {
    measurementGroup.destroy();
  }

  // Remove edit operations for this shape
  this.removeEditOperationsForShape(lastShapeInfo.shape._id);

  this.layer.batchDraw();
}
private undo() {
  if (this.undoStack.length === 0) return;

  const lastAction = this.undoStack.pop();
  if (lastAction) {
    switch (lastAction.action) {
      case 'add':
        this.undoAdd(lastAction.data as ShapeInfo);
        break;
      case 'drag':
        this.undoDrag(lastAction.data as DragOperation);
        break;
      case 'edit':
        this.undoEdit(lastAction.data as EditOperation);
        break;
    }
    this.redoStack.push(lastAction);
  }
}

private redo() {
  if (this.redoStack.length === 0) return;

  const nextAction = this.redoStack.pop();
  if (nextAction) {
    switch (nextAction.action) {
      case 'add':
        this.redoAdd(nextAction.data as ShapeInfo);
        break;
      case 'drag':
        this.redoDrag(nextAction.data as DragOperation);
        break;
      case 'edit':
        this.redoEdit(nextAction.data as EditOperation);
        break;
    }
    this.undoStack.push(nextAction);
    if (this.undoStack.length > this.MAX_UNDO_STEPS) {
      this.undoStack.shift();
    }
  }
}
private redoAdd(shapeInfo: ShapeInfo) {
  if (!shapeInfo) {
    console.error('ShapeInfo is undefined in redoAdd');
    return;
  }

  // Recreate start and end circles
  const newStartCircle = this.createCircle(shapeInfo.startCircle.position());
  const newEndCircle = this.createCircle(shapeInfo.endCircle.position());

  // Set the current mode to the shape type
  this.currentMode = shapeInfo.type;

  // Create the shape
  let newShape: Konva.Shape | Konva.Group | null = null;
  const startPos = newStartCircle.position();
  const endPos = newEndCircle.position();

  switch (shapeInfo.type) {
    case 'wall':
      newShape = new Konva.Line({
        points: [startPos.x, startPos.y, endPos.x, endPos.y],
        stroke: 'black',
        strokeWidth: 2,
      });
      break;
    case 'window':
      newShape = new Konva.Group({
      });
      const line1 = new Konva.Line({
        points: [startPos.x, startPos.y, endPos.x, endPos.y],
        stroke: 'blue',
        strokeWidth: 2
      });
      const line2 = new Konva.Line({
        points: [startPos.x, startPos.y, endPos.x, endPos.y],
        stroke: 'blue',
        strokeWidth: 2
      });
      newShape.add(line1, line2);
      break;
    case 'door':
      newShape = new Konva.Group({
      });
      const arc = new Konva.Arc({
        x: 0,
        y: 0,
        innerRadius: 0,
        outerRadius: 0,
        angle: 90,
        fill: '',
        stroke: 'green',
        strokeWidth: 2,
        rotation: 0
      });
      const line = new Konva.Line({
        points: [0, 0, 0, 0],
        stroke: 'green',
        strokeWidth: 2
      });
      newShape.add(arc, line);
      newShape.position(startPos);
      break;
    default:
      console.error('Unknown shape type:', shapeInfo.type);
      return;
  }

  if (!newShape) {
    console.error('Failed to create new shape');
    return;
  }

  // Update the shape's geometry
  this.updateShapeGeometry(newShape, startPos, endPos);

  // Add shapes to the layer
  this.layer.add(newShape);
  this.layer.add(newStartCircle);
  this.layer.add(newEndCircle);

  // Create new shapeInfo object
  const newShapeInfo: ShapeInfo = {
    shape: newShape,
    startCircle: newStartCircle,
    endCircle: newEndCircle,
    type: shapeInfo.type,
  };

  // Add to shapes array
  this.shapes.push(newShapeInfo);

  // Recreate the measurement display
  this.updateMeasurements(newShape, startPos, endPos);

  // Reset currentMode
  this.currentMode = null;
  this.removeEditOperationsForShape(newShape._id);

  this.layer.batchDraw();
}
public performRedo() {
  this.redo();
}
public performUndo() {
  this.undo();
}

public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private undoDrag(dragOperation: DragOperation) {
    dragOperation.shapes.forEach(item => {
      const shapeInfo = this.shapes.find(s => s.shape === item.shape);
      if (shapeInfo && item.startCircleOldPosition && item.endCircleOldPosition) {
        // Update circle positions
        shapeInfo.startCircle.position(item.startCircleOldPosition);
        shapeInfo.endCircle.position(item.endCircleOldPosition);

        // Update shape position and geometry
        if (item.shape instanceof Konva.Line) {
          // For walls
          item.shape.points([
            item.startCircleOldPosition.x, item.startCircleOldPosition.y,
            item.endCircleOldPosition.x, item.endCircleOldPosition.y
          ]);
          item.shape.position({x: 0, y: 0}); // Reset position as points are absolute
        } else {
          // For doors and windows
          item.shape.position(item.oldPosition);
          this.updateShapeGeometry(item.shape, item.startCircleOldPosition, item.endCircleOldPosition);
        }

        // Update measurements
        this.updateMeasurements(item.shape, item.startCircleOldPosition, item.endCircleOldPosition);
      }
    });
    this.updateSelectionRectangle();
    this.layer.batchDraw();
  }
  private redoDrag(dragOperation: DragOperation) {
    dragOperation.shapes.forEach(item => {
      const shapeInfo = this.shapes.find(s => s.shape === item.shape);
      if (shapeInfo && item.startCircleNewPosition && item.endCircleNewPosition) {
        // Update circle positions
        shapeInfo.startCircle.position(item.startCircleNewPosition);
        shapeInfo.endCircle.position(item.endCircleNewPosition);

        // Update shape position and geometry
        if (item.shape instanceof Konva.Line) {
          // For walls
          item.shape.points([
            item.startCircleNewPosition.x, item.startCircleNewPosition.y,
            item.endCircleNewPosition.x, item.endCircleNewPosition.y
          ]);
          item.shape.position({x: 0, y: 0}); // Reset position as points are absolute
        } else {
          // For doors and windows
          item.shape.position(item.newPosition);
          this.updateShapeGeometry(item.shape, item.startCircleNewPosition, item.endCircleNewPosition);
        }

        // Update measurements
        this.updateMeasurements(item.shape, item.startCircleNewPosition, item.endCircleNewPosition);
      }
    });
    this.updateSelectionRectangle();
    this.layer.batchDraw();
  }


  private undoEdit(editOperation: EditOperation) {
  editOperation.startCircle.position(editOperation.oldStartPosition);
  editOperation.endCircle.position(editOperation.oldEndPosition);
  this.updateShapeGeometry(editOperation.shape, editOperation.oldStartPosition, editOperation.oldEndPosition);
  this.updateMeasurements(editOperation.shape, editOperation.oldStartPosition, editOperation.oldEndPosition);
  this.layer.batchDraw();
}

private redoEdit(editOperation: EditOperation) {
  editOperation.startCircle.position(editOperation.newStartPosition);
  editOperation.endCircle.position(editOperation.newEndPosition);
  this.updateShapeGeometry(editOperation.shape, editOperation.newStartPosition, editOperation.newEndPosition);
  this.updateMeasurements(editOperation.shape, editOperation.newStartPosition, editOperation.newEndPosition);
  this.layer.batchDraw();
}

private removeEditOperationsForShape(shapeId: any) {
  this.undoStack = this.undoStack.filter(action =>
    !(action.action === 'edit' && (action.data as EditOperation).shape._id === shapeId)
  );
  this.redoStack = this.redoStack.filter(action =>
    !(action.action === 'edit' && (action.data as EditOperation).shape._id === shapeId)
  );
}

// disableInteractions() {
//   const stage = this.layer.getStage();
//   if (stage) {
//     stage.listening(false);
//     this.layer.listening(false);
//   }
// }

// enableInteractions() {
//   const stage = this.layer.getStage();
//   if (stage) {
//     stage.listening(true);
//     this.layer.listening(true);
//   }
// }

setAutoDrawingState(isAutoDrawing: boolean) {
  this.issAutoDrawing = isAutoDrawing;
}

isAutoDrawing(): boolean {
  return this.issAutoDrawing;
}
}
