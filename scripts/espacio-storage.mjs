// scripts/espacio-storage.mjs
//
// Lista todos los archivos del bucket de Storage de PRODUCCIÓN con su
// tamaño, ordenados de mayor a menor. Sirve para encontrar qué está
// agotando la cuota gratuita del plan Spark.
//
// Requiere una clave de cuenta de servicio descargada desde Firebase
// Console > Configuración del proyecto > Cuentas de servicio, guardada
// como clave-admin.json en la raíz del repo (ya está en .gitignore).
//
// Uso: node scripts/espacio-storage.mjs

import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const PROJECT_ID = "gym-app-entrenadora";
const clave = JSON.parse(readFileSync(new URL("../clave-admin.json", import.meta.url)));

const app = initializeApp({
    credential: cert(clave),
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.firebasestorage.app`,
});

const bucket = getStorage(app).bucket();
const [archivos] = await bucket.getFiles();

const conTamano = archivos.map((archivo) => ({
    ruta: archivo.name,
    bytes: Number(archivo.metadata.size ?? 0),
}));

conTamano.sort((a, b) => b.bytes - a.bytes);

const aMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

console.log(`Total de archivos: ${conTamano.length}\n`);
for (const { ruta, bytes } of conTamano) {
    console.log(`${aMB(bytes).padStart(10)} MB  ${ruta}`);
}

const totalBytes = conTamano.reduce((suma, a) => suma + a.bytes, 0);
console.log(`\nTotal ocupado: ${aMB(totalBytes)} MB`);
