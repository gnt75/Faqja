async hydrateFile(id: string) {
  const db = await this.init();

  const record = await db.get("files", id);
  if (!record) return null;

  const filePath = `/ligje/${record.path}`;

  try {
    const res = await fetch(filePath);

    if (!res.ok) {
      console.error(`❌ Fetch dështoi për ${filePath}:`, res.status, res.statusText);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";

    // KONTROLLI KRITIK — Mos prano HTML
    if (!contentType.includes("application/pdf")) {
      const preview = await res.text();
      console.error("❌ Serveri ktheu CONTENT-JO-PDF: ", {
        contentType,
        preview: preview.slice(0, 200),
      });
      throw new Error(`Server returned non-PDF content for file ${id}`);
    }

    const blob = await res.blob();

    record.content = blob;
    record.size = blob.size;
    await db.put("files", record);

    return blob;
  } catch (e) {
    console.error(`❌ Dështoi shkarkimi i skedarit ${id}:`, e);
    return null;
  }
}
