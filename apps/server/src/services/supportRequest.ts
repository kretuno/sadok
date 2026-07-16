export const SUPPORT_CATEGORIES = ['bug', 'question', 'suggestion'] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export interface SupportRequestInput {
  category: string;
  subject: string;
  message: string;
  contact?: string;
}

export interface SupportMetadata {
  appVersion: string;
  platform: string;
}

export interface NormalizedSupportRequest {
  category: SupportCategory;
  subject: string;
  message: string;
  contact: string;
  appVersion: string;
  platform: string;
}

export const normalizeSupportRequest = (
  input: SupportRequestInput,
  metadata: SupportMetadata,
): NormalizedSupportRequest => {
  const category = String(input.category || '').trim().toLowerCase();
  const subject = String(input.subject || '').trim();
  const message = String(input.message || '').trim();
  const contact = String(input.contact || '').trim();
  const appVersion = String(metadata.appVersion || '').trim();
  const platform = String(metadata.platform || '').trim();

  if (!SUPPORT_CATEGORIES.includes(category as SupportCategory)) {
    throw new Error('Оберіть категорію звернення');
  }
  if (subject.length < 5 || subject.length > 120) {
    throw new Error('Тема повинна містити від 5 до 120 символів');
  }
  if (message.length < 10 || message.length > 4000) {
    throw new Error('Опис повинен містити від 10 до 4000 символів');
  }
  if (contact.length > 160) {
    throw new Error('Контактні дані занадто довгі');
  }

  return {
    category: category as SupportCategory,
    subject,
    message,
    contact,
    appVersion: appVersion.slice(0, 30),
    platform: platform.slice(0, 160),
  };
};
