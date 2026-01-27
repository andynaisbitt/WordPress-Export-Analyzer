import JSZip from 'jszip';
import { Attachment } from '../../core/domain/types/Attachment';
import { Post } from '../../core/domain/types/Post';
import { buildMediaManifest } from '../../analysis/manifest/mediaManifestV2';

export const buildMediaManifestCsv = (posts: Post[], attachments: Attachment[]) => {
  const manifest = buildMediaManifest(posts, attachments);
  const headers = [
    'url',
    'filename',
    'status',
    'type',
    'used_in_post_ids',
    'matched_attachment_id',
    'matched_attachment_url',
  ];
  const rows = manifest.map((row) => [
    row.url,
    row.filename,
    row.status,
    row.type,
    row.whereUsedPostIds.join('|'),
    row.matchedAttachmentId ?? '',
    row.matchedAttachmentUrl ?? '',
  ]);
  const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  return { csv, manifest };
};

export const buildMediaZip = async (attachments: Attachment[]) => {
  const zip = new JSZip();
  const errors: string[] = [];

  for (const attachment of attachments) {
    if (!attachment.Url) continue;
    try {
      const response = await fetch(attachment.Url);
      if (!response.ok) {
        errors.push(`${attachment.Url} (${response.status})`);
        continue;
      }
      const blob = await response.blob();
      const filename = attachment.Url.split('/').pop() || `attachment-${attachment.PostId}`;
      zip.file(filename, blob);
    } catch (error) {
      errors.push(`${attachment.Url} (fetch failed)`);
    }
  }

  if (errors.length) {
    zip.file('media-errors.txt', errors.join('\n'));
  }

  return zip.generateAsync({ type: 'blob' });
};
