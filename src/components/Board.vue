<template>
  <div>
    <a-modal v-model:visible="modalVisible" title="Info" :closable="false">
      <a-input
        v-model:value="name"
        placeholder="Put your name here"
        @pressEnter="updateName"
        :maxlength="20"
        :allowClear="true"
      />
      <template #footer>
        <a-button key="submit" type="primary" @click="exit"> Exit </a-button>
        <a-button
          key="submit"
          type="primary"
          @click="updateName"
          :disabled="name == ''"
        >
          OK
        </a-button>
      </template>
    </a-modal>
    <h2>
      Room {{ Number.parseInt(roomId) + 1 }} Hello, {{ currentPlayer.name }}
    </h2>
    <table style="margin: auto; text-align: left">
      <tr>
        <td>
          <ArrowRightOutlined style="width: 30px" v-if="myTurn" />
        </td>
        <td>
          <a-badge status="success" v-if="currentPlayer.ready" />
          <a-badge status="processing" v-else />
        </td>
        <td>{{ currentPlayer.name }}</td>
        <td style="padding-left: 20px">
          <div
            class="black-peice"
            style="margin: auto"
            v-if="currentPlayer.color === 'b'"
          ></div>
          <div class="white-peice" style="margin: auto" v-else></div>
        </td>
      </tr>
      <tr v-if="otherPlayer.event != Event.left">
        <td>
          <ArrowRightOutlined style="width: 30px" v-if="!myTurn" />
        </td>
        <td>
          <a-badge status="success" v-if="otherPlayer.ready" />
          <a-badge status="processing" v-else />
        </td>
        <td>{{ otherPlayer.name }}</td>
        <td style="padding-left: 20px">
          <div
            class="black-peice"
            style="margin: auto"
            v-if="otherPlayer.color === 'b'"
          ></div>
          <div class="white-peice" style="margin: auto" v-else></div>
        </td>
      </tr>
    </table>

    <h4 v-if="otherPlayer.name != ''">{{ playerToMove }} turn</h4>
    <h4 v-else>Waiting for player...</h4>
    <div class="board">
      <div v-for="row in 15" :key="row" style="height: 25px">
        <div
          v-for="col in 15"
          :key="col"
          :class="{
            tile: true,
            notAllowed: !myTurn || !playersReady,
            blink_me: row - 1 === lastMove.row && col - 1 === lastMove.col,
          }"
          @click="placePiece(row - 1, col - 1)"
        >
          <div
            :class="{ 'black-peice': true }"
            v-if="board[row - 1][col - 1] === 'b'"
          ></div>
          <div
            :class="{ 'white-peice': true }"
            v-else-if="board[row - 1][col - 1] === 'w'"
          ></div>
          <div
            :class="{
              'white-peice-shade': currentPlayer.color === 'w',
              'black-peice-shade': currentPlayer.color === 'b',
            }"
            v-else-if="myTurn"
          ></div>
        </div>
      </div>
    </div>
    <br />
    <a-space>
      <a-button @click="admitDefeat" :disabled="!playersReady"
        >Admit defeat<ThunderboltOutlined /></a-button
      >
      <a-button @click="undo" :disabled="myTurn || lastMove.col === -1"
        >Undo<UndoOutlined /></a-button
      >
      <a-button @click="exit">Exit<LogoutOutlined /></a-button>
    </a-space>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onUnmounted, ref } from "vue";
import firebase from "firebase/app";
import "firebase/database";
import { LogoutOutlined, ArrowRightOutlined, UndoOutlined, ThunderboltOutlined } from "@ant-design/icons-vue";
import { message, Modal } from "ant-design-vue";
import { Room, Event, Player } from "@/interface";
import { check } from "@/checkWin";

