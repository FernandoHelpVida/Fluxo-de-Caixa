import type { RecordAuthResponse, RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'

export function currentUser(): RecordModel | null {
  return pb.authStore.record
}

export function isAuthenticated(): boolean {
  return pb.authStore.isValid
}

export async function signIn(
  email: string,
  password: string,
): Promise<RecordAuthResponse<RecordModel>> {
  return pb.collection('users').authWithPassword(email.trim(), password)
}

export function signOut(): void {
  pb.authStore.clear()
}

export function onAuthChange(callback: () => void): () => void {
  return pb.authStore.onChange(callback, true)
}
