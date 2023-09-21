"use client";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDYUUugxnC_y-Ks8aLzjoI7KX-_L0yiqqI",
  authDomain: "gamebattle-eef0d.firebaseapp.com",
  projectId: "gamebattle-eef0d",
  storageBucket: "gamebattle-eef0d.appspot.com",
  messagingSenderId: "396013676669",
  appId: "1:396013676669:web:4d354664953fb625d82914",
  measurementId: "G-TGHHLWBJ03",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
export const login = async () => {
  const result = await signInWithPopup(auth, provider);
  console.log(result);
  return result;
};
export const logout = async () => {
  await signOut(auth);
};
