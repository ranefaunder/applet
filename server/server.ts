import { initDb } from "./database/db";

import staticRoute from "./routes/static";
import clientJsRoute from "./routes/client-js";
import appRoute from "./routes/app";
import rootRoute from "./routes/root";
import redirectRoute from "./routes/redirect";
import robotsTxt from "./routes/robots-txt";
import sitemapXml from "./routes/sitemap-xml";
import siteWebmanifest from "./routes/site-webmanifest";
import { appRunHtml, appRunModule } from "./routes/app-run";

import authLogout from "./api/auth/logout";
import authRegister from "./api/auth/register";
import authRequestLoginCode from "./api/auth/request-login-code";
import authVerifyLoginCode from "./api/auth/verify-login-code";
import userMe from "./api/user/me";
import userMarketing from "./api/user/marketing";
import appGenerate from "./api/app/generate";
import appGet from "./api/app/get";
import appList from "./api/app/list";
import meta from "./api/meta";

await initDb();

const server = Bun.serve({
  port: Number(process.env.PORT) || 8090,
  development: process.env.NODE_ENV !== "production",

  routes: {
    "/robots.txt": robotsTxt,
    "/sitemap.xml": sitemapXml,
    "/:lang/site.webmanifest": siteWebmanifest,
    "/.well-known/*": () => new Response(null, { status: 404 }),
    "/api/:lang/meta": meta,
    "/api/:lang/app/generate": appGenerate,
    "/api/:lang/app/get": appGet,
    "/api/:lang/app/list": appList,
    "/api/:lang/user/me": userMe,
    "/api/:lang/user/marketing": userMarketing,
    "/api/:lang/auth/logout": authLogout,
    "/api/:lang/auth/register": authRegister,
    "/api/:lang/auth/request-login-code": authRequestLoginCode,
    "/api/:lang/auth/verify-login-code": authVerifyLoginCode,

    "/static/*": staticRoute,
    "/app.js": clientJsRoute,
    "/:lang/app/:slug/run.js": appRunModule,
    "/:lang/app/:slug/run": appRunHtml,
    "/:lang": redirectRoute,
    "/:lang/": appRoute,
    "/:lang/*": appRoute,
    "/": rootRoute,
  },
});

console.log(`🚀 App Studo running at http://localhost:${server.port}`);
