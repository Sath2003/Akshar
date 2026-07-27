import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { resolveAsset } from './audio-repository.js'

/**
 * Audio asset service.
 * Generates short-lived signed S3 URLs for approved audio assets.
 * Uses EC2 IAM role for authentication (no static AWS credentials).
 */
export class AudioService {
  /**
   * @param {object} config
   * @param {string} config.region
   * @param {string} config.bucket
   * @param {string} config.audioPrefix
   * @param {number} config.ttlSeconds
   * @param {import('pino').Logger} config.logger
   */
  constructor({ region, bucket, audioPrefix, ttlSeconds, logger }) {
    this._s3 = new S3Client({ region })
    this._bucket = bucket
    this._audioPrefix = audioPrefix
    this._ttlSeconds = ttlSeconds
    this._logger = logger
  }

  /**
   * Generate a signed URL for an approved audio asset.
   *
   * @param {string} assetId - client-supplied asset ID (validated here)
   * @returns {Promise<{ url: string, expiresIn: number } | null>}
   *   null if the asset is unknown or ID is invalid
   * @throws if S3 signing fails
   */
  async getSignedAudioUrl(assetId) {
    const asset = resolveAsset(assetId)
    if (!asset) return null

    // Ensure the resolved key begins with the approved prefix (defence-in-depth)
    const expectedPrefix = this._audioPrefix
    if (!asset.s3Key.startsWith(expectedPrefix)) {
      this._logger.error(
        { assetId, s3Key: asset.s3Key, expectedPrefix },
        'Asset key does not start with approved prefix — refusing to sign',
      )
      return null
    }

    const command = new GetObjectCommand({
      Bucket: this._bucket,
      Key: asset.s3Key,
    })

    try {
      const url = await getSignedUrl(this._s3, command, {
        expiresIn: this._ttlSeconds,
      })
      return { url, expiresIn: this._ttlSeconds }
    } catch (err) {
      this._logger.error(
        { assetId, err: err instanceof Error ? err.message : String(err) },
        'Failed to generate signed S3 URL',
      )
      throw new Error('Failed to generate audio URL')
    }
  }
}
