document.documentElement.dataset.supported = ("patchAll" in document) && ("routeMap" in document);

const worker = new Worker("/worker.js", {type: "module"});
/**
 *
 * @param {Request} request
 */
async function patch_navigation(url) {
    const transform = new TransformStream();
    worker.postMessage({request: {
        url
    }, stream: transform.writable}, [transform.writable]);
    await transform.readable.pipeTo(document.patchAll());
}

await new Promise(resolve => worker.addEventListener("message", () => {
    resolve();
}));

patch_navigation(location.href);


window.navigation.addEventListener("navigate", e => {
    const {promise, resolve} = Promise.withResolvers();
    document.startViewTransition(() => promise);
    if (e.canIntercept) {
        e.intercept({
            async handler() {
                await patch_navigation(e.destination.url);
                resolve();
            }
        })
    }
});