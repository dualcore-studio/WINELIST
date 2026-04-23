"use client";

import { id, init } from "@instantdb/react";

const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const isPlaceholder = appId === "replace_with_your_instant_app_id";
const isInstantConfigured = Boolean(appId) && !isPlaceholder;

export const db = isInstantConfigured ? init({ appId: appId as string }) : null;
export { isInstantConfigured };
export { id };
