import type * as z from 'zod';

// zod の parse() の引数は unknown で、寛容すぎるので z.input<T> => z.output<T> の関数を自前で定義する
export const zodParser = <T extends z.ZodType>(schema: T) => {
  return (x: z.input<T>): z.output<T> => {
    // TODO: Domain Error で wrap する
    return schema.parse(x);
  };
};
