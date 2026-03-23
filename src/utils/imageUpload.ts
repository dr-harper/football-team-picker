import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadLeagueCoverImage(leagueId: string, file: File): Promise<string> {
    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Only JPEG, PNG, and WebP images are supported');
    }
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('Image must be under 5 MB');
    }
    const storageRef = ref(storage, `league-covers/${leagueId}/${Date.now()}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}