export default defineComponent({
  components: {
    LogoutOutlined,
    ArrowRightOutlined,
    UndoOutlined,
    ThunderboltOutlined
  },
  props: {
    roomId: {
      type: String,
      required: true,
    },
  },
  setup(props, context) {
    const board = ref([] as string[][]);
    const name = ref("");
    const player: Player = {
      name: "",
      color: "b",
      ready: true,
      event: Event.joined,
      move: { row: 0, col: 0 },
    };
    const currentPlayer = ref(player);
    const otherPlayer = ref(player);
    const myTurn = ref(true);
    const roomRef = firebase.database().ref(props.roomId);
    const lastMove = ref({ col: -1, row: -1 });
    const playerToMove = computed((): string => {
      return myTurn.value ? "Your" : otherPlayer.value.name;
    });

    const playersReady = computed(() => {
      return currentPlayer.value.ready && otherPlayer.value.ready;
    });
    const modalVisible = ref(true);
    let currentPlayerRef: firebase.database.Reference;
    let otherPlayerRef: firebase.database.Reference;
    const updateTime = () => {
      const roomUpdate = {} as Room;
      roomUpdate.lastUpdateTime = firebase.database.ServerValue
        .TIMESTAMP as number;
      firebase.database().ref(props.roomId).update(roomUpdate);
    };
    const exit = () => {
      currentPlayerRef.update({event: Event.left, ready: false, name: ''} as Player);
      context.emit("exit");
    };
    
    // setup board
    const clearBoard = () => {
      for (let i = 0; i < 15; ++i) {
        board.value[i] = new Array(15).fill("e");
      }
      lastMove.value = { col: -1, row: -1 };
    };
    const IWin = () => {
      // i win!
      Modal.success({
        title: `You won!`,
        onOk() {
          clearBoard();
          const readyUpdate = {} as Player;
          readyUpdate.ready = true;
          readyUpdate.event = Event.updateStatus;
          currentPlayerRef.update(readyUpdate);
        },
      });
      const playerUpdate = {} as Player;
      playerUpdate.event = Event.win;
      // switch color
      playerUpdate.color = currentPlayer.value.color === "w" ? "b" : "w";
      myTurn.value = playerUpdate.color === "w" ? false : true;
      playerUpdate.ready = false;
      currentPlayerRef.update(playerUpdate);

      // update other player's status
      const otherPlayerUpdate = {} as Player;
      otherPlayerUpdate.color = otherPlayer.value.color === "w" ? "b" : "w";
      otherPlayerUpdate.ready = false;
      otherPlayerUpdate.event = Event.updateStatus;
      otherPlayerRef.update(otherPlayerUpdate);
      updateTime();
    };
    clearBoard();
    const placePiece = (row: number, col: number) => {
      if (
        board.value[row][col] !== "e" ||
        !myTurn.value ||
        !playersReady.value
      )
        return;
      board.value[row][col] = currentPlayer.value.color;
      const playerUpdate = {
        move: {
          row: row,
          col: col,
        },
        event: Event.move,
      } as Player;
      currentPlayerRef.update(playerUpdate);
      if (check(board.value) === currentPlayer.value.color) {
        IWin()
      } else {
        myTurn.value = false;
      }
      lastMove.value = playerUpdate.move;
      updateTime();
    };

    // setup room
    roomRef.once("value", (snapshot) => {
      const roomInfo = snapshot.val() as Room;
      const playerUpdate = {} as Player;
      if (
        roomInfo === null ||
        new Date().getTime() - roomInfo.lastUpdateTime > 1000 * 60 * 15 ||
        (roomInfo.player1.event === Event.left &&
          roomInfo.player2.event === Event.left)
      ) {
        currentPlayerRef = firebase.database().ref(`${props.roomId}/player1`);
        otherPlayerRef = firebase.database().ref(`${props.roomId}/player2`);
        const roomUpdate: Room = {
          player1: {
            name: "",
            color: "w",
            ready: false,
            move: { col: -1, row: -1 },
            event: Event.joined,
          },
          player2: {
            name: "",
            color: "b",
            ready: false,
            move: { col: -1, row: -1 },
            event: Event.left,
          },
          lastUpdateTime: firebase.database.ServerValue.TIMESTAMP as number,
        };
        roomRef.set(roomUpdate);
        playerUpdate.color = "b";
      } else {
        const me = roomInfo.player1.event === Event.left ? "player1" : "player2";
        const other = roomInfo.player1.event === Event.left ? "player2" : "player1";
        
        myTurn.value = false;
        playerUpdate.color = "w";
        currentPlayerRef = firebase.database().ref(`${props.roomId}/${me}`);
        otherPlayerRef = firebase.database().ref(`${props.roomId}/${other}`);
      }

      playerUpdate.name = name.value;
      playerUpdate.event = Event.joined;
      currentPlayerRef.update(playerUpdate);

      otherPlayerRef.on("value", (snapshot) => {
        const playerUpdate = snapshot.val() as Player;
        otherPlayer.value = playerUpdate;
        switch (playerUpdate.event) {
          case Event.joined: {
            message.info(`Player joined Game!`);
            break;
          }
          case Event.left: {
            if (playerUpdate.name !== ''){
              message.info("Other player left");
            }
            // reset game
            clearBoard();
            lastMove.value = { col: -1, row: -1 };
            myTurn.value = true;
            const newPlayerUpdate = {} as Player;
            newPlayerUpdate.color = "b";
            newPlayerUpdate.event = Event.updateStatus;
            currentPlayerRef.update(newPlayerUpdate);
            break;
          }
          case Event.move: {
            board.value[playerUpdate.move.row][playerUpdate.move.col] =
              playerUpdate.color;
            lastMove.value = playerUpdate.move;
            myTurn.value = true;
            break;
          }
          case Event.win: {
            // other player win
            myTurn.value = playerUpdate.color === "w" ? true : false;
            Modal.info({
              title: `${playerUpdate.name} won.`,
              onOk() {
                clearBoard();
                const readyUpdate = {} as Player;
                readyUpdate.ready = true;
                readyUpdate.event = Event.updateStatus;
                currentPlayerRef.update(readyUpdate);
              },
            });
            break;
          }
          case Event.admitDefeat: {
            IWin()
            break;
          }
          case Event.requestToUndo: {
            // flush event in case this is the second time get undo request.
            currentPlayerRef.update({event: Event.updateStatus} as Player);
            Modal.confirm({
              title: `Allow ${otherPlayer.value.name} to undo?`,
              cancelText: "Don't allow.",
              onOk() {
                board.value[lastMove.value.row][lastMove.value.col] = "e";
                lastMove.value.col = -1;
                lastMove.value.row = -1;
                myTurn.value = false;
                currentPlayerRef.update({event: Event.undoAccepted} as Player);
                updateTime();
                message.info("Sent");
              },
              onCancel() {
                currentPlayerRef.update({event: Event.undoDeclined} as Player);
                updateTime();
                message.info("Sent");
              },
            });
            break;
          }
          case Event.undoDeclined: {
            message.info(
              `${otherPlayer.value.name} declined your undo request.`
            );
            break;
          }
          case Event.undoAccepted: {
            message.success(
              `${otherPlayer.value.name} accepted your undo request.`
            );
            board.value[lastMove.value.row][lastMove.value.col] = "e";
            lastMove.value.col = -1;
            lastMove.value.row = -1;
            myTurn.value = true;
            break;
          }
        }
      });

      currentPlayerRef.on("value", (snapshot) => {
        // receive update for my info
        const update = snapshot.val() as Player
        debugger
        if (update.name !== currentPlayer.value.name && currentPlayer.value.name !== ''){
          // you didn't quit the room now a new player is playing
          // quit
          context.emit("exit");
        }
        currentPlayer.value = update;
      });
    });

    const updateName = async () => {
      if (name.value === "") {
        message.warning("Name cannot be empty.");
        return;
      }
      if (name.value === otherPlayer.value.name) {
          message.warning("This name is same as other player's name!");
          return;
        }
      const playerUpdate = {} as Player;
      playerUpdate.ready = true
      playerUpdate.event = Event.updateStatus;
      playerUpdate.name = name.value;
      currentPlayerRef.update(playerUpdate);
      updateTime();
      modalVisible.value = false;
    };

    const admitDefeat = () => {
      Modal.confirm({
        title: `Admit defeat?`,
        onOk() {
          currentPlayerRef.update({event: Event.admitDefeat} as Player);
          updateTime();
        },
      });
    };

    const undo = () => {
      if (currentPlayer.value.event === Event.requestToUndo){
        message.info(`${otherPlayer.value.name} has declined your request.`)
        return
      }
      Modal.confirm({
        title: `Undo?`,
        onOk() {
          message.info("Request sent. Please wait for feedback.");
          currentPlayerRef.update({event: Event.requestToUndo} as Player);
          updateTime();
        },
      });
    };

    onUnmounted(() => {
      if (currentPlayerRef != undefined) currentPlayerRef.off();
      if (otherPlayerRef != undefined) otherPlayerRef.off();
      roomRef.off();
    });

    return {
      Event,
      board,
      placePiece,
      myTurn,
      playerToMove,
      modalVisible,
      updateName,
      exit,
      name,
      currentPlayer,
      otherPlayer,
      playersReady,
      lastMove,
      admitDefeat,
      undo,
    };
  },
});
</script>

