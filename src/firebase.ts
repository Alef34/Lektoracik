import { initializeApp } from 'firebase/app'
import { getFirestore, collection, onSnapshot, addDoc, setDoc, doc, deleteDoc } from 'firebase/firestore'

let db: any = null
let ready = false

export async function initFirebase(): Promise<boolean> {
  if (ready) return true
  try {
    // expect a JSON file served from /firebaseConfig.json (place in `public/`)
    const res = await fetch('/firebaseConfig.json')
    if (!res.ok) return false
    const cfg = await res.json()
    const app = initializeApp(cfg)
    db = getFirestore(app)
    ready = true
    return true
  } catch (err) {
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

export async function addEventFirestore(ev: any) {
  const col = eventsCollection()
  const ref = await addDoc(col, ev)
  return ref.id
}

export async function updateEventFirestore(id: string, ev: any) {
  const d = doc(db, 'events', id)
  await setDoc(d, ev)
}

export async function deleteEventFirestore(id: string) {
  const d = doc(db, 'events', id)
  await deleteDoc(d)
}

export function isReady() { return ready }
