import { EventEmitter } from '@alessiofrittoli/event-emitter'
import type { XHR } from '@/types'
import { vi } from 'vitest'

type OriginalXMLHttpRequest = globalThis.XMLHttpRequest

export class XMLHttpRequest extends EventEmitter {
	public method: XHR.Method
	public readyState: number
	public responseURL: string
	public status: number

	public static readonly UNSENT = 0
	public static readonly OPENED = 1
	public static readonly HEADERS_RECEIVED = 2
	public static readonly LOADING = 3
	public static readonly DONE = 4

	public constructor() {
		super()

		this.method = 'GET'
		this.readyState = 0
		this.responseURL = ''
		this.status = 200
	}

	public open = vi.fn((...args: Parameters<OriginalXMLHttpRequest['open']>) => {
		const [, url, , username, password] = args // [ method, url, async, username, password ]

		const responseUrl = new URL(url)

		if (username) {
			responseUrl.username = username
		}
		if (password) {
			responseUrl.password = password
		}

		this.responseURL = responseUrl.toString()
		this.readyState = XMLHttpRequest.OPENED
	})

	public send = vi.fn(async () => {
		if (this.readyState !== XMLHttpRequest.OPENED) {
			this.readyState = XMLHttpRequest.UNSENT
			throw new DOMException(
				"Failed to execute 'send' on 'XMLHttpRequest': The object's state must be OPENED.",
				'InvalidStateError',
			)
		}

		this.dispatchEvent(new ProgressEvent('loadstart'))

		// // simulate server response timings
		// await new Promise(resolve => {
		// 	setTimeout(resolve, 1000)
		// 	vi.advanceTimersToNextTimer()
		// })
		this.readyState = XMLHttpRequest.HEADERS_RECEIVED
		this.dispatchEvent(new Event('readystatechange'))

		// // simulate server response timings
		// await new Promise(resolve => {
		// 	setTimeout(resolve, 1000)
		// 	vi.advanceTimersToNextTimer()
		// })
		this.readyState = XMLHttpRequest.LOADING
		this.dispatchEvent(new Event('readystatechange'))

		// // simulate server response timings
		// await new Promise(resolve => {
		// 	setTimeout(resolve, 1000)
		// 	vi.advanceTimersToNextTimer()
		// })
		this.readyState = XMLHttpRequest.DONE
		this.dispatchEvent(new Event('readystatechange'))

		this.dispatchEvent(new ProgressEvent('load'))
		this.dispatchEvent(new ProgressEvent('loadend'))

		this.readyState = XMLHttpRequest.UNSENT
	})

	public abort = vi.fn(() => {
		this.status = 0
		this.readyState = XMLHttpRequest.UNSENT
		this.dispatchEvent(new ProgressEvent('abort'))
	})

	public addEventListener = vi.fn((...args: [event: string, fn: () => void]) => {
		this.on(...args)
	})

	public removeEventListener = vi.fn((...args: [event: string, fn: () => void]) => {
		this.off(...args)
	})

	public dispatchEvent = vi.fn((event: Event | ProgressEvent<XMLHttpRequestEventTarget>) => {
		this.emit(event.type, event)
	})

	public error = vi.fn()
	public getResponseHeader = vi.fn()
	public getAllResponseHeaders = vi.fn()
	public onreadystatechange = vi.fn()
	public progress = vi.fn()
	public response = vi.fn()
	public responseText = vi.fn()
	public responseType = vi.fn()
	public responseXML = vi.fn()
	public setRequestHeader = vi.fn()
	public statusText = vi.fn()
	public timeout = vi.fn()
	public upload = vi.fn()
	public withCredentials = vi.fn()
}
