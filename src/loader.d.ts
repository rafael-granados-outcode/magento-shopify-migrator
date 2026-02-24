import { MagentoProduct } from "./types";
export declare function loadProducts(): Promise<MagentoProduct[]>;
export declare function loadParentChildMap(): Promise<Map<number, number[]>>;
export declare function loadCategoryMap(): Promise<Map<number, string[]>>;
export declare function loadMediaGallery(): Promise<Map<number, string[]>>;
//# sourceMappingURL=loader.d.ts.map