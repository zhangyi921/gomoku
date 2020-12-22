<template>
  <div>
    <a-modal v-model:visible="modalVisible" title="Info" :closable="false">
      <a-input
        v-model:value="player.name"
        placeholder="Put your name here"
        @pressEnter="nameReady"
      />
      <template #footer>
        <a-button key="submit" type="primary" @click="$emit('exit')">
          Exit
        </a-button>
        <a-button
          key="submit"
          type="primary"
          @click="nameReady"
          :disabled="player.name == ''"
        >
          OK
        </a-button>
      </template>
    </a-modal>
    <h2>Room {{ Number.parseInt(roomId) + 1 }} Hello, {{ player.name }}</h2>
    <table style="margin: auto; text-align: left;">
      <tr>
        <td>
          <ArrowRightOutlined
            style="width: 30px"
            v-if="(isOwner && myTurn) || (!isOwner && !myTurn)"
          />
        </td>
        <td>
          <a-badge status="success" v-if="room.ownerReady"/>
          <a-badge status="processing" v-else/>
        </td>
        <td>Owner <span v-if="isOwner"> (You) </span>:</td>
        <td style="padding-left: 20px">{{ room.owner.name }}</td>
        <td style="padding-left: 10px">
          <div
            class="black-peice"
            style="margin: auto"
            v-if="room.owner.color === 'b'"
          ></div>
          <div class="white-peice" style="margin: auto" v-else></div>
        </td>
      </tr>
      <tr v-if="room.player != 'empty'">
        <td>
          <ArrowRightOutlined
            style="width: 30px"
            v-if="(!isOwner && myTurn) || (isOwner && !myTurn)"
          />
        </td>
        <td>
          <a-badge status="success" v-if="room.playerReady"/>
          <a-badge status="processing" v-else/>
          </td>
        <td>Player <span v-if="!isOwner"> (You) </span>:</td>
        <td style="padding-left: 20px">{{ room.player.name }}</td>
        <td style="padding-left: 10px">
          <div
            class="black-peice"
            style="margin: auto"
            v-if="room.player.color === 'b'"
          ></div>
          <div class="white-peice" style="margin: auto" v-else></div>
        </td>
      </tr>
    </table>

    <h4 v-if="room.player != 'empty'">{{ playerToMove }} turn</h4>
    <h4 v-else>Waiting for player...</h4>
    <div class="board">
      <div v-for="row in 15" :key="row" style="height: 25px">
        <div
          v-for="col in 15"
          :key="col"
          :class="{tile: true, notAllowed: !myTurn, blink_me: row-1 === room.move.row && col-1 === room.move.col}"
          @click="placePiece(row - 1, col - 1)"
        >
          <div :class="{'black-peice': true, }" v-if="board[row - 1][col - 1] === 'b'"></div>
          <div
            :class="{'white-peice': true, }"
            v-else-if="board[row - 1][col - 1] === 'w'"
          ></div>
        </div>
      </div>
    </div>
    <br />
    <a-space>
      <a-button >Admit defeat</a-button>
      <a-button >Undo</a-button>
      <a-button @click="exit">Exit<LogoutOutlined /></a-button>
    </a-space>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onUnmounted, ref } from "vue";
import firebase from "firebase/app";
import "firebase/database";
import { LogoutOutlined, ArrowRightOutlined } from "@ant-design/icons-vue";
import { message, Modal } from "ant-design-vue";
import { Room, Player } from "@/interface";
import { check } from "@/checkWin";

