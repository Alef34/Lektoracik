import { FirebaseError, getApps, initializeApp } from 'firebase/app'
import { getFirestore, collection, onSnapshot, addDoc, setDoc, doc, deleteDoc, getDoc, connectFirestoreEmulator } from 'firebase/firestore'

let db: any = null
let ready = false

export async function initFirebase(): Promise<boolean> {
  if (ready) return true

  try {
  
      const firebaseConfig = {
      apiKey: import.meta.env.VITE_APP_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_APP_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_APP_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_APP_FIREBASE_APP_ID
      };

      console.log("Inicializujem Firebase...",firebaseConfig .apiKey)
      console.log("Inicializujem Firebase...",firebaseConfig .projectId)

    let app
    if (!getApps().length) {
      app = initializeApp(firebaseConfig )
    } else {
      app = getApps()[0]   // už existuje → použijeme ju
    }
    /*
    if (import.meta.env.DEV) {
      connectFirestoreEmulator(db, "localhost", 8080);
    }
    */

    db = getFirestore(app)
    console.log(db.collections)
    ready = true
    return true

  } catch (err) {
    console.error("Init Firebase error:", err)
    return false
  }
}

function eventsCollection() {
  if (!db) throw new Error('Firestore not initialized')
  return collection(db, 'events')
}

export function subscribeEvents(onUpdate: (items: any[]) => void) {
  const col = eventsCollection()
  return onSnapshot(col, (snap) => {
    const arr: any[] = []
    snap.forEach((d: any) => {
      arr.push({ id: d.id, ...(d.data ? d.data() : d.data) })
    })
    onUpdate(arr)
  })
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Firestore timeout")), ms)
    promise
      .then(res => {
        clearTimeout(timer)
        resolve(res)
      })
      .catch(err => {
        clearTimeout(timer)
        reject(err)
      })
  })
}


export async function addEventFirestore(ev: any) {
  const col = eventsCollection()

    try {
      console.log("idem zapisovat do Firebase...")
      console.log("db je: ", db)
ev.id="pokus"
ev.endTime=""
      console.log("ev JSON:", ev)

      const result = await addDoc(collection(db,"events") , ev)
       
      console.log("OK:", result.id)
      return result.id
    } catch (err) {
      console.log("Chyba pri pridavani dokumentu do Firestore")

      if (err instanceof FirebaseError) {
        console.error("Firebase error:", err.code, err.message)
      } else {
        console.error("Neznáma chyba:", err)
      }

      console.log("Chyba, vraciam prazdne id")
      return ''
  }
}


export async function getEventFirestore() {
  const col = eventsCollection()
  
  try {
    console.log("moja db je: ", db)
    console.log("citam dokument z Firestore...")

    const docRef = doc(db, "events", "r9v7Bqhzwgsx8EXLwvp2");
    console.log("citam dokument z Firestore...doc",docRef.id)

    const docSnap = await getDoc(docRef);
    console.log("citam dokument z Firestore...docSnap")

    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
    } else {
      // docSnap.data() will be undefined in this case
      console.log("No such document!");
    }
    console.log("citam dokument z Firestore... done.")

  } catch (err) {
    console.log("Chyba pri citani dokumentu z Firestore", err)

    if (err instanceof FirebaseError) {
      console.error("FBERror:", err.code, err.message)
    } else {
      console.error("Neznáma chyba:", err)
    }

    console.log("Chyba, vraciam prazdne id")
    return ''
  }
}



export async function updateEventFirestore(id: string, ev: any) {
  const d = doc(db, 'events', id)
  console.log(ev)
  ev.endTime = ""
  await setDoc(d, ev)
}

export async function deleteEventFirestore(id: string) {
  const d = doc(db, 'events', id)
  await deleteDoc(d)
}

export function isReady() { return ready }
