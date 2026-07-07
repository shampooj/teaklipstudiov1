import wasmAsset from "../../public/banuba/BanubaSDK.wasm.asset.json";
import wasmSimdAsset from "../../public/banuba/BanubaSDK.simd.wasm.asset.json";

export const BANUBA_SDK_BASE = "/banuba";

const OVERRIDES: Record<string, string> = {
  "BanubaSDK.wasm": wasmAsset.url,
  "BanubaSDK.simd.wasm": wasmSimdAsset.url,
};

export function locateBanubaFile(fileName: string): string {
  return OVERRIDES[fileName] ?? `${BANUBA_SDK_BASE}/${fileName}`;
}
