import type { MetadataCache } from "obsidian";

export class MetadataCacheFacade {
  constructor(private readonly metadataCache: MetadataCache) {}

  getListItem(path: string, line: number) {
    return (
      this.metadataCache
        .getCache(path)
        // todo: can it be a pure function?
        ?.listItems?.find((item) => item.position?.start?.line === line)
    );
  }
}
