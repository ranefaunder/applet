/**
 * Handler for building and serving App.tsx as App.js
 */
export default async function (): Promise<Response> {
  const result = await Bun.build({
    entrypoints: [`${import.meta.dir}/../../app/App`],
    target: "browser",
    /** resize-image.ts lataa sharpin vain palvelinpolulla; älä sido selainbundleen. */
    external: ["sharp"],
  });
  return new Response(result.outputs[0], {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

