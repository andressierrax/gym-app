// src/firebase.js
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

// Se exporta para que otros módulos (ej. RegistroClientes) puedan crear una
// instancia secundaria sin duplicar estos valores y arriesgarse a desincronizarlos.
export const firebaseConfig = {
    apiKey: "AIzaSyB3R445tgjvNE1UQAUbgcZVeOylG-IfwGg",
    authDomain: "gym-app-entrenadora.firebaseapp.com",
    projectId: "gym-app-entrenadora",
    storageBucket: "gym-app-entrenadora.firebasestorage.app",
    messagingSenderId: "463800963011",
    appId: "1:463800963011:web:766e2728e884b4892c3776"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios para usarlos en toda la app
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Conexión a los emuladores locales. Requiere DOS condiciones a propósito:
// import.meta.env.DEV (nunca es true en un `npm run build`) y la variable de
// entorno explícita, para que "npm run dev" normal siga hablando con
// producción salvo que se pida lo contrario. Se guarda en globalThis para no
// conectar dos veces si Vite recarga el módulo (HMR).
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true" && !globalThis.__trinityFitEmuladoresConectados) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    globalThis.__trinityFitEmuladoresConectados = true;
    console.info("Firebase conectado a los emuladores locales.");
}

export default app;