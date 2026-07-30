import type { Prisma } from "@prisma/client";
import { prisma } from "./prismaClient.js";
import type {
  GuestSessionRecord,
  OAuthAccountRecord,
  OAuthProviderType,
  OAuthStateRecord,
  PasswordResetTokenRecord,
  RefreshSessionRecord,
  UserRecord,
  WorkspaceMembershipRecord,
  WorkspaceRecord,
} from "./models.js";
import type { CreateUserInput, IdentityStore } from "./IdentityStore.js";

type PrismaOAuthProvider = "GOOGLE" | "GITHUB";

function toAppOAuthProvider(provider: PrismaOAuthProvider): OAuthProviderType {
  return provider.toLowerCase() as OAuthProviderType;
}

function toPrismaOAuthProvider(provider: OAuthProviderType): PrismaOAuthProvider {
  return provider.toUpperCase() as PrismaOAuthProvider;
}

function toUserRecord(user: {
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}): UserRecord {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function toOAuthAccountRecord(account: {
  id: string;
  provider: PrismaOAuthProvider;
  providerAccountId: string;
  userId: string;
  createdAt: Date;
}): OAuthAccountRecord {
  return {
    id: account.id,
    provider: toAppOAuthProvider(account.provider),
    providerAccountId: account.providerAccountId,
    userId: account.userId,
    createdAt: account.createdAt,
  };
}

function toRefreshSessionRecord(session: {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByHash: string | null;
}): RefreshSessionRecord {
  return {
    id: session.id,
    userId: session.userId,
    tokenHash: session.tokenHash,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    replacedByHash: session.replacedByHash,
  };
}

function toPasswordResetTokenRecord(token: {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}): PasswordResetTokenRecord {
  return {
    id: token.id,
    userId: token.userId,
    tokenHash: token.tokenHash,
    createdAt: token.createdAt,
    expiresAt: token.expiresAt,
    usedAt: token.usedAt,
  };
}

function toGuestSessionRecord(guest: { id: string; displayName: string; createdAt: Date; lastSeenAt: Date }): GuestSessionRecord {
  return { id: guest.id, displayName: guest.displayName, createdAt: guest.createdAt, lastSeenAt: guest.lastSeenAt };
}

function toOAuthStateRecord(state: {
  id: string;
  state: string;
  provider: PrismaOAuthProvider;
  guestId: string | null;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}): OAuthStateRecord {
  return {
    id: state.id,
    state: state.state,
    provider: toAppOAuthProvider(state.provider),
    guestId: state.guestId,
    createdAt: state.createdAt,
    expiresAt: state.expiresAt,
    usedAt: state.usedAt,
  };
}

function toWorkspaceRecord(workspace: {
  id: string;
  code: string;
  name: string;
  ownerUserId: string | null;
  ownerGuestId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): WorkspaceRecord {
  return {
    id: workspace.id,
    code: workspace.code,
    name: workspace.name,
    ownerUserId: workspace.ownerUserId,
    ownerGuestId: workspace.ownerGuestId,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

function toMembershipRecord(membership: {
  id: string;
  workspaceId: string;
  userId: string | null;
  guestId: string | null;
  role: WorkspaceMembershipRecord["role"];
  pinned: boolean;
  archived: boolean;
  joinedAt: Date;
}): WorkspaceMembershipRecord {
  return {
    id: membership.id,
    workspaceId: membership.workspaceId,
    userId: membership.userId,
    guestId: membership.guestId,
    role: membership.role,
    pinned: membership.pinned,
    archived: membership.archived,
    joinedAt: membership.joinedAt,
  };
}

function ownerColumns(owner: { userId: string } | { guestId: string }): { ownerUserId: string | null; ownerGuestId: string | null } {
  if ("userId" in owner) {
    return { ownerUserId: owner.userId, ownerGuestId: null };
  }
  return { ownerUserId: null, ownerGuestId: owner.guestId };
}

const ROLE_RANK: Record<"OWNER" | "EDITOR" | "VIEWER", number> = { OWNER: 3, EDITOR: 2, VIEWER: 1 };

function higherRole(a: "OWNER" | "EDITOR" | "VIEWER", b: "OWNER" | "EDITOR" | "VIEWER"): "OWNER" | "EDITOR" | "VIEWER" {
  return ROLE_RANK[a] >= ROLE_RANK[b] ? a : b;
}

export function createPrismaIdentityStore(): IdentityStore {
  return {
    async createUser(input: CreateUserInput) {
      const user = await prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          username: input.username,
          displayName: input.displayName,
          passwordHash: input.passwordHash,
        },
      });
      return toUserRecord(user);
    },
    async findUserById(id) {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? toUserRecord(user) : null;
    },
    async findUserByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      return user ? toUserRecord(user) : null;
    },
    async findUserByUsername(username) {
      const user = await prisma.user.findUnique({ where: { username } });
      return user ? toUserRecord(user) : null;
    },
    async updateUser(id, patch) {
      const user = await prisma.user.update({ where: { id }, data: patch });
      return toUserRecord(user);
    },
    async deleteUser(id) {
      await prisma.user.deleteMany({ where: { id } });
    },

    async linkOAuthAccount(userId, provider, providerAccountId) {
      const account = await prisma.oAuthAccount.create({
        data: { userId, provider: toPrismaOAuthProvider(provider), providerAccountId },
      });
      return toOAuthAccountRecord(account);
    },
    async findOAuthAccount(provider, providerAccountId) {
      const account = await prisma.oAuthAccount.findUnique({
        where: { provider_providerAccountId: { provider: toPrismaOAuthProvider(provider), providerAccountId } },
      });
      return account ? toOAuthAccountRecord(account) : null;
    },
    async listOAuthAccounts(userId) {
      const accounts = await prisma.oAuthAccount.findMany({ where: { userId } });
      return accounts.map(toOAuthAccountRecord);
    },
    async unlinkOAuthAccount(userId, provider) {
      await prisma.oAuthAccount.deleteMany({ where: { userId, provider: toPrismaOAuthProvider(provider) } });
    },

    async createRefreshSession(userId, tokenHash, expiresAt) {
      const session = await prisma.refreshSession.create({ data: { userId, tokenHash, expiresAt } });
      return toRefreshSessionRecord(session);
    },
    async findRefreshSessionByHash(tokenHash) {
      const session = await prisma.refreshSession.findFirst({ where: { tokenHash } });
      return session ? toRefreshSessionRecord(session) : null;
    },
    async revokeRefreshSessionsForUser(userId) {
      await prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    },
    async revokeRefreshSession(id) {
      await prisma.refreshSession.updateMany({ where: { id }, data: { revokedAt: new Date() } });
    },
    async replaceRefreshSession(sessionId, newTokenHash, newExpiresAt) {
      const existing = await prisma.refreshSession.findUniqueOrThrow({ where: { id: sessionId } });
      const [, created] = await prisma.$transaction([
        prisma.refreshSession.update({
          where: { id: sessionId },
          data: { revokedAt: new Date(), replacedByHash: newTokenHash },
        }),
        prisma.refreshSession.create({
          data: { userId: existing.userId, tokenHash: newTokenHash, expiresAt: newExpiresAt },
        }),
      ]);
      return toRefreshSessionRecord(created);
    },

    async createPasswordResetToken(userId, tokenHash, expiresAt) {
      const token = await prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
      return toPasswordResetTokenRecord(token);
    },
    async findPasswordResetTokenByHash(tokenHash) {
      const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
      return token ? toPasswordResetTokenRecord(token) : null;
    },
    async markPasswordResetTokenUsed(id) {
      await prisma.passwordResetToken.updateMany({ where: { id }, data: { usedAt: new Date() } });
    },

    async createOAuthState(state, provider, guestId, expiresAt) {
      const record = await prisma.oAuthState.create({
        data: { state, provider: toPrismaOAuthProvider(provider), guestId, expiresAt },
      });
      return toOAuthStateRecord(record);
    },
    async findOAuthStateByValue(state) {
      const record = await prisma.oAuthState.findUnique({ where: { state } });
      return record ? toOAuthStateRecord(record) : null;
    },
    async markOAuthStateUsed(id) {
      await prisma.oAuthState.updateMany({ where: { id }, data: { usedAt: new Date() } });
    },

    async createGuestSession(displayName) {
      const guest = await prisma.guestSession.create({ data: { displayName } });
      return toGuestSessionRecord(guest);
    },
    async findGuestSession(id) {
      const guest = await prisma.guestSession.findUnique({ where: { id } });
      return guest ? toGuestSessionRecord(guest) : null;
    },
    async touchGuestSession(id) {
      await prisma.guestSession.updateMany({ where: { id }, data: { lastSeenAt: new Date() } });
    },
    async deleteGuestSession(id) {
      await prisma.guestSession.deleteMany({ where: { id } });
    },

    async createWorkspace(code, name, owner) {
      const workspace = await prisma.workspace.create({ data: { code, name, ...ownerColumns(owner) } });
      return toWorkspaceRecord(workspace);
    },
    async findWorkspaceByCode(code) {
      const workspace = await prisma.workspace.findUnique({ where: { code } });
      return workspace ? toWorkspaceRecord(workspace) : null;
    },
    async findWorkspaceById(id) {
      const workspace = await prisma.workspace.findUnique({ where: { id } });
      return workspace ? toWorkspaceRecord(workspace) : null;
    },
    async findWorkspacesByIds(ids) {
      if (ids.length === 0) {
        return [];
      }
      const workspaces = await prisma.workspace.findMany({ where: { id: { in: ids } } });
      return workspaces.map(toWorkspaceRecord);
    },
    async updateWorkspaceOwner(workspaceId, owner) {
      const workspace = await prisma.workspace.update({ where: { id: workspaceId }, data: ownerColumns(owner) });
      return toWorkspaceRecord(workspace);
    },
    async transferWorkspaceOwnership(workspaceId, requesterMembershipId, targetMembershipId, newOwner) {
      await prisma.$transaction([
        prisma.workspaceMembership.update({ where: { id: requesterMembershipId }, data: { role: "EDITOR" } }),
        prisma.workspaceMembership.update({ where: { id: targetMembershipId }, data: { role: "OWNER" } }),
        prisma.workspace.update({ where: { id: workspaceId }, data: ownerColumns(newOwner) }),
      ]);
    },
    async deleteWorkspace(workspaceId) {
      await prisma.workspace.delete({ where: { id: workspaceId } });
    },
    async reassignWorkspaceMembershipsOnGuestUpgrade(guestId, userId) {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const guestMemberships = await tx.workspaceMembership.findMany({ where: { guestId } });

        for (const guestMembership of guestMemberships) {
          const existingUserMembership = await tx.workspaceMembership.findUnique({
            where: { workspaceId_userId: { workspaceId: guestMembership.workspaceId, userId } },
          });

          if (!existingUserMembership) {
            await tx.workspaceMembership.update({
              where: { id: guestMembership.id },
              data: { guestId: null, userId },
            });
            continue;
          }

          // Both a guest membership and a registered-user membership exist for this
          // workspace. Merge them into the surviving user membership instead of
          // letting the unique (workspaceId, userId) constraint reject the update.
          const mergedRole = higherRole(existingUserMembership.role, guestMembership.role);
          await tx.workspaceMembership.delete({ where: { id: guestMembership.id } });
          if (mergedRole !== existingUserMembership.role) {
            await tx.workspaceMembership.update({
              where: { id: existingUserMembership.id },
              data: { role: mergedRole },
            });
          }
        }

        await tx.workspace.updateMany({ where: { ownerGuestId: guestId }, data: { ownerGuestId: null, ownerUserId: userId } });
      });
    },

    async upsertMembership(workspaceId, identity, role) {
      if ("userId" in identity) {
        const membership = await prisma.workspaceMembership.upsert({
          where: { workspaceId_userId: { workspaceId, userId: identity.userId } },
          create: { workspaceId, userId: identity.userId, role },
          update: { role },
        });
        return toMembershipRecord(membership);
      }
      const membership = await prisma.workspaceMembership.upsert({
        where: { workspaceId_guestId: { workspaceId, guestId: identity.guestId } },
        create: { workspaceId, guestId: identity.guestId, role },
        update: { role },
      });
      return toMembershipRecord(membership);
    },
    async findMembership(workspaceId, identity) {
      if ("userId" in identity) {
        const membership = await prisma.workspaceMembership.findUnique({
          where: { workspaceId_userId: { workspaceId, userId: identity.userId } },
        });
        return membership ? toMembershipRecord(membership) : null;
      }
      const membership = await prisma.workspaceMembership.findUnique({
        where: { workspaceId_guestId: { workspaceId, guestId: identity.guestId } },
      });
      return membership ? toMembershipRecord(membership) : null;
    },
    async listMembershipsForWorkspace(workspaceId) {
      const memberships = await prisma.workspaceMembership.findMany({ where: { workspaceId } });
      return memberships.map(toMembershipRecord);
    },
    async countMembershipsForWorkspaces(workspaceIds) {
      if (workspaceIds.length === 0) {
        return {};
      }
      const grouped = await prisma.workspaceMembership.groupBy({
        by: ["workspaceId"],
        where: { workspaceId: { in: workspaceIds } },
        _count: { _all: true },
      });
      const counts: Record<string, number> = {};
      for (const group of grouped) {
        counts[group.workspaceId] = group._count._all;
      }
      return counts;
    },
    async listMembershipsForIdentity(identity) {
      const memberships = await prisma.workspaceMembership.findMany({
        where: "userId" in identity ? { userId: identity.userId } : { guestId: identity.guestId },
      });
      return memberships.map(toMembershipRecord);
    },
    async updateMembershipRole(membershipId, role) {
      const membership = await prisma.workspaceMembership.update({ where: { id: membershipId }, data: { role } });
      return toMembershipRecord(membership);
    },
    async setMembershipFlags(membershipId, patch) {
      const membership = await prisma.workspaceMembership.update({ where: { id: membershipId }, data: patch });
      return toMembershipRecord(membership);
    },
  };
}
