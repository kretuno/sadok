import { eq } from 'drizzle-orm';
import { db } from '../db';
import { kindergartenSettings } from '../db/schema';
import { resolveInventoryControlEnabled } from './inventoryControlPolicy';

export const getInventoryControlEnabled = async () => {
  const settings = await db.query.kindergartenSettings.findFirst({
    where: eq(kindergartenSettings.id, 1),
    columns: { inventoryControlEnabled: true },
  });

  return resolveInventoryControlEnabled(settings?.inventoryControlEnabled);
};
