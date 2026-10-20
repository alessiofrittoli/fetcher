import { EventEmitter } from '@alessiofrittoli/event-emitter'
import { ExceptionName } from '@alessiofrittoli/exception'
import type { XHR } from '@/types'
import { vi } from 'vitest'

type OriginalXMLHttpRequest = globalThis.XMLHttpRequest

export class XMLHttpRequest extends EventEmitter {
	public method: XHR.Method
	public readyState: number
	public responseURL: string
	public status: number
	public timeout: number | undefined
	public withCredentials: boolean | undefined

	private isAborted: boolean
	private locked: boolean

	public static readonly UNSENT = 0
	public static readonly OPENED = 1
	public static readonly HEADERS_RECEIVED = 2
	public static readonly LOADING = 3
	public static readonly DONE = 4

	public constructor() {
		super()

		this.method = 'GET'
		this.readyState = XMLHttpRequest.UNSENT
		this.responseURL = ''
		this.status = 200
		this.isAborted = false
		this.locked = false
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
		this.locked = !this.locked
	})

	public send = vi.fn(() => {
		if (!this.locked || this.readyState !== XMLHttpRequest.OPENED) {
			this.readyState = XMLHttpRequest.UNSENT
			throw new DOMException(
				"Failed to execute 'send' on 'XMLHttpRequest': The object's state must be OPENED.",
				ExceptionName.InvalidStateError,
			)
		}

		this.locked = false

		this.dispatchEvent(new ProgressEvent('loadstart'))

		const step1 = new Promise(resolve => setTimeout(resolve, 1000))
		const step2 = new Promise(resolve => setTimeout(resolve, 1000))
		const step3 = new Promise(resolve => setTimeout(resolve, 1000))

		const emitEvents = async (): Promise<void> => {
			// simulate server response timings
			await step1

			if (!this.isAborted) {
				this.readyState = XMLHttpRequest.HEADERS_RECEIVED
				this.dispatchEvent(new Event('readystatechange'))
				// simulate server response timings
				await step2
			}

			if (!this.isAborted) {
				this.readyState = XMLHttpRequest.LOADING
				this.dispatchEvent(new Event('readystatechange'))
				// simulate server response timings
				await step3
			}

			this.readyState = XMLHttpRequest.DONE
			this.dispatchEvent(new Event('readystatechange'))

			if (!this.isAborted) {
				this.dispatchEvent(new ProgressEvent('load'))
			}

			if (this.isAborted) {
				this.dispatchEvent(new ProgressEvent('abort'))
			}

			this.dispatchEvent(new ProgressEvent('loadend'))

			this.readyState = XMLHttpRequest.UNSENT
		}

		emitEvents()
	})

	public abort = vi.fn(() => {
		this.status = 0
		this.isAborted = true
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
	public upload = vi.fn()
}
