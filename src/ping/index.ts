import { Url, type UrlInput } from '@alessiofrittoli/url-utils'

/**
 * Asynchronously sends an HTTP POST request containing a small amount of data to a web server.
 *
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
 */
export const ping = (url: UrlInput, data?: BodyInit | null): boolean =>
	navigator.sendBeacon(Url.format(url), data)
