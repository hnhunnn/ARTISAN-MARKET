// src/backend/firebaseConfig.ts

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA6_WhhyMX178U8zqwGRcJ1VeSyj8mf8bk',
  authDomain: 'artisan-market-24ef5.firebaseapp.com',
  projectId: 'artisan-market-24ef5',
  storageBucket: 'artisan-market-24ef5.firebasestorage.app',
  messagingSenderId: '493659443550',
  appId: '1:493659443550:web:c2f5ed6edbf0138e2f3fcf',
  measurementId: 'G-5XLG53BHEX',
};
// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Firestore và export nó
const db = getFirestore(app);

export { db };
