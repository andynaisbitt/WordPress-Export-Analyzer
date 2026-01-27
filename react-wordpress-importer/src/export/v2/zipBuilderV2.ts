import JSZip from 'jszip'; // Need to install jszip

export async function createZipBundle(files: { [filename: string]: string | Blob }): Promise<Blob> {
  const zip = new JSZip();

  for (const filename in files) {
    if (Object.prototype.hasOwnProperty.call(files, filename)) {
      zip.file(filename, files[filename]);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  return content;
}
