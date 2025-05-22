import { ErrorCode as Exception } from '@alessiofrittoli/exception/code'

export enum Request
{
	XHR_NOT_AVAILABLE	= 'ERR:XHRNOTAVAILABLE',
	XHR_INVALID_STATE	= 'ERR:XHRINVALIDSTATE',
}

export const ErrorCode	= { Exception, Request }
export type ErrorCode	= MergedEnumValue<typeof ErrorCode>