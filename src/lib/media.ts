// Client-side media prep: compress images and validate/limit videos before they
// are uploaded, so big phone photos and long clips don't bloat storage.

export const MAX_VIDEO_SECONDS = 15
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024 // 40 MB safety cap

/** Downscale + re-encode an image to keep uploads small. Returns the original on failure. */
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    let { width, height } = bitmap
    const scale = Math.min(1, maxDim / Math.max(width, height))
    width = Math.max(1, Math.round(width * scale))
    height = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file // don't upsize
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/** Read a video's duration (seconds) from its metadata. */
export function videoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(v.duration || 0)
    }
    v.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that video.'))
    }
    v.src = url
  })
}

/**
 * Prepare a file for upload: compress images; enforce the video length + size
 * limits. Throws a user-friendly Error if a video is too long or too large.
 */
export async function prepareUpload(file: File): Promise<File> {
  if (file.type.startsWith('video/')) {
    const dur = await videoDuration(file).catch(() => 0)
    if (dur > MAX_VIDEO_SECONDS + 0.5) {
      throw new Error(`Videos must be ${MAX_VIDEO_SECONDS} seconds or less. Please trim it and try again.`)
    }
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error('That video is too large. Please record a shorter or lower-resolution clip.')
    }
    return file
  }
  return compressImage(file)
}
