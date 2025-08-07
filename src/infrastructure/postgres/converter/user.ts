import type { Prisma } from '@prisma/client';
import { UserDto } from '~/core/user/usecase/dto';

type $User = Prisma.UserGetPayload<{
  include: {
    active: true;
    deleted: true;
  };
}>;

export const toUserDto = (user: $User): UserDto => {
  if (user.active) {
    return UserDto.parse({
      status: 'active',
      id: user.id,
      email: user.active.email,
      name: user.name,
    });
  }

  return UserDto.parse({
    status: 'deleted',
    name: user.name,
  });
};
