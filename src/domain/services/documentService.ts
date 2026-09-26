import {
  createDocument,
  deleteDocument,
  documentCategory,
  getDocumentById,
  listDocuments,
  saveDocument,
} from '@/data/repositories/documentRepository';
import { deleteAttachmentsByOwner } from '@/data/repositories/attachmentRepository';
import { formatExpiryLabel, getDocumentExpiryState } from '@/domain/utils/documentExpiry';
import { AttachmentService, getDeletionImpact } from '@/domain/services/attachmentService';
import type { Document, DocumentType, DocumentWithAttachments } from '@/shared/types';

export { formatExpiryLabel, getDocumentExpiryState } from '@/domain/utils/documentExpiry';

export class DocumentService {
  constructor(private readonly attachmentService: AttachmentService) {}

  async listWithAttachments(): Promise<DocumentWithAttachments[]> {
    const documents = await listDocuments();
    return Promise.all(documents.map((document) => this.withAttachments(document)));
  }

  async getWithAttachments(id: string): Promise<DocumentWithAttachments | null> {
    const document = await getDocumentById(id);
    if (!document) {
      return null;
    }
    return this.withAttachments(document);
  }

  async create(input: {
    title: string;
    documentType: DocumentType;
    issueDate?: string | null;
    expiryDate?: string | null;
    issuingCountry?: string | null;
    documentNumber?: string | null;
    notes?: string | null;
    linkedStayId?: string | null;
    maxStayDays?: number | null;
    maxEntries?: number | null;
  }): Promise<DocumentWithAttachments> {
    const document = await createDocument({
      title: input.title,
      documentType: input.documentType,
      issueDate: input.issueDate ?? null,
      expiryDate: input.expiryDate ?? null,
      issuingCountry: input.issuingCountry ?? null,
      documentNumber: input.documentNumber ?? null,
      notes: input.notes ?? null,
      linkedStayId: input.linkedStayId ?? null,
      maxStayDays: input.maxStayDays ?? null,
      maxEntries: input.maxEntries ?? null,
    });
    return this.withAttachments(document);
  }

  async update(document: Document): Promise<DocumentWithAttachments> {
    const saved = await saveDocument(document);
    return this.withAttachments(saved);
  }

  async delete(id: string): Promise<{ attachmentCount: number }> {
    const impact = await getDeletionImpact('document', id);
    const attachments = await deleteAttachmentsByOwner('document', id);
    for (const attachment of attachments) {
      await this.attachmentService.deleteAttachment(attachment.id);
    }
    await deleteDocument(id);
    return impact;
  }

  private async withAttachments(document: Document): Promise<DocumentWithAttachments> {
    const attachments = await this.attachmentService.listForOwner('document', document.id);
    return {
      ...document,
      attachments,
      expiryState: getDocumentExpiryState(document.expiryDate),
    };
  }
}

export { documentCategory };
