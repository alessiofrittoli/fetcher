import { ErrorCode as Exception } from '@alessiofrittoli/exception/code'
import type { ValueOf } from '@alessiofrittoli/type-utils'

export const Request = {
	XHR_NOT_AVAILABLE: 'ERR:XHRNOTAVAILABLE',
	XHR_INVALID_STATE: 'ERR:XHRINVALIDSTATE',
} as const

export const ErrorCode = { ...Exception, ...Request } as const

export type ErrorCode = ValueOf<typeof ErrorCode>
