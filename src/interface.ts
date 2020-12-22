export interface Player {
    name: string;
    color: "w" | "b";
  }
export interface Room {
    owner: Player;
    player: Player | "empty";
    ownerReady: boolean;
    playerReady: boolean;
    move: {
      color: "w" | "b";
      row: number;
      col: number;
    };
    command: "player left" | 'player joined' | "owner left" | "owner win" | "player win" | 'move' | 'room created' | 'ready';
    lastUpdateTime: number;
  }