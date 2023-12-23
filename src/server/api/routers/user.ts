import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { hash } from "bcrypt";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

function exclude<User, Key extends keyof User>(
  user: User,
  keys: Key[]
): Omit<User, Key> {
  for (const key of keys) {
    delete user[key];
  }
  return user;
}

export const userRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        birthday: z.string(),
        email: z.string().email(),
        name: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { birthday, email, name, password } = input;

      const exists = await ctx.prisma.user.findFirst({
        where: { email },
      });

      if (exists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      const hashedPassword = await hash(password, 12);

      const user = await ctx.prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          birthday,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Couldn't create user",
        });
      }

      const account = await ctx.prisma.account.create({
        data: {
          providerAccountId: user.id,
          userId: user.id,
          type: "credentials",
          provider: "credentials",
        },
      });

      if (!account) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Couldn't create account",
        });
      }

      return user;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        include: {
          sessions: true,
        },
        where: {
          id: input.id,
        },
      });

      if (!user)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Could not find user with id ${input.id}`,
        });

      return exclude(user, ["password"]);
    }),

  editPicture: protectedProcedure
    .input(
      z.object({
        image: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          image: input.image,
        },
      });

      return exclude(user, ["password"]);
    }),

  delete: protectedProcedure.mutation(async ({ ctx }) => {
    return await ctx.prisma.user.delete({
      where: {
        id: ctx.session.user.id,
      },
    });
  }),
});
