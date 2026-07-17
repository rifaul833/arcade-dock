'use strict';
const OFFLINE_DATA_FILE = "offline.json";
const CACHE_NAME_PREFIX = "c3offline";
const BROADCASTCHANNEL_NAME = "offline";
const consoleAndBroadcast = self.BroadcastChannel ? new BroadcastChannel(BROADCASTCHANNEL_NAME) : null;

function PostBroadcastMessage(o) {
	if (!consoleAndBroadcast) return;
	consoleAndBroadcast.postMessage(o);
}

async function GetCacheStorageName() {
	const offlineDataResponse = await fetch(OFFLINE_DATA_FILE);
	const offlineData = await offlineDataResponse.json();
	return CACHE_NAME_PREFIX + "-" + offlineData.version;
}

async function PopulateCache() {
	const cacheName = await GetCacheStorageName();
	const cache = await caches.open(cacheName);
	const offlineDataResponse = await fetch(OFFLINE_DATA_FILE);
	const offlineData = await offlineDataResponse.json();
	await cache.addAll([OFFLINE_DATA_FILE, "./", ...offlineData.fileList]);
}

self.addEventListener("install", event => {
	event.waitUntil(PopulateCache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
	event.waitUntil((async () => {
		const cacheName = await GetCacheStorageName();
		const keys = await caches.keys();
		await Promise.all(keys.map(k => (k.startsWith(CACHE_NAME_PREFIX) && k !== cacheName) ? caches.delete(k) : null));
		await self.clients.claim();
	})());
});

self.addEventListener("fetch", event => {
	if (event.request.method !== "GET") return;
	event.respondWith((async () => {
		try {
			const response = await fetch(event.request);
			return response;
		} catch (err) {
			const cache = await caches.open(await GetCacheStorageName());
			const cached = await cache.match(event.request);
			if (cached) return cached;
			throw err;
		}
	})());
});
