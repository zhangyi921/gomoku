<template>
  <div>
    <div
      style="max-width: 80%; text-align: center; margin: auto"
      v-if="selectedRoom === ''"
    >
      <h2>Room list - click to enter.</h2>
      <a-button
        v-for="index in numOfRooms"
        :key="index"
        :disabled="hall[index - 1] === 'o'"
        @click="selectedRoom = `${index - 1}`"
        style="width: 250px; margin: 2px"
        ><span v-if="hall[index - 1] === 'e'"
          >Room {{ index }}:
          <a-tag color="green" style="width: 140px">
            <template #icon> <SmileOutlined /> </template>Empty
          </a-tag>
        </span>
        <span v-if="hall[index - 1] === 'w'"
          >Room {{ index }}:
          <a-tag color="cyan" style="width: 140px">
            <template #icon>
              <SyncOutlined spin />
            </template>
            Waiting for player
          </a-tag></span
        >
        <span v-if="hall[index - 1] === 'o'"
          >Room {{ index }}:
          <a-tag color="orange" style="width: 140px"
            ><template #icon> <FireOutlined /> </template>Gaming...
          </a-tag></span
        >
      </a-button>
    </div>
    <transition name="fade">
      <Board
        v-if="selectedRoom != ''"
        :roomId="selectedRoom"
        @exit="selectedRoom = ''"
      />
    </transition>

    <br><br>
    <h6>v1.0.3</h6>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import Board from "./components/Board.vue";
import { Room, Event } from "@/interface";
import firebase from "firebase/app";
import "firebase/database";
import {
  SyncOutlined,
  SmileOutlined,
  FireOutlined,
} from "@ant-design/icons-vue";

export default defineComponent({
  name: "App",
  components: {
    Board,
    SyncOutlined,
    SmileOutlined,
    FireOutlined,
  },
  setup() {
    const hall = ref([] as string[]);
    const numOfRooms = ref(30);
    const selectedRoom = ref("");
    hall.value = new Array(numOfRooms.value).fill("i");
    const hallRef = firebase.database().ref();
    let rooms: Room[];
    const updateHall = () => {
      hall.value = new Array(numOfRooms.value).fill("e");
      if (rooms === null) return
      for (let id = 0; id < numOfRooms.value; ++id) {
        if (rooms[id] !== undefined) {
          // not active for 15min, treat as empty room
          if (
            new Date().getTime() - rooms[id].lastUpdateTime >
            1000 * 60 * 15 ||
            (rooms[id].player1.event === Event.left &&
            rooms[id].player2.event === Event.left)
          ) {
            continue;
          }
          // gaming
          else if (
            rooms[id].player1.name !== "" &&
            rooms[id].player2.name !== ""
          ) {
            hall.value[id] = "o";
          } else {
            // only one player in the room
            hall.value[id] = "w";
          }
        }
      }
    };
    hallRef.on("value", (snapshot) => {
      rooms = snapshot.val() as Room[];
      updateHall();
    });

    setInterval(() => {
      updateHall();
    }, 10000);
    return {
      numOfRooms,
      hall,
      selectedRoom,
    };
  },
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
