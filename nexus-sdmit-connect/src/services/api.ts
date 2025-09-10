const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null

async function request<T>(method: string, path: string, body?: Json): Promise<T> {
	const response = await fetch(`${BASE_URL}${path}`, {
		method,
		headers: {
			'Content-Type': 'application/json',
		},
		body: body !== undefined ? JSON.stringify(body) : undefined,
	})

	if (!response.ok) {
		let message: string | undefined
		try {
			const data = await response.json()
			message = (data as any)?.message || response.statusText
		} catch {
			message = response.statusText
		}
		const error: any = new Error(message)
		// Shape error similar to axios for existing handlers
		error.response = { data: { message } }
		throw error
	}

	try {
		return (await response.json()) as T
	} catch {
		// No content
		return undefined as unknown as T
	}
}

const api = {
	get: <T = unknown>(path: string) => request<T>('GET', path),
	post: <T = unknown>(path: string, body?: Json) => request<T>('POST', path, body),
	put: <T = unknown>(path: string, body?: Json) => request<T>('PUT', path, body),
	patch: <T = unknown>(path: string, body?: Json) => request<T>('PATCH', path, body),
	delete: <T = unknown>(path: string) => request<T>('DELETE', path),
}

export default api


