import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const encoder = new TextEncoder();
  let lastSeenAt = new Date(0);
  let active = true;

  request.signal.addEventListener("abort", () => {
    active = false;
  });

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: ready\ndata: ${JSON.stringify({ runId: id })}\n\n`));

      while (active) {
        const rows = await db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.runId, id))
          .orderBy(asc(auditLogs.createdAt));

        const unseen = rows.filter((row) => row.createdAt > lastSeenAt);
        if (unseen.length > 0) {
          for (const row of unseen) {
            controller.enqueue(
              encoder.encode(`event: audit\ndata: ${JSON.stringify(row)}\n\n`)
            );
            if (row.createdAt > lastSeenAt) {
              lastSeenAt = row.createdAt;
            }
          }
        } else {
          controller.enqueue(encoder.encode("event: heartbeat\ndata: {}\n\n"));
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      controller.close();
    },
    cancel() {
      active = false;
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
