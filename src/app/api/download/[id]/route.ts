import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { download } from "@/lib/storage";
import { failure, HttpError, limit } from "@/lib/security";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    await limit("download:" + user.id, 20, 60);
    const { id } = await params;
    const file = await db.productFile.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!file || !file.media.private)
      throw new HttpError(404, "File tidak ditemukan.");
    const entitlement = await db.entitlement.findFirst({
      where: {
        userId: user.id,
        productId: file.productId,
        revoked: false,
        orderItem: { order: { status: "PAID" } },
      },
    });
    if (!entitlement)
      throw new HttpError(403, "Aset ini belum ada di library Anda.");
    await db.$transaction(
      async (tx) => {
        const current = await tx.entitlement.findUniqueOrThrow({
          where: { id: entitlement.id },
        });
        if (
          current.revoked ||
          (current.downloadLimit !== null &&
            current.downloads >= current.downloadLimit)
        )
          throw new HttpError(403, "Batas unduhan tercapai.");
        await tx.entitlement.update({
          where: { id: current.id },
          data: { downloads: { increment: 1 } },
        });
        await tx.downloadLog.create({
          data: { entitlementId: current.id, fileId: file.id },
        });
      },
      { isolationLevel: "Serializable" },
    );
    return await download(file.media.key, file.media.name, file.media.provider);
  } catch (e) {
    return failure(e);
  }
}
