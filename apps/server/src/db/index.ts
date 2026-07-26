import { createPrismaIdentityStore } from "./prismaIdentityStore.js";
import { createPrismaWorkspaceStore } from "./prismaWorkspaceStore.js";
import type { IdentityStore } from "./IdentityStore.js";
import type { WorkspaceStore } from "./WorkspaceStore.js";

export const identityStore: IdentityStore = createPrismaIdentityStore();
export const workspaceStore: WorkspaceStore = createPrismaWorkspaceStore();
export type { IdentityStore } from "./IdentityStore.js";
export type { WorkspaceStore } from "./WorkspaceStore.js";
export * from "./models.js";
