import { Injectable } from '@angular/core';
import Konva from 'konva';


interface ShapeInfo {
  shape: Konva.Shape | Konva.Group;
  startCircle: Konva.Circle;
  endCircle: Konva.Circle;
  type: 'wall' | 'window' | 'door';
  height?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DrawingService {
  private layer: Konva.Layer;
  private currentMode: 'wall' | 'window' | 'door' | 'select' | 'adjust' | null = null;
  private isDrawing = false;
  private startPoint: Konva.Vector2d | null = null;
  private currentShape: Konva.Shape | Konva.Group | null = null;
  private startCircle: Konva.Circle | null = null;
  private endCircle: Konva.Circle | null = null;
  private shapes: Array<{ shape: Konva.Shape | Konva.Group, startCircle: Konva.Circle, endCircle: Konva.Circle }> = [];
  private selectionRect: Konva.Rect | null = null;
  private selectedShapes: Set<Konva.Shape | Konva.Group> = new Set();
  private pixelsPerMeter = 100; // Adjust this value based on your needs

  private selectionBoundingRect: Konva.Rect | null = null;
  private dragLayer!: Konva.Layer;
  //  isDragging = false;
  private dragStartPosition: Konva.Vector2d | null = null;

   _isDragging = false;
   private distanceLabelsVisible: boolean = true;


  constructor() {
    this.layer = new Konva.Layer();
    this.dragLayer = new Konva.Layer();

  }

  setStage(stage: Konva.Stage) {
    stage.add(this.layer);
    stage.add(this.dragLayer);

  }
  get isDragging(): boolean {
    return this._isDragging;
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
    this.layer.batchDraw();
  }

  stopDrawing() {
    if (this.currentMode === 'select') {
      this.endSelection();
      return;
    }

    if (this.currentShape && this.startCircle && this.endCircle) {
      this.shapes.push({
        shape: this.currentShape,
        startCircle: this.startCircle,
        endCircle: this.endCircle
      });
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
      this.updateMeasurements(shape, start, end);
    } else if (shape instanceof Konva.Group) {
      const children = shape.getChildren();
      if (children[0] instanceof Konva.Line) {
        // Window
        const offset = 5;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const dx = offset * Math.sin(angle);
        const dy = offset * Math.cos(angle);

        const line1 = children[0] as Konva.Line;
        const line2 = children[1] as Konva.Line;

        line1.points([
          start.x + dx, start.y - dy,
          end.x + dx, end.y - dy
        ]);
        line2.points([
          start.x - dx, start.y + dy,
          end.x - dx, end.y + dy
        ]);
        this.updateMeasurements(shape, start, end);
      } else if (children[0] instanceof Konva.Arc) {
        // Door
        const arc = children[0] as Konva.Arc;
        const doorLine = children[1] as Konva.Line;

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        arc.outerRadius(distance);
        let rotation = angle * (180 / Math.PI);
        if (rotation < 0) rotation += 360;
        shape.rotation(-rotation);
        shape.position(start);

        doorLine.points([0, 0, distance, 0]);
        this.updateMeasurements(shape, start, end);
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
    fontSize: 14,
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
      draggable: false // Initially set to false, will be updated based on mode
    });

  circle.on('dragmove', () => {
  const shapeInfo = this.shapes.find(s => s.startCircle === circle || s.endCircle === circle);
  if (shapeInfo) {
    const isStart = shapeInfo.startCircle === circle;
    const otherCircle = isStart ? shapeInfo.endCircle : shapeInfo.startCircle;
    this.updateShapeGeometry(shapeInfo.shape, shapeInfo.startCircle.position(), shapeInfo.endCircle.position());
    this.layer.batchDraw();
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


  private updateShapesDraggable() {
    const isDraggable = this.currentMode !== 'wall' && this.currentMode !== 'window' && this.currentMode !== 'door';
    this.shapes.forEach(shapeInfo => {
      shapeInfo.startCircle.draggable(isDraggable);
      shapeInfo.endCircle.draggable(isDraggable);
    });
  }
  setMode(mode: 'wall' | 'window' | 'door' | 'select' | 'adjust' | null) {
    this.currentMode = mode;
    this.updateShapesDraggable();
  }





  updateSelection(pos: Konva.Vector2d) {
    if (!this.selectionRect) return;

    const startX = this.selectionRect.x();
    const startY = this.selectionRect.y();

    let width = pos.x - startX;
    let height = pos.y - startY;

    let newX = startX;
    let newY = startY;

    if (width < 0) {
      width = Math.abs(width);
      newX = pos.x;
    }

    if (height < 0) {
      height = Math.abs(height);
      newY = pos.y;
    }

    this.selectionRect.x(newX);
    this.selectionRect.y(newY);
    this.selectionRect.width(width);
    this.selectionRect.height(height);

    this.layer.batchDraw();
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


  startSelection(pos: Konva.Vector2d) {
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


  endSelection() {
    if (!this.selectionRect) return;

    this.selectShapesInRectangle(this.selectionRect);
    this.selectionRect.destroy();
    this.selectionRect = null;
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
      // If clicked on empty space, clear selection
      this.clearSelection();
    }
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



  private selectShapesInRectangle(rect: Konva.Rect) {
    const selectBox = {
      x1: Math.min(rect.x(), rect.x() + rect.width()),
      y1: Math.min(rect.y(), rect.y() + rect.height()),
      x2: Math.max(rect.x(), rect.x() + rect.width()),
      y2: Math.max(rect.y(), rect.y() + rect.height())
    };

    this.shapes.forEach(shapeInfo => {
      const shape = shapeInfo.shape;
      let selected = false;

      if (shape instanceof Konva.Line) {
        selected = this.isLineIntersectingBox(shape.points(), selectBox);
      } else if (shape instanceof Konva.Group) {
        selected = this.isGroupIntersectingBox(shape, selectBox);
      }

      if (!selected) {
        selected = this.isCircleIntersectingBox(shapeInfo.startCircle, selectBox) ||
                   this.isCircleIntersectingBox(shapeInfo.endCircle, selectBox);
      }

      if (selected) {
        this.selectedShapes.add(shape);
        this.highlightShape(shape);
      } else {
        this.selectedShapes.delete(shape);
        this.unhighlightShape(shape);
      }
    });

    this.layer.batchDraw();
  }




  private getOriginalColor(shape: Konva.Shape): string {
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

  private getShapeType(shape: Konva.Shape | Konva.Group): 'wall' | 'window' | 'door' | 'unknown' {
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

  private highlightShape(shape: Konva.Shape | Konva.Group) {
    if (shape instanceof Konva.Line) {
      shape.stroke('blue');
    } else if (shape instanceof Konva.Group) {
      shape.getChildren().forEach(child => {
        if (child instanceof Konva.Shape) {
          child.stroke('blue');
        }
      });
    }
    this.updateSelectionRectangle();
  }

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

  private unhighlightShape(shape: Konva.Shape | Konva.Group) {
    if (shape instanceof Konva.Line) {
      shape.stroke(this.getOriginalColor(shape));
    } else if (shape instanceof Konva.Group) {
      shape.getChildren().forEach(child => {
        if (child instanceof Konva.Shape) {
          child.stroke(this.getOriginalColor(child));
        }
      });
    }
    this.updateSelectionRectangle();
  }

  startDragging(pos: Konva.Vector2d) {
    if (this.selectedShapes.size > 0) {
      this._isDragging = true;
      this.dragStartPosition = pos;

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

  continueDragging(pos: Konva.Vector2d) {
    if (this._isDragging && this.dragStartPosition) {
      const dx = pos.x - this.dragStartPosition.x;
      const dy = pos.y - this.dragStartPosition.y;

      // Move all selected shapes and their associated elements as a group
      this.selectedShapes.forEach(shape => {
        // Move the main shape
        shape.move({x: dx, y: dy});

        // Find and move associated circles and measurement displays
        const shapeInfo = this.shapes.find(s => s.shape === shape);
        if (shapeInfo) {
          // Move start and end circles
          shapeInfo.startCircle.move({x: dx, y: dy});
          shapeInfo.endCircle.move({x: dx, y: dy});

          // Move measurement displays
          const measurementGroup = this.layer.findOne(`#measurement-${shape._id}`) as Konva.Group;
          if (measurementGroup) {
            measurementGroup.move({x: dx, y: dy});
          }
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


  stopDragging() {
    if (this._isDragging) {
      this._isDragging = false;
      this.dragStartPosition = null;

      // Move selected shapes and the selection rectangle back to the main layer
      this.selectedShapes.forEach(shape => {
        shape.moveTo(this.layer);

        // Move associated circles back to the main layer
        const shapeInfo = this.shapes.find(s => s.shape === shape);
        if (shapeInfo) {
          shapeInfo.startCircle.moveTo(this.layer);
          shapeInfo.endCircle.moveTo(this.layer);
        }

        // Move measurement displays back to the main layer
        const measurementGroup = this.dragLayer.findOne(`#measurement-${shape._id}`) as Konva.Group;
        if (measurementGroup) {
          measurementGroup.moveTo(this.layer);
        }
      });

      if (this.selectionBoundingRect) {
        this.selectionBoundingRect.moveTo(this.layer);
      }

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

}
