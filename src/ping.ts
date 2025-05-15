
import { Url, type UrlInput } from '@alessiofrittoli/url-utils'

/**
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
 */
export const ping = ( url: UrlInput, data?: BodyInit | null ) => {
	navigator.sendBeacon( Url.format( url ), data )
}