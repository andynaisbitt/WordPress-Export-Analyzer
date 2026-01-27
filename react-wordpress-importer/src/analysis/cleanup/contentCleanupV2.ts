export function removeUtmParameters(url: string): string {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
      params.delete(param);
    });
    urlObj.search = params.toString();
    return urlObj.toString();
  } catch (error) {
    console.warn(`Invalid URL provided to removeUtmParameters: ${url}, error: ${error}`);
    return url;
  }
}

export function enforceHttps(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol === 'http:') {
      urlObj.protocol = 'https:';
    }
    return urlObj.toString();
  } catch (error) {
    console.warn(`Invalid URL provided to enforceHttps: ${url}, error: ${error}`);
    return url;
  }
}

export function removeInlineStyles(htmlContent: string): string {
  // This is a basic regex and might not cover all edge cases.
  // For robust HTML manipulation, a DOM parser would be better.
  return htmlContent.replace(/style="[^"]*"/gi, '');
}

export function stripEmptyTags(htmlContent: string): string {
  // This regex will strip empty HTML tags like <p></p>, <div></div>, etc.
  // It might not cover tags with only whitespace or comments inside.
  return htmlContent.replace(/<(\w+)([^>]*)><\/\1>/g, '');
}
