import * as z from 'zod';
import { zodParser } from '~/core/+shared/helpers/zod';

export const zUserId = z.int().min(0).brand<'UserId'>();
export type UserId = z.infer<typeof zUserId>;
export const UserId = {
  parse: zodParser(zUserId),
};

export const zUserName = z.string().min(1).max(20).brand<'UserName'>();
export type UserName = z.infer<typeof zUserName>;
export const UserName = {
  parse: zodParser(zUserName),
};
