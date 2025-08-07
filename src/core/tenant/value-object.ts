import * as z from 'zod';
import { zodParser } from '~/core/+shared/helpers/zod';

export const zTenantId = z.uuid().brand<'TenantId'>();
export type TenantId = z.infer<typeof zTenantId>;
export const TenantId = {
  parse: zodParser(zTenantId),
};
