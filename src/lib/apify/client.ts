import { ApifyClient } from "apify-client";

export const apify = new ApifyClient({ token: process.env.APIFY_TOKEN });

/**
 * Start an actor run asynchronously with completion webhooks pointed at
 * /api/webhooks/apify. Returns Apify run id + default dataset id.
 */
export async function startActorRun(
  actorId: string,
  input: Record<string, unknown>,
): Promise<{ runId: string; datasetId: string }> {
  const webhookUrl = new URL(`${process.env.APP_URL}/api/webhooks/apify`);
  webhookUrl.searchParams.set("secret", process.env.APIFY_WEBHOOK_SECRET ?? "");

  const run = await apify.actor(actorId).start(input, {
    webhooks: [
      {
        eventTypes: [
          "ACTOR.RUN.SUCCEEDED",
          "ACTOR.RUN.FAILED",
          "ACTOR.RUN.TIMED_OUT",
          "ACTOR.RUN.ABORTED",
        ],
        requestUrl: webhookUrl.toString(),
      },
    ],
  });
  return { runId: run.id, datasetId: run.defaultDatasetId };
}

export async function fetchDatasetItems(
  datasetId: string,
  offset: number,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const { items } = await apify.dataset(datasetId).listItems({ offset, limit });
  return items as Record<string, unknown>[];
}
