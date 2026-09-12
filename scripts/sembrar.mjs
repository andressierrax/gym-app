// scripts/sembrar.mjs
//
// Puebla los emuladores locales de Auth y Firestore con datos de prueba
// realistas: una entrenadora, dos clientas (una de ciclo, una esporádica),
// biblioteca de ejercicios, un plan de la Semana Adaptación y otro de la
// Semana 1, un catálogo para la esporádica, y su registro de ciclo.
//
// Usa el Admin SDK porque escribir el perfil de la propia entrenadora es
// circular con las reglas del cliente: `users/{uid}` exige ya ser
// entrenadora para poder crear el documento que te hace entrenadora. El
// Admin SDK ignora las reglas de seguridad — está pensado justo para esto,
// nunca para producción.
//
// Requiere los emuladores ya corriendo (`npm run emuladores` en otra
// terminal). No toca producción bajo ningún concepto: los host:port de abajo
// solo existen si el emulador está levantado.

import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const PROJECT_ID = "gym-app-entrenadora";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= "127.0.0.1:9199";
process.env.GCLOUD_PROJECT = PROJECT_ID;

const app = initializeApp({
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.firebasestorage.app`,
});
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Credenciales de prueba. No son secretas: solo existen en tu máquina,
// dentro del emulador, y se recrean cada vez que se corre este script.
const ENTRENADORA = { email: "entrenadora@trinityfit.test", password: "Entrena123!", nombre: "Ana Entrenadora" };
const CLIENTA_CICLO = { email: "ciclo@trinityfit.test", password: "Clienta123!", nombre: "Marta Ciclo" };
const CLIENTA_LIBRE = { email: "libre@trinityfit.test", password: "Clienta123!", nombre: "Sofía Libre" };

// GIF de 1x1 válido, mínimo, para que el ejercicio "bueno" cargue de verdad
// en el emulador de Storage y así puedas comparar contra el roto.
const GIF_1X1_BASE64 = "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

async function crearUsuario({ email, password, nombre }) {
    try {
        const existente = await auth.getUserByEmail(email);
        await auth.deleteUser(existente.uid);
    } catch {
        // No existía: nada que borrar, seguimos.
    }
    return auth.createUser({ email, password, displayName: nombre, emailVerified: true });
}

async function subirGifDePrueba(nombreArchivo, contenidoBase64) {
    const bucket = storage.bucket();
    const archivo = bucket.file(`ejercicios/${nombreArchivo}`);
    const token = randomUUID();
    await archivo.save(Buffer.from(contenidoBase64, "base64"), {
        contentType: "image/gif",
        metadata: {
            cacheControl: "public, max-age=3600",
            // El propio Storage de producción exige este token en la URL
            // (es lo que hace getDownloadURL() de verdad); sin él, la regla
            // "allow read: if request.auth != null" se evalúa en serio y
            // <img src> nunca manda el token de sesión, así que se ve un 403.
            // Sin este token la siembra reproducía el bug del punto 1 por un
            // motivo distinto al real: aquí se genera el token a propósito.
            metadata: { firebaseStorageDownloadTokens: token },
        },
    });
    return `http://127.0.0.1:9199/v0/b/${PROJECT_ID}.firebasestorage.app/o/${encodeURIComponent(`ejercicios/${nombreArchivo}`)}?alt=media&token=${token}`;
}

async function principal() {
    console.log("Borrando datos previos de Firestore...");
    await db.recursiveDelete(db.collection("users"));
    await db.recursiveDelete(db.collection("exercises"));
    await db.recursiveDelete(db.collection("planes_mensuales"));
    await db.recursiveDelete(db.collection("rutinas_libres"));
    await db.recursiveDelete(db.collection("ciclos"));
    await db.recursiveDelete(db.collection("sesiones"));
    await db.recursiveDelete(db.collection("registros_entrenamiento"));

    console.log("Creando usuarias en Auth...");
    const uEntrenadora = await crearUsuario(ENTRENADORA);
    // storage.rules lee el rol del custom claim del token, no de Firestore
    // (esa lectura entre servicios exige el plan Blaze en producción). Sin
    // esto, la entrenadora del emulador no podría subir nada a Storage.
    await auth.setCustomUserClaims(uEntrenadora.uid, { role: "trainer" });
    const uCiclo = await crearUsuario(CLIENTA_CICLO);
    const uLibre = await crearUsuario(CLIENTA_LIBRE);

    console.log("Escribiendo perfiles en users/...");
    await db.doc(`users/${uEntrenadora.uid}`).set({
        name: ENTRENADORA.nombre,
        email: ENTRENADORA.email,
        role: "trainer",
        createdAt: Timestamp.now(),
    });
    await db.doc(`users/${uCiclo.uid}`).set({
        name: CLIENTA_CICLO.nombre,
        email: CLIENTA_CICLO.email,
        role: "client",
        tipo: "ciclo",
        seguimientoCiclo: true,
        createdAt: Timestamp.now(),
    });
    await db.doc(`users/${uLibre.uid}`).set({
        name: CLIENTA_LIBRE.nombre,
        email: CLIENTA_LIBRE.email,
        role: "client",
        tipo: "esporadica",
        seguimientoCiclo: false,
        createdAt: Timestamp.now(),
    });

    console.log("Subiendo GIF de prueba a Storage y creando biblioteca de ejercicios...");
    const urlGifBueno = await subirGifDePrueba("sentadilla-prueba.gif", GIF_1X1_BASE64);
    // A propósito NO se sube nada para este: reproduce el 404/403 del punto 1
    // sin tener que ir a producción a cazarlo.
    const urlGifRoto = `http://127.0.0.1:9199/v0/b/${PROJECT_ID}.firebasestorage.app/o/ejercicios%2Fno-existe.gif?alt=media`;

    const refSentadilla = db.collection("exercises").doc();
    const refPlancha = db.collection("exercises").doc();
    await refSentadilla.set({ name: "Sentadilla goblet", gifUrl: urlGifBueno, createdAt: Timestamp.now() });
    await refPlancha.set({ name: "Plancha (GIF roto a propósito)", gifUrl: urlGifRoto, createdAt: Timestamp.now() });

    const ejercicioPrescrito = (ref, nombre, gifUrl, series, reps, peso) => ({
        ejercicioId: ref.id, nombre, gifUrl, series, reps, peso,
    });

    console.log("Creando planes de la clienta de ciclo (Adaptación y Semana 1)...");
    // Id determinista {clienteId}_S{semana}D{dia}, igual que hace la app.
    await db.doc(`planes_mensuales/${uCiclo.uid}_S0D1`).set({
        clienteId: uCiclo.uid,
        semana: 0,
        dia: 1,
        nombreDia: "Tren inferior",
        bloques: [{
            titulo: "Bloque A",
            contenido: "",
            ejercicios: [
                ejercicioPrescrito(refSentadilla, "Sentadilla goblet", urlGifBueno, "3", "12", "8kg"),
                ejercicioPrescrito(refPlancha, "Plancha (GIF roto a propósito)", urlGifRoto, "3", "30s", ""),
            ],
        }],
        fechaCreacion: Timestamp.now(),
    });
    await db.doc(`planes_mensuales/${uCiclo.uid}_S1D1`).set({
        clienteId: uCiclo.uid,
        semana: 1,
        dia: 1,
        nombreDia: "Tren inferior",
        bloques: [{
            titulo: "Bloque A",
            contenido: "",
            ejercicios: [
                ejercicioPrescrito(refSentadilla, "Sentadilla goblet", urlGifBueno, "4", "10", "10kg"),
            ],
        }],
        fechaCreacion: Timestamp.now(),
    });

    console.log("Creando el registro de ciclo menstrual...");
    await db.doc(`ciclos/${uCiclo.uid}`).set({
        ultimaRegla: "2026-08-05",
        duracion: 28,
    });

    console.log("Creando catálogo de rutinas para la clienta esporádica...");
    const refRutinaLibre = db.collection("rutinas_libres").doc();
    await refRutinaLibre.set({
        clienteId: uLibre.uid,
        nombre: "Full body express",
        bloques: [{
            titulo: "Bloque único",
            contenido: "",
            ejercicios: [
                ejercicioPrescrito(refSentadilla, "Sentadilla goblet", urlGifBueno, "3", "15", "6kg"),
            ],
        }],
        fechaCreacion: Timestamp.now(),
    });

    console.log("\nListo. Credenciales de prueba (solo existen en el emulador):\n");
    console.log(`  Entrenadora  ${ENTRENADORA.email} / ${ENTRENADORA.password}`);
    console.log(`  Clienta ciclo     ${CLIENTA_CICLO.email} / ${CLIENTA_CICLO.password}`);
    console.log(`  Clienta esporádica ${CLIENTA_LIBRE.email} / ${CLIENTA_LIBRE.password}`);
    console.log(`\n  Ejercicio con GIF que carga:  "Sentadilla goblet"`);
    console.log(`  Ejercicio con GIF roto adrede: "Plancha (GIF roto a propósito)" -> para reproducir el bug del punto 1.`);
    console.log(`\nUI del emulador: http://127.0.0.1:4000`);

    process.exit(0);
}

principal().catch((error) => {
    console.error("Fallo al sembrar:", error);
    process.exit(1);
});
