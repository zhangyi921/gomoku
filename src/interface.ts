export interface Player {
  name: string;
  color: 'w' | 'b';
  ready: boolean;
  move: {
    row: number;
    col: number;
  };
  event: Event;
}

export interface Room {
  player1: Player;
  player2: Player;
  lastUpdateTime: number;
}

export enum Event {
  win,
  admitDefeat,
  requestToUndo,
  undoAccepted,
  undoDeclined,
  move,
  updateStatus,
  joined,
  left,
}