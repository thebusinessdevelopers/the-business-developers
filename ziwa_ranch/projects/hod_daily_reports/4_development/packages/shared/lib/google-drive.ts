import { google, type drive_v3 } from 'googleapis'

let driveClient: drive_v3.Drive | null = null

function getDriveClient(): drive_v3.Drive {
  if (driveClient) return driveClient

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Google Drive OAuth credentials not configured. ' +
      'Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN.'
    )
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret)
  oauth2.setCredentials({ refresh_token: refreshToken })
  driveClient = google.drive({ version: 'v3', auth: oauth2 })
  return driveClient
}

function getRootFolderId(): string {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable not set')
  }
  return folderId
}

async function findOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string
): Promise<string> {
  const query = `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const { data } = await drive.files.list({
    q: query,
    fields: 'files(id)',
    spaces: 'drive',
  })

  if (data.files && data.files.length > 0) {
    return data.files[0].id!
  }

  const { data: folder } = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  })

  return folder.id!
}

/**
 * Resolves the nested folder path for a media file.
 * Structure: {root} / media / {department-slug} / {YYYY_MM}
 */
async function resolveMediaFolder(
  drive: drive_v3.Drive,
  departmentSlug: string,
  monthFolder: string
): Promise<string> {
  const rootId = getRootFolderId()
  const mediaFolderId = await findOrCreateFolder(drive, 'media', rootId)
  const deptFolderId = await findOrCreateFolder(drive, departmentSlug, mediaFolderId)
  return findOrCreateFolder(drive, monthFolder, deptFolderId)
}

export interface DriveUploadResult {
  fileId: string
  webViewLink: string
}

/**
 * Uploads a file buffer to Google Drive.
 * Path: {root}/media/{department}/{month}/{filename}
 */
export async function uploadToDrive(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  departmentSlug: string,
  monthFolder: string
): Promise<DriveUploadResult> {
  const drive = getDriveClient()
  const folderId = await resolveMediaFolder(drive, departmentSlug, monthFolder)

  const { Readable } = await import('stream')
  const stream = Readable.from(fileBuffer)

  const { data } = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
  })

  if (!data.id) {
    throw new Error('Drive upload returned no file ID')
  }

  await drive.permissions.create({
    fileId: data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })

  const webViewLink = data.webViewLink ?? `https://drive.google.com/file/d/${data.id}/view`

  return {
    fileId: data.id,
    webViewLink,
  }
}

/**
 * Uploads a file from a URL (e.g. Supabase signed URL) to Google Drive.
 * Used by the catch-up sweep endpoint.
 */
export async function uploadToDriveFromUrl(
  signedUrl: string,
  filename: string,
  mimeType: string,
  departmentSlug: string,
  monthFolder: string
): Promise<DriveUploadResult> {
  const response = await fetch(signedUrl)
  if (!response.ok) {
    throw new Error(`Failed to download from signed URL: ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  return uploadToDrive(buffer, filename, mimeType, departmentSlug, monthFolder)
}

export function isDriveConfigured(): boolean {
  return !!(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN &&
    process.env.GOOGLE_DRIVE_FOLDER_ID
  )
}
