import type { BunRequest } from "bun";
import { getAuthenticatedUser } from "/utils/auth.server";
import { apiSuccess } from "/utils/api.server";
import { dbListLibraryApps } from "/server/database/queries/apps";

export default {
  async GET(req: BunRequest) {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return apiSuccess({ data: { apps: [] } });
    }

    return apiSuccess({ data: { apps: dbListLibraryApps(user.id) } });
  },
};