export default defineComponent({
  components: {
    LogoutOutlined,
    ArrowRightOutlined,
  },
  props: {
    roomId: {
      type: String,
      required: true,
    },
  },
  setup(props, context) {
    const board = ref([] as string[][]);
    const room = ref({ owner: { name: "" }, player: "empty", move:{row: -1, col: -1} } as Room);
    const myTurn = ref(true);
    const player = ref({ name: "", color: "b" } as Player);
    const roomReady = ref(false);
    const roomRef = firebase.database().ref(props.roomId);
    const isOwner = ref(true);
    const playerToMove = computed((): string => {
      if (myTurn.value) {
        return "Your";
      }
      if (room.value.player !== "empty") {
        return `${
          isOwner.value ? room.value.player.name : room.value.owner.name
        }'s`;
      }
      return "";
    });
    const modalVisible = ref(true);
    const exit = () => {
      if (isOwner.value) {
        room.value.command = "owner left";
        room.value.lastUpdateTime = 0;
        roomRef.set(room.value).then(() => {
          context.emit("exit");
        });
      } else {
        const newRoomInfo = {
          owner: room.value.owner,
          player: "empty",
          command: "player left",
          lastUpdateTime: firebase.database.ServerValue.TIMESTAMP,
        } as Room;
        newRoomInfo.owner.color = 'b';
        roomRef.update(newRoomInfo).then(() => {
          context.emit("exit");
        });
      }
    };

    // setup board
    const clear = () => {
      for (let i = 0; i < 15; ++i) {
        board.value[i] = new Array(15).fill("e");
      }
    };
    clear();
    const placePiece = (row: number, col: number) => {
      if (
        board.value[row][col] !== "e" ||
        !myTurn.value ||
        room.value.player === "empty" ||
        !room.value.ownerReady ||
        !room.value.playerReady
      )
        return;
      const roomNewMove = {
        move: {
          color: player.value.color,
          row: row,
          col: col,
        },
        command: "move",
        lastUpdateTime: firebase.database.ServerValue.TIMESTAMP,
      } as Room;
      roomRef.update(roomNewMove);
    };

    // setup room
    const nameReady = () => {
      if (player.value.name === "") {
        message.warning("Name cannot be empty.");
        return;
      }
      roomRef.once("value").then((snapshot) => {
        const roomIfno = snapshot.val() as Room;
        if (
          roomIfno === null ||
          new Date().getTime() - roomIfno.lastUpdateTime > 1000 * 60 * 15
        ) {
          // first enter room, setup room
          const newRoom = {
            owner: player.value,
            player: "empty",
            command: "room created",
            ownerReady: true,
            move: {row: -1, col: -1},
            lastUpdateTime: firebase.database.ServerValue.TIMESTAMP, // milisecond
          } as Room;
          roomRef.set(newRoom);
        } else if (roomIfno.player === "empty") {
          if (player.value.name === roomIfno.owner.name){
            message.warning("This name is same other player's name");
            return;
          }
          player.value.color = "w";
          isOwner.value = false;
          myTurn.value = false;
          const newRoom = {
            playerReady: true,
            player: player.value,
            lastUpdateTime: firebase.database.ServerValue.TIMESTAMP,
            command: "player joined",
          } as Room;
          roomRef.update(newRoom);
        }
        modalVisible.value = false;
        roomReady.value = true;
      });
    };
    roomRef.on("value", (snapshot) => {
      const roomData = snapshot.val() as Room;
      if (roomData == null || !roomReady.value) return;
      room.value = roomData;
      switch (roomData.command) {
        case "owner left":
          message.info("Room owner left game.");
          context.emit("exit");
          break;
        case "player left":
          if (isOwner.value) {
            message.info("Player left game.");
            // reset game
            myTurn.value = true;
            player.value.color = 'b'
            clear();
          }
          break;
        case "player joined":
          if (roomData.player !== "empty" && isOwner.value) {
            message.info(`${roomData.player.name} joined game.`);
          }
          break;
        case "move":
          if (board.value[roomData.move.row][roomData.move.col] === "e") {
            board.value[roomData.move.row][roomData.move.col] =
              roomData.move.color;
            // if this is my move, i'll receive update twice!!!
            // reason is we used server timestamp, when server set a new time,
            // we receive another update
            myTurn.value = !myTurn.value;
            // console.log(check(board.value));
          } else if (roomData.move.color === player.value.color) {
            // this is the second update
            // check win after I make a move
            if (check(board.value) === player.value.color) {
              // I win
              Modal.success({
                title: "You won!",
                onOk() {
                  clear();
                  const ready = {
                    move:{col: -1, row: -1},
                    command: 'ready',
                    lastUpdateTime: firebase.database.ServerValue.TIMESTAMP,
                  } as Room;
                  if (isOwner.value) {
                    ready.ownerReady = true;
                  } else {
                    ready.playerReady = true;
                  }
                  roomRef.update(ready);
                },
              });
              const gameResult = {
                owner: room.value.owner,
                player: room.value.player,
                command: "player win",
                playerReady: false,
                ownerReady: false,
                lastUpdateTime: firebase.database.ServerValue.TIMESTAMP,
              } as Room;
              if (isOwner.value) {
                gameResult.command = "owner win";
              }
              if (gameResult.player !== "empty") {
                // switch color
                gameResult.owner.color =
                  gameResult.owner.color === "w" ? "b" : "w";
                gameResult.player.color =
                  gameResult.player.color === "w" ? "b" : "w";
              }
              roomRef.update(gameResult);
            }
          }
          break;
        case "owner win":
          if (!isOwner.value) {
            // i'm player
            // owner win, display modal
            Modal.info({
              title: `${room.value.owner.name} won.`,
              onOk() {
                clear();
                const ready = {
                  move:{col: -1, row: -1},
                  command: 'ready',
                  lastUpdateTime: firebase.database.ServerValue.TIMESTAMP,
                } as Room;
                ready.playerReady = true;
                roomRef.update(ready);
              },
            });
            if (roomData.player !== "empty") {
              player.value.color = roomData.player.color;
            }
          } else {
            // i'm owner this is I win
            player.value.color = roomData.owner.color;
          }
          myTurn.value = player.value.color === "b" ? true : false;
          break;
        case "player win":
          if (isOwner.value) {
            // i'm owner
            // player win, display modal
            if (room.value.player != "empty") {
              Modal.info({
                title: `${room.value.player.name} won.`,
                onOk() {
                  clear();
                  const ready = {
                    move:{col: -1, row: -1},
                    command: 'ready',
                    lastUpdateTime: firebase.database.ServerValue.TIMESTAMP,
                  } as Room;
                  ready.ownerReady = true;
                  roomRef.update(ready);
                },
              });
            }
            player.value.color = roomData.owner.color;
          } else {
            // i'm player, this is i win
            if (roomData.player !== "empty") {
              player.value.color = roomData.player.color;
            }
          }
          myTurn.value = player.value.color === "b" ? true : false;
          break;
        default:
        // code block
      }
    });

    onUnmounted(() => {
      roomRef.off();
    });

    return {
      board,
      clear,
      placePiece,
      room,
      myTurn,
      isOwner,
      playerToMove,
      modalVisible,
      player,
      nameReady,
      exit,
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
.blink_me {
  background-color: rgb(228, 121, 0);
}
</style>