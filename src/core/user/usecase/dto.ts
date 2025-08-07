import * as z from 'zod';
import { zodParser } from '~/core/+shared/helpers/zod';
import { zUserEmail, zUserId, zUserName } from '../value-object';

const zUserActiveDto = z.object({
  status: z.literal('active'),
  id: zUserId,
  name: zUserName,
  email: zUserEmail,
});
export type UserActiveDto = z.infer<typeof zUserActiveDto>;

const zUserDeletedDto = z.object({
  status: z.literal('deleted'),
  name: zUserName,
});
export type UserDeletedDto = z.infer<typeof zUserDeletedDto>;

export const zUserDto = z.discriminatedUnion('status', [zUserActiveDto, zUserDeletedDto]);
export type UserDto = z.infer<typeof zUserDto>;
export const UserDto = {
  parse: zodParser(zUserDto),
};
