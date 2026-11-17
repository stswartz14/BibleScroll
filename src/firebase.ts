import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export type GoogleSignInOutcome =
  | { status: 'signed_in'; user: User }
  | { status: 'redirecting' }
  | { status: 'cancelled'; message: string }
  | { status: 'error'; message: string };

export async function signInWithGoogleSmart(): Promise<GoogleSignInOutcome> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { status: 'signed_in', user: result.user };
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return {
        status: 'cancelled',
        message: 'Sign-in window closed before completing.',
      };
    }

    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      const inIframe = (() => {
        try {
          return window.self !== window.top;
        } catch {
          return true;
        }
      })();

      if (inIframe) {
        return {
          status: 'error',
          message:
            'Your browser blocked the Google Sign-In popup inside this embedded preview. Allow popups for this site or open the app in a standalone tab to sign in.',
        };
      }

      try {
        await signInWithRedirect(auth, googleProvider);
        return { status: 'redirecting' };
      } catch (redirectError) {
        return {
          status: 'error',
          message:
            redirectError instanceof Error
              ? redirectError.message
              : 'Unable to launch Google Sign-In redirect.',
        };
      }
    }

    if (code === 'auth/unauthorized-domain') {
      return {
        status: 'error',
        message:
          'This preview domain is not authorized for Google Sign-In yet. Your likes and bookmarks remain safely saved on this device.',
      };
    }

    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unable to sign in with Google.',
    };
  }
}

export async function checkRedirectSignIn(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (error) {
    console.warn('Redirect sign-in check failed:', error);
    return null;
  }
}

export async function signOutAccount(): Promise<void> {
  await signOut(auth);
}
