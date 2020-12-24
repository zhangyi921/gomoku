<template>
  <div>
    <a-modal v-model:visible="modalVisible" title="Info" :closable="false">
      <a-input
        v-model:value="name"
        placeholder="Put your name here"
        @pressEnter="enterRoom"
      />
      <template #footer>
        <a-button key="submit" type="primary" @click="$emit('exit')">
          Exit
        </a-button>
        <a-button
          key="submit"
          type="primary"
          @click="enterRoom"
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
      <tr v-if="otherPlayer.name != ''">
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
      <a-button @click="admitDefeat" :disabled="!playersReady">Admit defeat</a-button>
      <a-button :disabled="myTurn">Undo</a-button>
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
import { Room, Event, Player } from "@/interface";
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
    let roomReady = false;
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
      const playerUpdate = {} as Player;
      playerUpdate.name = "";
      playerUpdate.event = Event.left;
      currentPlayerRef.update(playerUpdate);
      context.emit("exit");
    };

    // setup board
    const clearBoard = () => {
      for (let i = 0; i < 15; ++i) {
        board.value[i] = new Array(15).fill("e");
      }
      lastMove.value = { col: -1, row: -1 };
    };
    clearBoard();
    const placePiece = (row: number, col: number) => {
      if (
        board.value[row][col] !== "e" ||
        !myTurn.value ||
        !roomReady ||
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
        // i win!
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
      }
      else{
        myTurn.value = false;
      }
      lastMove.value = playerUpdate.move;
      updateTime();
    };

    // setup room
    const enterRoom = async () => {
      if (name.value === "") {
        message.warning("Name cannot be empty.");
        return;
      }
      const roomInfo = (await roomRef.once("value")).val() as Room;
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
            event: Event.updateStatus,
          },
          player2: {
            name: "",
            color: "b",
            ready: false,
            move: { col: -1, row: -1 },
            event: Event.updateStatus,
          },
          lastUpdateTime: firebase.database.ServerValue.TIMESTAMP as number,
        };
        roomRef.set(roomUpdate);
        playerUpdate.color = "b";
      } else {
        const me = roomInfo.player1.name === "" ? "player1" : "player2";
        const other = roomInfo.player1.name === "" ? "player2" : "player1";
        if (name.value === roomInfo[other].name) {
          message.warning("This name is same as other player's name!");
          return;
        }
        myTurn.value = false;
        playerUpdate.color = "w";
        currentPlayerRef = firebase.database().ref(`${props.roomId}/${me}`);
        otherPlayerRef = firebase.database().ref(`${props.roomId}/${other}`);
      }

      playerUpdate.name = name.value;
      playerUpdate.ready = true;
      playerUpdate.event = Event.joined;
      currentPlayerRef.update(playerUpdate);
      updateTime();
      modalVisible.value = false;
      roomReady = true;

      otherPlayerRef.on("value", (snapshot) => {
        const playerUpdate = snapshot.val() as Player;
        otherPlayer.value = playerUpdate;
        switch (playerUpdate.event) {
          case Event.joined: {
            message.info(`${playerUpdate.name} joined Game!`);
            break;
          }
          case Event.left: {
            message.info("Other player left");
            // reset game
            clearBoard();
            lastMove.value = { col: -1, row: -1 };
            myTurn.value = true;
            const playerUpdate = {} as Player;
            playerUpdate.color = "b";
            playerUpdate.event = Event.updateStatus;
            currentPlayerRef.update(playerUpdate);
            break;
          }
          case Event.move: {
            board.value[playerUpdate.move.row][playerUpdate.move.col] =
              playerUpdate.color;
            lastMove.value = playerUpdate.move;
            myTurn.value = true
            break;
          }
          case Event.win: {
            // other player win
            myTurn.value = playerUpdate.color === 'w'?true:false
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
            const playerUpdate = {
              event: Event.win,
            } as Player;
            playerUpdate.event = Event.win;
            // switch color
            playerUpdate.color = currentPlayer.value.color === "w" ? "b" : "w";
            myTurn.value = playerUpdate.color === "w" ? false : true;
            playerUpdate.ready = false;
            currentPlayerRef.update(playerUpdate);

            // update other player's status
            const otherPlayerUpdate = {} as Player;
            otherPlayerUpdate.color =
              otherPlayer.value.color === "w" ? "b" : "w";
            otherPlayerUpdate.ready = false;
            otherPlayerUpdate.event = Event.updateStatus;
            otherPlayerRef.update(otherPlayerUpdate);
            updateTime();
            
          }
        }
      });

      currentPlayerRef.on("value", (snapshot) => {
        // receive update for my info
        currentPlayer.value = snapshot.val();
      });
    };

    const admitDefeat = () => {
      Modal.confirm({
        title: `Admit defeat?`,
        onOk() {
          const playerUpdate = {} as Player;
          playerUpdate.event = Event.admitDefeat;
          currentPlayerRef.update(playerUpdate);
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
      board,
      placePiece,
      myTurn,
      playerToMove,
      modalVisible,
      enterRoom,
      exit,
      name,
      currentPlayer,
      otherPlayer,
      playersReady,
      lastMove,
      admitDefeat
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