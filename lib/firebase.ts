import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  ContactEntry,
  CurrencyKey,
  DirectoryProfile,
  LookingFor,
  RoleKey,
  SEED_PROFILES,
  sanitizeCollabForFirestore,
  sanitizeProfileForFirestore,
} from './rateroast';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
  path: string | null
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

let connectionTested = false;
export async function testConnection(): Promise<void> {
  if (connectionTested) return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

const PROFILES_COLLECTION = 'directory_profiles';
const COLLAB_COLLECTION = 'collab_requests';

function mapDocToProfile(data: Record<string, unknown>, docId: string): DirectoryProfile {
  const created = data.createdAt;
  const createdAtMs =
    created instanceof Timestamp ? created.toMillis() : Date.now();
  return {
    id: typeof data.id === 'string' ? data.id : docId,
    name: typeof data.name === 'string' ? data.name : '@builder',
    role: (['ai', 'design', 'copy', 'dev'].includes(String(data.role))
      ? data.role
      : 'ai') as RoleKey,
    rate: typeof data.rate === 'number' ? data.rate : 50,
    cur: (data.cur === 'idr' ? 'idr' : 'usd') as CurrencyKey,
    score: typeof data.score === 'number' ? data.score : 85,
    originalScore:
      typeof data.originalScore === 'number' ? data.originalScore : 85,
    isDemoPublish: Boolean(data.isDemoPublish),
    line: typeof data.line === 'string' ? data.line : '',
    rewrittenPitch:
      typeof data.rewrittenPitch === 'string' ? data.rewrittenPitch : '',
    looking: (typeof data.looking === 'string'
      ? data.looking
      : 'Technical Co-Builder') as LookingFor,
    skills: Array.isArray(data.skills)
      ? data.skills.map((s) => String(s)).slice(0, 3)
      : [],
    contacts: Array.isArray(data.contacts)
      ? (data.contacts as ContactEntry[]).filter(
          (c) => c && typeof c.label === 'string' && typeof c.value === 'string'
        )
      : [{ label: 'Handle', value: String(data.name || '@builder') }],
    isSeed: Boolean(data.isSeed),
    createdAtMs,
  };
}

let seedChecked = false;
export async function ensureSeedProfiles(): Promise<void> {
  if (seedChecked) return;
  seedChecked = true;
  try {
    const snap = await getDocs(collection(db, PROFILES_COLLECTION));
    if (snap.empty) {
      await Promise.all(
        SEED_PROFILES.map((seed) => {
          const sanitized = sanitizeProfileForFirestore(seed);
          return setDoc(doc(db, PROFILES_COLLECTION, sanitized.id), {
            ...sanitized,
            createdAt: serverTimestamp(),
          });
        })
      );
    }
  } catch (error) {
    seedChecked = false;
    handleFirestoreError(error, OperationType.WRITE, PROFILES_COLLECTION);
  }
}

export function subscribeDirectoryProfiles(
  onUpdate: (profiles: DirectoryProfile[]) => void,
  onError: (err: Error) => void
): () => void {
  const q = query(
    collection(db, PROFILES_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        mapDocToProfile(d.data() as Record<string, unknown>, d.id)
      );
      // Keep user-published cards above seeded cards, preserving newest-first within each group
      items.sort((a, b) => {
        if (a.isSeed !== b.isSeed) return a.isSeed ? 1 : -1;
        return (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
      });
      onUpdate(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, PROFILES_COLLECTION);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function publishProfileToDirectory(
  profile: Omit<DirectoryProfile, 'createdAtMs'>
): Promise<DirectoryProfile> {
  const sanitized = sanitizeProfileForFirestore(profile);
  const path = `${PROFILES_COLLECTION}/${sanitized.id}`;
  try {
    await setDoc(doc(db, PROFILES_COLLECTION, sanitized.id), {
      ...sanitized,
      createdAt: serverTimestamp(),
    });
    return { ...sanitized, createdAtMs: Date.now() };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteDirectoryProfile(profileId: string): Promise<void> {
  const path = `${PROFILES_COLLECTION}/${profileId}`;
  try {
    await deleteDoc(doc(db, PROFILES_COLLECTION, profileId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function submitCollabRequest(input: {
  id: string;
  targetProfileId: string;
  targetName: string;
  senderHandle: string;
  message: string;
}): Promise<void> {
  const sanitized = sanitizeCollabForFirestore(input);
  const path = `${COLLAB_COLLECTION}/${sanitized.id}`;
  try {
    await setDoc(doc(db, COLLAB_COLLECTION, sanitized.id), {
      ...sanitized,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
