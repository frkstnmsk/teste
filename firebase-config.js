// =====================================================================
// CHUVA DE NEON — Configuração Firebase (compartilhada)
// =====================================================================
// Mantenha este arquivo igual em todas as páginas do site.
// Se você recriar o projeto Firebase, só precisa trocar os valores aqui.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDU-e21zaoVuW-1Wjzj5b6CfcyOZDj2BsE",
  authDomain: "chuva-de-neon.firebaseapp.com",
  databaseURL: "https://chuva-de-neon-default-rtdb.firebaseio.com",
  projectId: "chuva-de-neon",
  storageBucket: "chuva-de-neon.firebasestorage.app",
  messagingSenderId: "994935691317",
  appId: "1:994935691317:web:418a37b0700b2bd083b97c"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
