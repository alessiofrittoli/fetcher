import type { Exception } from '@alessiofrittoli/exception'

export namespace Fetch
{
	export type Result<T> = {
		/** The received Response. */
		response: Response | null
		/** The received Response Headers. */
		headers	: Headers | null
	} & (
		{
			/** The parsed data. */
			data: T
			error: null
		} | {
			/** The parsed error. */
			error: Exception
			data: null
		}
	)
	
	
	export type ReturnDataType<T, U extends RequestInit = RequestInit> = (
		T extends undefined ? (
			U[ 'responseType' ] extends 'blob' ? Blob :
			U[ 'responseType' ] extends 'formdata' ? FormData :
			U[ 'responseType' ] extends 'arraybuffer' ? ArrayBuffer :
			string
		) : T
	)
	
	export type OnFulfilledCallback<V> = ( response: Response ) => Fetch.Result<V> | PromiseLike<Fetch.Result<V>>
}