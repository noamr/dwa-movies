document.documentElement.dataset.supported = ("streamAppendHTMLUnsafe" in document.body);

const worker = new Worker("/worker.js", { type: "module" });
async function patch_navigation(url) {
    const { readable, writable } = new TransformStream();
    worker.postMessage({ url, stream: writable }, [writable]);
    await readable.pipeTo(document.body.streamAppendHTMLUnsafe());
}

worker.addEventListener("message", async () => {
    await patch_navigation(location.href);

    document.addEventListener("scrollsnapchange", e => {
        e.snapTargetInline.querySelector(".snap-to-activate")?.click();
    }, { capture: true });

    window.navigation.addEventListener("navigate", e => {
        if (e.canIntercept) {
            e.intercept({
                async handler() {
                    await new Promise(resolve => requestAnimationFrame(resolve));
                    const { promise, resolve } = Promise.withResolvers();
                    return document.startViewTransition({
                        async update() {
                            resolve();
                            await patch_navigation(e.destination.url)
                        },

                        types: [e.sourceElement?.classList?.contains("snap-to-activate") ? "instant" : "default"]
                    }).finished;
                }
            })
        }
    });
}, { once: true });

