export const BANUBA_SDK_BASE = "/banuba";

export function locateBanubaFile(fileName: string): string {
  return `${BANUBA_SDK_BASE}/${fileName}`;
}
