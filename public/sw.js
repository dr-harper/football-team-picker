const SW_VERSION = '1.0.0';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    if (!event.data) return;

    let payload;
    try {
        payload = event.data.json();
    } catch {
        payload = { title: 'Team Shuffle', body: event.data.text() };
    }

    const { title = 'Team Shuffle', body = '', url = '/', icon = '/logo.png' } = payload;

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon,
            badge: '/logo.png',
            data: { url },
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // Focus an existing tab if one is open
            for (const client of clients) {
                if (new URL(client.url).origin === self.location.origin) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Otherwise open a new window
            return self.clients.openWindow(url);
        })
    );
});
