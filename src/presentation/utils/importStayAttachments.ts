import { getAttachmentService } from '@/infrastructure/services/serviceFactory';
import type { PendingStayAttachment } from '@/presentation/components/stay/stayFormState';

export async function importPendingStayAttachments(
  stayId: string,
  attachments: PendingStayAttachment[],
): Promise<void> {
  if (attachments.length === 0) {
    return;
  }

  const service = getAttachmentService();
  for (const attachment of attachments) {
    await service.importAttachment({
      sourceUri: attachment.uri,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      ownerType: 'stay',
      ownerId: stayId,
      category: attachment.category,
    });
  }
}
