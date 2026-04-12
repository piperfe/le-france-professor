export interface MediaDownloader {
  download(mediaId: string): Promise<Buffer>;
}
