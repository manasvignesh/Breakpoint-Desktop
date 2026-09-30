import { app, auth, db, storage } from '../../services/firebase';

export const firebaseConfigured = true;
export const firebaseApp = app;
export { auth, db, storage };
