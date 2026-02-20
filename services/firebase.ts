import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// =================================================================================
// ¡ACCIÓN REQUERIDA! REEMPLAZA ESTA CONFIGURACIÓN CON LA DE TU PROPIO PROYECTO FIREBASE
// =================================================================================
// Para que la aplicación funcione, debes usar la configuración de tu propio proyecto de Firebase.
// Sigue estos pasos:
// 1. Ve a la consola de Firebase: https://console.firebase.google.com/
// 2. Selecciona tu proyecto (o crea uno nuevo).
// 3. Haz clic en el ícono de engranaje (⚙️) junto a "Project Overview" y selecciona "Project settings".
// 4. En la pestaña "General", baja hasta la sección "Your apps".
// 5. Busca tu aplicación web, haz clic en el ícono "</>" (SDK setup and configuration).
// 6. Copia el objeto completo `firebaseConfig` que se muestra allí.
// 7. Pega el objeto que copiaste aquí abajo, reemplazando todo el bloque de `const firebaseConfig`.
//
// La aplicación NO funcionará hasta que completes este paso.
// El bloque que copies de Firebase se verá similar a este, pero con tus claves reales.
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAmOFTskhUF6AJ2gnVKr44z8mWBC86Uw_M",
  authDomain: "whiteboard-1e52a.firebaseapp.com",
  projectId: "whiteboard-1e52a",
  storageBucket: "whiteboard-1e52a.firebasestorage.app",
  messagingSenderId: "155805808515",
  appId: "1:155805808515:web:c5072a390581448eece8b6",
  measurementId: "G-CVMP60DWXB"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();