<style scoped>
.board {
  border: 3px solid rgb(218, 218, 218);
  width: 405px;
  margin: auto;
  padding: 10px;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
}
.tile {
  height: 25px;
  width: 25px;
  border: 1px solid gray;
  /* border-radius: 10px; */
  display: inline-block;
  background-color: rgb(255, 195, 127);
}
.tile:hover {
  box-sizing: border-box;
  /* border: 3px solid red; */
  background-color: rgb(228, 121, 0);
}
.notAllowed {
  cursor: not-allowed;
}
.black-peice {
  height: 15px;
  width: 15px;
  background-color: rgb(85, 102, 117);
  margin: auto;
  margin-top: 4px;
  border-radius: 7px;
  box-sizing: border-box;
  border: 1px solid rgb(78, 78, 78);
}
.black-peice-shade {
  height: 27px;
  width: 27px;
}
.black-peice-shade:hover {
  height: 15px;
  width: 15px;
  background-color: rgb(85, 102, 117);
  opacity: 0.5;
  margin: auto;
  margin-top: 4px;
  border-radius: 7px;
  box-sizing: border-box;
  border: 1px solid rgb(78, 78, 78);
}
.white-peice {
  height: 15px;
  width: 15px;
  background-color: rgb(233, 233, 233);
  margin: auto;
  margin-top: 4px;
  border-radius: 7px;
  box-sizing: border-box;
  border: 1px solid rgb(78, 78, 78);
}
.white-peice-shade {
  height: 27px;
  width: 27px;
}
.white-peice-shade:hover {
  height: 15px;
  width: 15px;
  background-color: rgb(233, 233, 233);
  opacity: 0.5;
  margin: auto;
  margin-top: 4px;
  border-radius: 7px;
  box-sizing: border-box;
  border: 1px solid rgb(78, 78, 78);
}
.blink_me {
  background-color: rgb(228, 121, 0);
}
</style>