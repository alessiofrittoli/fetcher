declare global
{
	interface RequestInit
	{
		/** The expected ResponseType. */
		responseType?: XMLHttpRequestResponseType | 'formdata'
	}


	interface ProgressEvent
	{
		readonly type: keyof XMLHttpRequestEventTargetEventMap
	}
}

export type DoNotUse = never