interface ImportMetaEnv {
readonly VITE_FIREBASE_API_KEY:string;
readonly VITE_FIREBASE_AUTH_DOMAIN:string;
readonly VITE_FIREBASE_PROJECTID:string;
readonly VITE_FIREBASE_STORAGEBUCKET:string;
readonly VITE_FIREBASE_MESSAGINGSENDERID:string;
readonly VITE_FIREBASE_APPID:string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}