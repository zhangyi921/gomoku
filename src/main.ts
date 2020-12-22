import { createApp } from 'vue'
import App from './App.vue'
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css';
import firebase from 'firebase/app'
import './registerServiceWorker'

const firebaseConfig = {
    apiKey: "AIzaSyB2bYXHNjSckONPsmYAyjXXw7NbCxwpVdI",
    authDomain: "gomoku-14599.firebaseapp.com",
    projectId: "gomoku-14599",
    storageBucket: "gomoku-14599.appspot.com",
    messagingSenderId: "475011628754",
    appId: "1:475011628754:web:d08ae6de47868b18def70b",
    measurementId: "G-B4R381LKMD"
};
firebase.initializeApp(firebaseConfig)
createApp(App).use(Antd).mount('#app')
