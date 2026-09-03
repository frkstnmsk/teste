// =====================================================================
// =====================================================================
// CHUVA DE NEON — Configuração Firebase (compartilhada)
// =====================================================================
// Mantenha este arquivo igual em todas as páginas do site.
// Se você recriar o projeto Firebase, só precisa trocar os valores aqui.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCGVh1uVU3gw8IlikK-osvWKAz899rLQDc",
  authDomain: "cdnteste-2e77d.firebaseapp.com",
  databaseURL: "https://cdnteste-2e77d-default-rtdb.firebaseio.com",
  projectId: "cdnteste-2e77d",
  storageBucket: "cdnteste-2e77d.firebasestorage.app",
  messagingSenderId: "163603038670",
  appId: "1:163603038670:web:d9f8870ac486a6df9fab9f"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
