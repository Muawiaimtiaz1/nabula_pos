if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker Registered!', reg.scope))
            .catch(err => console.log('Service Worker Registration Failed:', err));
    });
}
