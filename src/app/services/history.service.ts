import { Injectable } from '@angular/core';
import Konva from 'konva';

interface HistoryAction {
  type: 'add' | 'delete' | 'move';
  shapes: Array<{
    shape: Konva.Shape | Konva.Group,
    startCircle: Konva.Circle,
    endCircle: Konva.Circle
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];

  addAction(action: HistoryAction) {
    this.undoStack.push(action);
    this.redoStack = []; // Clear redo stack when a new action is added
  }

  undo(): HistoryAction | undefined {
    if (this.undoStack.length > 0) {
      const action = this.undoStack.pop()!;
      this.redoStack.push(action);
      return action;
    }
    return undefined;
  }

  redo(): HistoryAction | undefined {
    if (this.redoStack.length > 0) {
      const action = this.redoStack.pop()!;
      this.undoStack.push(action);
      return action;
    }
    return undefined;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
