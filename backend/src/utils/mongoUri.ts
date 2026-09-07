export function mascararMongoUri(uri: string): string {
  return uri.replace(/\/\/([^:/@]+):([^@]+)@/, "//***:***@");
}
