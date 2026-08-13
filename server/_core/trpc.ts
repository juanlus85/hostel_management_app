import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const disallowTablet = t.middleware(async opts => {
  if (opts.ctx.user?.role === "tablet") {
    throw new TRPCError({ code: "FORBIDDEN", message: "La Tablet solo puede acceder al registro policial" });
  }
  return opts.next({ ctx: { ...opts.ctx, user: opts.ctx.user! } });
});

export const protectedProcedure = t.procedure.use(requireUser).use(disallowTablet);

export const tabletProcedure = t.procedure.use(
  t.middleware(async opts => {
    if (!opts.ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    if (opts.ctx.user.role !== "tablet" && opts.ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acceso exclusivo para registro de recepción" });
    }
    return opts.next({ ctx: { ...opts.ctx, user: opts.ctx.user } });
  }),
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
