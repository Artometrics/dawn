import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { PROJECT_ID } from './config.js';

if (getApps().length === 0) {
  initializeApp({ projectId: process.env.GCLOUD_PROJECT || PROJECT_ID });
}

export const db = getFirestore();
export const authAdmin = getAuth();
export { FieldValue, Timestamp };
